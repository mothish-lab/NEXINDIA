const { classifyImage, generateImageEmbedding, calculateCosineSimilarity } = require('../services/aiService');

/**
 * POST /api/ai/classify — Classify an image
 */
async function classify(req, res, next) {
  try {
    const { context } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;
    const result = await classifyImage(imageBuffer, context || '');
    const embedding = await generateImageEmbedding(imageBuffer, context || '');

    res.json({
      success: true,
      classification: result,
      embeddingDimensions: embedding.length,
      demoMode: process.env.AI_DEMO_MODE === 'true',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/similarity — Compare two embeddings
 */
async function similarity(req, res, next) {
  try {
    const { embeddingA, embeddingB } = req.body;
    if (!embeddingA || !embeddingB) {
      return res.status(400).json({ success: false, message: 'embeddingA and embeddingB required' });
    }
    const score = calculateCosineSimilarity(embeddingA, embeddingB);
    res.json({ success: true, similarityScore: score });
  } catch (err) {
    next(err);
  }
}

module.exports = { classify, similarity };
