import React from 'react';

/**
 * Parses message strings containing `<do>accented text</do>` tags into an array
 * of plain strings and styled `<span>` elements.
 *
 * @param message The input string, typically from react-intl formatMessage.
 * @param accentClassName Optional class name for the accented span.
 * @returns Array of strings and JSX span elements suitable for React rendering.
 */
export const parseDoTags = (
    message: string,
    accentClassName?: string
): (string | React.ReactElement)[] => {
    if (!message) return [];
    const parts = message.split(/(<do>.*?<\/do>)/g);
    return parts
        .map((part: string, index: number) => {
            if (part.startsWith('<do>') && part.endsWith('</do>')) {
                const content = part.replace(/<\/?do>/g, '');
                return (
                    <span key={index} className={accentClassName || undefined}>
                        {content}
                    </span>
                );
            }
            return part;
        })
        .filter((part: string | React.ReactElement) => part !== '');
};
