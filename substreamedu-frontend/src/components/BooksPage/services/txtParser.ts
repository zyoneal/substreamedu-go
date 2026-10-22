import { Book, Chapter } from '../types/book.types';

export function parsePlainText(content: string, filename: string): Book {
    const cleanFilename = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    // Try detecting chapter headings: Chapter 1, CHAPTER I, etc.
    const chapterHeaderRegex = /(?:^|\n)(?:(?:Chapter|CHAPTER|Part|PART|Section|SECTION)\s+(?:\d+|[IVXLCDM]+)[^\n]*)/g;
    const matches = Array.from(normalizedContent.matchAll(chapterHeaderRegex));

    const chapters: Chapter[] = [];

    if (matches.length >= 2) {
        for (let i = 0; i < matches.length; i++) {
            const currentMatch = matches[i];
            const startIndex = currentMatch.index ?? 0;
            const nextMatch = matches[i + 1];
            const endIndex = nextMatch ? (nextMatch.index ?? normalizedContent.length) : normalizedContent.length;

            const sectionText = normalizedContent.substring(startIndex, endIndex).trim();
            const firstLineEnd = sectionText.indexOf('\n');
            const title = firstLineEnd > 0 ? sectionText.substring(0, firstLineEnd).trim() : `Chapter ${i + 1}`;
            const body = firstLineEnd > 0 ? sectionText.substring(firstLineEnd).trim() : sectionText;

            const wordCount = body.split(/\s+/).filter(Boolean).length;
            if (wordCount > 0) {
                chapters.push({
                    id: `ch-${i + 1}`,
                    title: title.length > 80 ? title.substring(0, 80) + '...' : title,
                    content: body,
                    wordCount
                });
            }
        }
    }

    // Fallback: If no explicit chapters detected or only 1 match, chunk by word count (~1,500 words)
    if (chapters.length === 0) {
        const paragraphs = normalizedContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        let currentChunk: string[] = [];
        let currentWords = 0;
        let chapterIndex = 1;

        for (const para of paragraphs) {
            const paraWords = para.split(/\s+/).filter(Boolean).length;
            if (currentWords + paraWords > 1800 && currentChunk.length > 0) {
                const body = currentChunk.join('\n\n');
                chapters.push({
                    id: `ch-${chapterIndex}`,
                    title: `Part ${chapterIndex}`,
                    content: body,
                    wordCount: currentWords
                });
                chapterIndex++;
                currentChunk = [para];
                currentWords = paraWords;
            } else {
                currentChunk.push(para);
                currentWords += paraWords;
            }
        }

        if (currentChunk.length > 0) {
            const body = currentChunk.join('\n\n');
            chapters.push({
                id: `ch-${chapterIndex}`,
                title: `Part ${chapterIndex}`,
                content: body,
                wordCount: currentWords
            });
        }
    }

    const totalWords = chapters.reduce((acc, ch) => acc + ch.wordCount, 0);
    // Average reading speed for learners is ~180 words per minute
    const estimatedMinutes = Math.max(1, Math.round(totalWords / 180));

    return {
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: cleanFilename || 'Untitled Book',
        author: 'Custom Upload',
        level: 'B1',
        description: `Imported text document with ${chapters.length} chapter(s) and ${totalWords.toLocaleString()} words.`,
        coverGradient: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
        accentColor: '#3b82f6',
        totalWords,
        estimatedMinutes,
        isCustom: true,
        uploadedAt: new Date().toISOString(),
        chapters
    };
}
