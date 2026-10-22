import JSZip from 'jszip';
import { Book, Chapter } from '../types/book.types';

function resolvePath(base: string, relative: string): string {
    const stack = base.split('/').filter(Boolean);
    stack.pop(); // Remove the filename to get directory
    const parts = relative.split('/');

    for (const part of parts) {
        if (part === '.' || part === '') continue;
        if (part === '..') {
            stack.pop();
        } else {
            stack.push(part);
        }
    }
    return stack.join('/');
}

function cleanHtmlToText(html: string): { title: string; content: string } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove script, style, svg, nav elements
    const elementsToRemove = doc.querySelectorAll('script, style, svg, nav, header, footer');
    elementsToRemove.forEach(el => el.remove());

    // Extract title from heading or doc title
    const headingEl = doc.querySelector('h1, h2, h3, title');
    const title = headingEl?.textContent?.trim() || '';

    // Collect all paragraphs or text blocks
    const blockElements = doc.querySelectorAll('p, div, blockquote, h1, h2, h3, h4, h5, h6, li');
    const paragraphs: string[] = [];

    if (blockElements.length > 0) {
        blockElements.forEach(el => {
            // Avoid duplicate text from parent-child block containers
            if (el.tagName.toLowerCase() === 'div' && el.querySelector('p')) {
                return;
            }
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
                paragraphs.push(text);
            }
        });
    } else {
        const bodyText = doc.body.textContent?.trim() || '';
        if (bodyText) {
            paragraphs.push(bodyText);
        }
    }

    return {
        title,
        content: paragraphs.join('\n\n')
    };
}

export async function parseEpubFile(file: File | Blob, filename: string): Promise<Book> {
    const zip = await JSZip.loadAsync(file);

    // 1. Read META-INF/container.xml to find the rootfile (OPF)
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
        throw new Error('Invalid EPUB: META-INF/container.xml not found.');
    }

    const containerXml = await containerFile.async('text');
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfileEl = containerDoc.querySelector('rootfile');
    const opfPath = rootfileEl?.getAttribute('full-path');

    if (!opfPath) {
        throw new Error('Invalid EPUB: rootfile not specified in container.xml.');
    }

    // 2. Read OPF file
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
        throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}.`);
    }

    const opfXml = await opfFile.async('text');
    const opfDoc = parser.parseFromString(opfXml, 'application/xml');

    // Extract metadata
    const title = opfDoc.querySelector('title')?.textContent?.trim() ||
                  filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const author = opfDoc.querySelector('creator')?.textContent?.trim() || 'Unknown Author';
    const description = opfDoc.querySelector('description')?.textContent?.trim() || '';

    // Extract manifest items: id -> href
    const manifestItems: Record<string, string> = {};
    const itemElements = opfDoc.querySelectorAll('manifest > item');
    itemElements.forEach(item => {
        const id = item.getAttribute('id');
        const href = item.getAttribute('href');
        if (id && href) {
            manifestItems[id] = href;
        }
    });

    // Extract spine items: ordered list of idref
    const spineElements = opfDoc.querySelectorAll('spine > itemref');
    const chapters: Chapter[] = [];
    let chapterIndex = 1;

    for (let i = 0; i < spineElements.length; i++) {
        const idref = spineElements[i].getAttribute('idref');
        if (!idref || !manifestItems[idref]) continue;

        const relativeHref = manifestItems[idref];
        const fullHref = resolvePath(opfPath, relativeHref);

        // Try getting file with full resolved path or fallback to finding by name
        let chapterFile = zip.file(fullHref);
        if (!chapterFile) {
            // Find by filename match if path discrepancy
            const justName = relativeHref.split('/').pop();
            const matchedFile = zip.file(new RegExp(`(^|/)${justName}$`))[0];
            if (matchedFile) chapterFile = matchedFile;
        }

        if (chapterFile) {
            const htmlContent = await chapterFile.async('text');
            const { title: extractedTitle, content } = cleanHtmlToText(htmlContent);

            const wordCount = content.split(/\s+/).filter(Boolean).length;
            // Filter out empty cover pages or short front-matter
            if (wordCount >= 20) {
                chapters.push({
                    id: `ch-${chapterIndex}`,
                    title: extractedTitle || `Chapter ${chapterIndex}`,
                    content,
                    wordCount
                });
                chapterIndex++;
            }
        }
    }

    // Fallback if no chapters found via spine
    if (chapters.length === 0) {
        // Collect all xhtml / html files
        const htmlFiles = zip.file(/\.(xhtml|html|htm)$/i);
        for (let i = 0; i < htmlFiles.length; i++) {
            const htmlFile = htmlFiles[i];
            const content = await htmlFile.async('text');
            const { title: extractedTitle, content: cleanedText } = cleanHtmlToText(content);
            const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
            if (wordCount >= 20) {
                chapters.push({
                    id: `ch-${i + 1}`,
                    title: extractedTitle || `Chapter ${i + 1}`,
                    content: cleanedText,
                    wordCount
                });
            }
        }
    }

    if (chapters.length === 0) {
        throw new Error('Could not extract readable text content from EPUB.');
    }

    const totalWords = chapters.reduce((acc, ch) => acc + ch.wordCount, 0);
    const estimatedMinutes = Math.max(1, Math.round(totalWords / 180));

    return {
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        author,
        level: 'B1',
        description: description || `Uploaded EPUB book with ${chapters.length} chapter(s).`,
        coverGradient: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
        accentColor: '#6366f1',
        totalWords,
        estimatedMinutes,
        isCustom: true,
        uploadedAt: new Date().toISOString(),
        chapters
    };
}
