/**
 * Document Similarity Utility
 * Uses TF-IDF + Cosine Similarity for duplicate detection
 * Pure JavaScript implementation - no external dependencies
 */

/**
 * Compute TF-IDF vector for document
 * Returns normalized term frequency map
 * 
 * @param {string} text - Document text to analyze
 * @returns {Object} Term frequency map (term -> normalized frequency)
 */
function computeTfIdf(text) {
  if (!text || typeof text !== 'string') {
    return {};
  }

  // Normalize and tokenize
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(t => t.length > 3); // Remove short words (stop words like "the", "and")
  
  if (tokens.length === 0) {
    return {};
  }

  // Count term frequencies
  const termFreq = {};
  tokens.forEach(token => {
    termFreq[token] = (termFreq[token] || 0) + 1;
  });
  
  // Normalize by max frequency (TF normalization)
  const maxFreq = Math.max(...Object.values(termFreq));
  Object.keys(termFreq).forEach(term => {
    termFreq[term] = termFreq[term] / maxFreq;
  });
  
  return termFreq;
}

/**
 * Calculate cosine similarity between two TF-IDF vectors
 * Returns value between 0 (completely different) and 1 (identical)
 * 
 * Threshold guide:
 * - >= 0.95: Almost identical (typo fixes only)
 * - >= 0.90: Very similar (minor edits, version updates)
 * - >= 0.85: Similar (section changes, reordering)
 * - < 0.85: Different documents
 * 
 * @param {Object} vec1 - First TF-IDF vector
 * @param {Object} vec2 - Second TF-IDF vector
 * @returns {number} Similarity score (0.0 to 1.0)
 */
function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || typeof vec1 !== 'object' || typeof vec2 !== 'object') {
    return 0;
  }

  // Get all unique terms from both vectors
  const allTerms = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  
  if (allTerms.size === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  // Calculate dot product and magnitudes
  allTerms.forEach(term => {
    const v1 = vec1[term] || 0;
    const v2 = vec2[term] || 0;
    dotProduct += v1 * v2;
    magnitude1 += v1 * v1;
    magnitude2 += v2 * v2;
  });
  
  // Handle edge cases
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  // Cosine similarity formula: dot_product / (||A|| * ||B||)
  const similarity = dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  
  // Clamp to [0, 1] range (floating point errors might cause slight overflow)
  return Math.max(0, Math.min(1, similarity));
}

export { computeTfIdf, cosineSimilarity };

