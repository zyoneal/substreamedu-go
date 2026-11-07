import { serializeToJsonl, parseFromJsonl } from './jsonl';

describe('JSONL Utilities', () => {
  interface SampleRecord {
    id: number;
    text: string;
  }

  const sampleData: SampleRecord[] = [
    { id: 1, text: 'First line' },
    { id: 2, text: 'Second line' },
    { id: 3, text: 'Third line' },
  ];

  it('serializes array into newline-separated JSON objects', () => {
    const jsonl = serializeToJsonl(sampleData);
    const lines = jsonl.split('\n');
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0])).toEqual({ id: 1, text: 'First line' });
    expect(JSON.parse(lines[1])).toEqual({ id: 2, text: 'Second line' });
  });

  it('parses JSONL format back into typed array', () => {
    const jsonl = `{"id":1,"text":"First line"}\n{"id":2,"text":"Second line"}`;
    const parsed = parseFromJsonl<SampleRecord>(jsonl);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].text).toBe('First line');
    expect(parsed[1].id).toBe(2);
  });

  it('ignores empty lines and trailing newlines', () => {
    const jsonl = `\n{"id":1,"text":"First line"}\n\n{"id":2,"text":"Second line"}\n`;
    const parsed = parseFromJsonl<SampleRecord>(jsonl);
    expect(parsed).toHaveLength(2);
  });

  it('throws descriptive error on malformed JSON with line number', () => {
    const malformed = `{"id":1,"text":"Valid"}\n{invalid_json}\n{"id":2,"text":"Also valid"}`;
    expect(() => parseFromJsonl(malformed)).toThrow(/malformed JSON on line 2/);
  });
});
