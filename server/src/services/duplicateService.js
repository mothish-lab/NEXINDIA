/**
 * Duplicate Detection Service
 *
 * Multi-signal duplicate detection combining:
 *   40% geographic similarity
 *   35% image similarity (cosine similarity of embeddings)
 *   15% category similarity
 *   10% time proximity
 *
 * Threshold: DUPLICATE_THRESHOLD env var (default 0.75)
 * Search radius: DUPLICATE_RADIUS_METERS env var (default 100m)
 */

const Issue = require('../models/Issue');
const { calculateCosineSimilarity } = require('./aiService');

const DUPLICATE_THRESHOLD = parseFloat(process.env.DUPLICATE_THRESHOLD) || 0.75;
const DUPLICATE_RADIUS_METERS = parseFloat(process.env.DUPLICATE_RADIUS_METERS) || 100;

// Earth radius in meters
const EARTH_RADIUS_M = 6371000;

/**
 * Haversine distance between two GPS points, in meters.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Compute geographic similarity score (0–1).
 * Score = 1 when distance = 0, score = 0 when distance >= radius.
 */
function geoSimilarityScore(dist, radius = DUPLICATE_RADIUS_METERS) {
  if (dist >= radius) return 0;
  return 1 - dist / radius;
}

/**
 * Compute time proximity score (0–1).
 * Score = 1 within 1 hour, decreases to 0 at 7 days.
 */
function timeSimilarityScore(dateA, dateB) {
  const diffMs = Math.abs(new Date(dateA) - new Date(dateB));
  const diffHours = diffMs / (1000 * 60 * 60);
  const MAX_HOURS = 7 * 24; // 7 days
  if (diffHours >= MAX_HOURS) return 0;
  return 1 - diffHours / MAX_HOURS;
}

/**
 * Category similarity: 1.0 if same, 0.3 if different (could be same issue, different category guess).
 */
function categorySimilarityScore(catA, catB) {
  return catA === catB ? 1.0 : 0.3;
}

/**
 * Find existing issues that might be duplicates of a new report.
 *
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} params.category
 * @param {number[]} params.embedding - Image embedding vector
 * @param {Date} params.createdAt
 * @returns {Promise<{ isDuplicate: boolean, masterIssue: object|null, score: number, breakdown: object }>}
 */
async function findDuplicateIssue({ latitude, longitude, category, embedding, createdAt = new Date() }) {
  // Search for open master issues within an extended bounding box
  // (3x radius to catch edge cases, then filter precisely by haversine)
  const latDelta = (DUPLICATE_RADIUS_METERS * 3) / 111320;
  const lonDelta = (DUPLICATE_RADIUS_METERS * 3) / (111320 * Math.cos((latitude * Math.PI) / 180));

  const nearbyIssues = await Issue.find({
    isMaster: true,
    status: { $nin: ['RESOLVED', 'CLOSED'] },
    latitude: { $gte: latitude - latDelta, $lte: latitude + latDelta },
    longitude: { $gte: longitude - lonDelta, $lte: longitude + lonDelta },
  })
    .select('+imageEmbedding')
    .lean();

  let bestMatch = null;
  let bestScore = 0;
  let bestBreakdown = {};

  for (const issue of nearbyIssues) {
    // Geographic score
    const dist = haversineDistance(latitude, longitude, issue.latitude, issue.longitude);
    const geoScore = geoSimilarityScore(dist, DUPLICATE_RADIUS_METERS);

    // Image similarity score
    let imageScore = 0;
    if (embedding && embedding.length > 0 && issue.imageEmbedding && issue.imageEmbedding.length > 0) {
      imageScore = calculateCosineSimilarity(embedding, issue.imageEmbedding);
    } else {
      // No embedding comparison possible — neutral score
      imageScore = 0.5;
    }

    // Category score
    const catScore = categorySimilarityScore(category, issue.category);

    // Time score
    const tScore = timeSimilarityScore(createdAt, issue.createdAt);

    // Weighted composite score
    const compositeScore =
      0.40 * geoScore +
      0.35 * imageScore +
      0.15 * catScore +
      0.10 * tScore;

    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestMatch = issue;
      bestBreakdown = {
        distance: Math.round(dist),
        geoScore: Math.round(geoScore * 100) / 100,
        imageScore: Math.round(imageScore * 100) / 100,
        categoryScore: catScore,
        timeScore: Math.round(tScore * 100) / 100,
        compositeScore: Math.round(compositeScore * 100) / 100,
      };
    }
  }

  if (bestScore >= DUPLICATE_THRESHOLD && bestMatch) {
    return {
      isDuplicate: true,
      masterIssue: bestMatch,
      score: bestScore,
      breakdown: bestBreakdown,
    };
  }

  return {
    isDuplicate: false,
    masterIssue: null,
    score: bestScore,
    breakdown: bestBreakdown,
  };
}

module.exports = { findDuplicateIssue, haversineDistance, DUPLICATE_THRESHOLD, DUPLICATE_RADIUS_METERS };
