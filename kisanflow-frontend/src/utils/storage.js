export const safeJsonParse = (str, fallback = null) => {
  if (!str || str === 'undefined' || str === 'null') return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('Failed to parse JSON from storage:', e);
    return fallback;
  }
};
