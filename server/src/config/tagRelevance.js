const TAG_MINIMUM_RATINGS = {
  'dp':                     1200,
  'divide and conquer':     1000,
  'graphs':                 1200,
  'dfs and similar':        1200,
  'shortest paths':         1300,
  'trees':                  1200,
  'dsu':                    1400,
  'binary search':          1100,
  'two pointers':           1100,
  'bitmasks':               1300,
  'combinatorics':          800,
  'number theory':          900,
  'probabilities':          1200,
  'fft':                    1900,
  'flows':                  1800,
  'matrices':               1600,
  'geometry':               1500,
  'string suffix structures': 1700,
  'hashing':                1300,
  'interactive':            1400,
  'ternary search':         1500,
  'meet-in-the-middle':     1300,
  '2-sat':                  1700,
  'chinese remainder theorem': 1700,
  'expression parsing':     1600,
  'games':                  1300,
  'schedules':              1300,
  'implementation':         0,
  'brute force':            0,
  'math':                   0,
  'greedy':                 0,
  'sortings':               0,
  'constructive algorithms': 0,
  'strings':                800,
  'data structures':        800,
  '*special':               0,
};
const DEFAULT_MIN_RATING = 1200;
function getEffectiveTags(rawTags, problemRating) {
  if (!rawTags || rawTags.length === 0) return [];
  if (!problemRating) return rawTags;

  if (problemRating >= 1600) return rawTags;

  const effective = rawTags.filter(tag => {
    const minRating = TAG_MINIMUM_RATINGS[tag];
    if (minRating === undefined) return problemRating >= DEFAULT_MIN_RATING;
    return problemRating >= minRating;
  });
  if (effective.length === 0) return rawTags;
  return effective;
}

function isTagRelevant(tag, problemRating) {
  if (!problemRating) return true;
  if (problemRating >= 1600) return true;
  const minRating = TAG_MINIMUM_RATINGS[tag] ?? DEFAULT_MIN_RATING;
  return problemRating >= minRating;
}
module.exports = { getEffectiveTags, isTagRelevant, TAG_MINIMUM_RATINGS };
