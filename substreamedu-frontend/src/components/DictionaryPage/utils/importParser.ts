export interface ParsedImportItem {
    word: string;
    translation?: string;
    definition?: string;
    context?: string;
    note?: string;
}

export interface ParseImportResult {
    items: ParsedImportItem[];
    truncatedCount: number;
}

export const MAX_IMPORT_BATCH = 200;

const HEADER_FIRST_CELLS = new Set(['word', 'term', 'vocabulary', 'phrase', 'english']);
const HEADER_SECOND_CELLS = new Set(['translation', 'meaning', 'definition', 'russian']);

const splitCsvLine = (line: string, delimiter: string): string[] => {
    if (delimiter !== ',') {
        return line.split(delimiter).map((part) => part.trim());
    }
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    cells.push(current.trim());
    return cells;
};

const parseSingleLine = (rawLine: string): ParsedImportItem | null => {
    const line = rawLine.trim();
    if (!line) return null;

    let parts: string[] = [];
    if (line.includes('\t')) {
        parts = splitCsvLine(line, '\t');
    } else if (line.includes(';')) {
        parts = splitCsvLine(line, ';');
    } else if (line.includes(',')) {
        parts = splitCsvLine(line, ',');
    } else if (/\s[-–—]\s/.test(line)) {
        parts = line.split(/\s[-–—]\s/).map((p) => p.trim());
    } else {
        parts = [line];
    }

    const word = (parts[0] || '').trim();
    if (!word) return null;

    return {
        word,
        translation: parts[1] ? parts[1].trim() : undefined,
        definition: parts[2] ? parts[2].trim() : undefined,
        context: parts[3] ? parts[3].trim() : undefined,
        note: parts[4] ? parts[4].trim() : undefined,
    };
};

/**
 * Parses CSV, TSV, semicolon, dash-separated, or plain one-word-per-line text
 * into deduplicated import items capped at MAX_IMPORT_BATCH (200).
 */
export const parseImportText = (rawText: string): ParseImportResult => {
    if (!rawText || !rawText.trim()) {
        return { items: [], truncatedCount: 0 };
    }

    const lines = rawText.split(/\r?\n/);
    const seen = new Set<string>();
    const parsed: ParsedImportItem[] = [];

    for (let i = 0; i < lines.length; i++) {
        const item = parseSingleLine(lines[i]);
        if (!item) continue;

        if (
            i === 0 &&
            HEADER_FIRST_CELLS.has(item.word.toLowerCase()) &&
            (!item.translation || HEADER_SECOND_CELLS.has(item.translation.toLowerCase()))
        ) {
            continue;
        }

        const key = item.word.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        parsed.push(item);
    }

    if (parsed.length > MAX_IMPORT_BATCH) {
        return {
            items: parsed.slice(0, MAX_IMPORT_BATCH),
            truncatedCount: parsed.length - MAX_IMPORT_BATCH,
        };
    }

    return { items: parsed, truncatedCount: 0 };
};
