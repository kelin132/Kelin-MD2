export function participantActionSucceeded(results, expectedCount) {
  return Number.isInteger(expectedCount)
    && expectedCount > 0
    && Array.isArray(results)
    && results.length === expectedCount
    && results.every((result) => String(result?.status) === "200");
}
