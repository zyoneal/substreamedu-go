/**
 * Subtitle text sanitization utilities.
 * Cleans raw ASS/SSA markup, override tags, escaped newlines, and HTML/VTT tags
 * while preserving dialogue dashes and natural paragraph structure.
 */

/**
 * Sanitizes subtitle text by:
 * 1. Stripping ASS/SSA style override tags and comments (e.g. {\i1}, {\b1}, {\pos(x,y)}, {\c&H...&})
 * 2. Stripping HTML and WebVTT markup tags (e.g. <i>, <b>, <font ...>, <c.yellow>)
 * 3. Converting ASS hard spaces (\h) to regular spaces
 * 4. Converting ASS hard and soft line breaks (\N, \n) into standard newlines (\n)
 * 5. Decoding common HTML entities (&quot;, &#39;, &amp;, &nbsp;, etc.)
 * 6. Stripping zero-width directional marks (&lrm;, &rlm;)
 * 7. Normalizing whitespace while preserving intentional dialogue line breaks
 */
export function cleanSubtitleText(text: string | null | undefined): string {
    if (!text) return '';

    return text
        // 1. Strip ASS/SSA style override tags and comments: {...}
        .replace(/\{[^}]*\}/g, '')
        // 2. Strip HTML / WebVTT markup tags: <...>
        .replace(/<\/?[a-zA-Z][^>]*>/g, '')
        .replace(/<\d{2}:\d{2}[:.]\d{2}[^>]*>/g, '')
        // 3. Replace ASS hard spaces \h with a regular space
        .replace(/\\h/g, ' ')
        // 4. Replace ASS hard and soft line breaks (\N, \n) with real newline \n
        .replace(/\\[Nn]/g, '\n')
        // 5. Clean zero-width directional marks (&lrm;, &rlm;)
        .replace(/&lrm;|&rlm;/gi, '')
        // 6. Decode common HTML entities
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;|&#x27;|&#039;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        // 7. Normalize CRLF / CR to LF
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // 8. Collapse duplicate horizontal spaces/tabs on each line
        .replace(/[ \t]{2,}/g, ' ')
        // 9. Trim each line while preserving dialogue lines
        .split('\n')
        .map(line => line.trim())
        .filter((line, idx, arr) => line.length > 0 || (idx > 0 && idx < arr.length - 1))
        .join('\n')
        .trim();
}

/**
 * Sanitizes and collapses subtitle text into a single-line string with normalized spacing.
 * Ideal for word selection context, search queries, and AI translation prompts.
 */
export function cleanSubtitleSelection(text: string | null | undefined): string {
    if (!text) return '';
    return cleanSubtitleText(text).replace(/\s+/g, ' ').trim();
}
