/**
 * AI Service — Provider-Independent Image Classification & Analysis.
 *
 * Supports:
 *  - Google Gemini API (AI_PROVIDER=gemini)
 *  - OpenAI Vision API (AI_PROVIDER=openai)
 *  - Deterministic Keyword / Demo Classifier (AI_DEMO_MODE=true or when API key is missing)
 *
 * Never crashes when offline or when keys are absent.
 */

const https = require('https');

const DEMO_MODE = process.env.AI_DEMO_MODE === 'true';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'demo').toLowerCase();
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || (AI_PROVIDER === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');

const VALID_CATEGORIES = ['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER_LEAK', 'WATER_LOGGING', 'ROAD_DAMAGE', 'DRAINAGE', 'OTHER'];

const CATEGORY_BASE_SCORES = {
  POTHOLE: 50,
  GARBAGE: 30,
  STREETLIGHT: 35,
  WATER_LEAK: 60,
  WATER_LOGGING: 55,
  ROAD_DAMAGE: 50,
  DRAINAGE: 45,
  OTHER: 20,
};

const KEYWORD_MAP = [
  { keywords: ['pothole', 'pot hole', 'road hole', 'crater', 'pit', 'cavity'], category: 'POTHOLE', confidence: 0.92 },
  { keywords: ['garbage', 'trash', 'waste', 'litter', 'dump', 'rubbish', 'refuse', 'debris'], category: 'GARBAGE', confidence: 0.89 },
  { keywords: ['streetlight', 'street light', 'lamp', 'pole light', 'lamppost', 'lighting', 'dark pole'], category: 'STREETLIGHT', confidence: 0.85 },
  { keywords: ['water leak', 'pipe leak', 'leakage', 'burst pipe', 'water pipe', 'pipeline'], category: 'WATER_LEAK', confidence: 0.90 },
  { keywords: ['waterlog', 'water logging', 'flood', 'standing water', 'stagnant', 'inundation'], category: 'WATER_LOGGING', confidence: 0.87 },
  { keywords: ['road damage', 'broken road', 'road crack', 'pavement', 'asphalt', 'tarmac'], category: 'ROAD_DAMAGE', confidence: 0.83 },
  { keywords: ['drain', 'drainage', 'sewer', 'blocked drain', 'manhole', 'gutter'], category: 'DRAINAGE', confidence: 0.88 },
];

/**
 * Deterministic keyword classifier.
 */
function keywordClassify(context = '') {
  const lower = context.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return {
        category: entry.category,
        confidence: entry.confidence,
        severity: entry.category === 'DRAINAGE' || entry.category === 'POTHOLE' ? 'HIGH' : 'MEDIUM',
        isCivicIssue: true,
        source: 'keyword_classifier',
      };
    }
  }
  return {
    category: 'OTHER',
    confidence: 0.45,
    severity: 'MEDIUM',
    isCivicIssue: true,
    source: 'keyword_fallback',
  };
}

/**
 * Call Google Gemini Vision API.
 */
async function callGeminiVision(imageBuffer, context) {
  if (!AI_API_KEY) throw new Error('GEMINI API key not configured');

  const base64Image = imageBuffer ? imageBuffer.toString('base64') : '';
  const prompt = `Analyze this civic issue report and image.
Context: "${context}".
Respond ONLY with a JSON object with this exact schema:
{
  "category": "POTHOLE" | "GARBAGE" | "STREETLIGHT" | "WATER_LEAK" | "WATER_LOGGING" | "ROAD_DAMAGE" | "DRAINAGE" | "OTHER",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": number between 0 and 1,
  "isCivicIssue": boolean,
  "description": "short 1-line analysis"
}`;

  const contents = [
    {
      parts: [
        { text: prompt },
        ...(base64Image ? [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }] : []),
      ],
    },
  ];

  const payload = JSON.stringify({ contents, generationConfig: { responseMimeType: 'application/json' } });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(text);

  return {
    category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'OTHER',
    severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.severity) ? parsed.severity : 'MEDIUM',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
    isCivicIssue: parsed.isCivicIssue !== false,
    source: `gemini_${AI_MODEL}`,
  };
}

/**
 * Call OpenAI Vision API.
 */
async function callOpenAIVision(imageBuffer, context) {
  if (!AI_API_KEY) throw new Error('OpenAI API key not configured');

  const base64Image = imageBuffer ? imageBuffer.toString('base64') : '';
  const messages = [
    {
      role: 'system',
      content: 'You are an AI civic infrastructure triage engine. Output JSON only: { "category": "POTHOLE"|"GARBAGE"|"STREETLIGHT"|"WATER_LEAK"|"WATER_LOGGING"|"ROAD_DAMAGE"|"DRAINAGE"|"OTHER", "severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", "confidence": 0.0-1.0, "isCivicIssue": boolean }',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: `Analyze report: ${context}` },
        ...(base64Image ? [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }] : []),
      ],
    },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');

  return {
    category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'OTHER',
    severity: parsed.severity || 'MEDIUM',
    confidence: parsed.confidence || 0.85,
    isCivicIssue: parsed.isCivicIssue !== false,
    source: `openai_${AI_MODEL}`,
  };
}

/**
 * Main classification entry point.
 */
async function classifyImage(imageBuffer, context = '') {
  try {
    if (!DEMO_MODE && AI_API_KEY) {
      if (AI_PROVIDER === 'gemini') {
        return await callGeminiVision(imageBuffer, context);
      }
      if (AI_PROVIDER === 'openai') {
        return await callOpenAIVision(imageBuffer, context);
      }
    }
  } catch (err) {
    console.warn(`[AI Service] ${AI_PROVIDER} classification failed, falling back to keyword engine:`, err.message);
  }

  // Fallback to deterministic keyword engine
  return keywordClassify(context);
}

/**
 * Generate synthetic or real 128-dim embedding.
 */
function generateDemoEmbedding(context = '') {
  const dim = 128;
  const embedding = new Array(dim).fill(0);
  const str = context.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    embedding[i % dim] += charCode;
    embedding[(i * 3 + 7) % dim] += charCode * 0.5;
    embedding[(i * 7 + 13) % dim] -= charCode * 0.3;
  }
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1;
  return embedding.map(v => v / norm);
}

async function generateImageEmbedding(imageBuffer, context = '') {
  return generateDemoEmbedding(context);
}

function calculateCosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const minLen = Math.min(vecA.length, vecB.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < minLen; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

module.exports = {
  classifyImage,
  generateImageEmbedding,
  calculateCosineSimilarity,
  CATEGORY_BASE_SCORES,
};
