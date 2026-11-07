/**
 * Serializes an array of records into Git-friendly, streaming JSON Lines format.
 */
export function serializeToJsonl<T>(items: T[]): string {
  return items.map((item) => JSON.stringify(item)).join('\n');
}

/**
 * Parses a JSON Lines string into an array of typed objects.
 * Throws a descriptive error with line number if any line is malformed.
 */
export function parseFromJsonl<T>(jsonl: string): T[] {
  const items: T[] = [];
  const lines = jsonl.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const trimmed = rawLine.trim();
    if (trimmed === '') continue;

    try {
      items.push(JSON.parse(trimmed) as T);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`parseFromJsonl: malformed JSON on line ${i + 1}: ${message}`);
    }
  }

  return items;
}
