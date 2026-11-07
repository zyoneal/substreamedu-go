import JSZip from 'jszip';
import { parseEpubFile } from './epubParser';

describe('parseEpubFile', () => {
    it('should extract title, author, and chapters from an in-memory epub archive', async () => {
        const zip = new JSZip();

        // 1. Add META-INF/container.xml
        zip.file(
            'META-INF/container.xml',
            `<?xml version="1.0"?>
            <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
                <rootfiles>
                    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
                </rootfiles>
            </container>`
        );

        // 2. Add OEBPS/content.opf
        zip.file(
            'OEBPS/content.opf',
            `<?xml version="1.0" encoding="utf-8"?>
            <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
                <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
                    <dc:title>Test EPUB Book</dc:title>
                    <dc:creator>Arthur Conan Mock</dc:creator>
                </metadata>
                <manifest>
                    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
                </manifest>
                <spine>
                    <itemref idref="ch1"/>
                </spine>
            </package>`
        );

        // 3. Add OEBPS/chapter1.xhtml with > 20 words
        zip.file(
            'OEBPS/chapter1.xhtml',
            `<!DOCTYPE html>
            <html>
                <head><title>Chapter 1: The Detective</title></head>
                <body>
                    <h1>Chapter 1: The Detective</h1>
                    <p>Sherlock examined the footprint in the mud with his magnifying glass. It belonged to an agile visitor who had stepped lightly across the garden terrace during the storm yesterday evening.</p>
                </body>
            </html>`
        );

        const blob = await zip.generateAsync({ type: 'blob' });
        const book = await parseEpubFile(blob, 'test_book.epub');

        expect(book.title).toBe('Test EPUB Book');
        expect(book.author).toBe('Arthur Conan Mock');
        expect(book.isCustom).toBe(true);
        expect(book.chapters.length).toBe(1);
        expect(book.chapters[0].title).toBe('Chapter 1: The Detective');
        expect(book.chapters[0].content).toContain('Sherlock examined the footprint');
    });

    it('should throw an error for invalid zip or missing container.xml', async () => {
        const zip = new JSZip();
        zip.file('dummy.txt', 'hello world');
        const blob = await zip.generateAsync({ type: 'blob' });

        await expect(parseEpubFile(blob, 'invalid.epub')).rejects.toThrow('META-INF/container.xml not found');
    });
});
