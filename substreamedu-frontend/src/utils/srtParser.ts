
export interface ParsedSubtitle {
    id: number;
    name: string;
    startTimeMs: number;
    endTimeMs: number;
    text: string;
}

function parseTimestamp(timestamp: string): number {
    
    const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseInt(match[3]);
    const milliseconds = parseInt(match[4]);
    
    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

export function parseSRT(srtContent: string, subtitleName: string): ParsedSubtitle[] {
    const subtitles: ParsedSubtitle[] = [];
    const lines = srtContent.split('\n');
    
    let currentSubtitle: Partial<ParsedSubtitle> = {};
    let textLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        
        if (!line) {
            if (currentSubtitle.startTimeMs !== undefined && textLines.length > 0) {
                
                subtitles.push({
                    id: currentSubtitle.id || subtitles.length + 1,
                    name: subtitleName,
                    startTimeMs: currentSubtitle.startTimeMs,
                    endTimeMs: currentSubtitle.endTimeMs || 0,
                    text: textLines.join('\n')
                });
                
                
                currentSubtitle = {};
                textLines = [];
            }
            continue;
        }
        
        
        if (/^\d+$/.test(line)) {
            currentSubtitle.id = parseInt(line);
            continue;
        }
        
        
        if (line.includes('-->')) {
            const [start, end] = line.split('-->').map(s => s.trim());
            currentSubtitle.startTimeMs = parseTimestamp(start);
            currentSubtitle.endTimeMs = parseTimestamp(end);
            continue;
        }
        
        
        textLines.push(line);
    }
    
    
    if (currentSubtitle.startTimeMs !== undefined && textLines.length > 0) {
        subtitles.push({
            id: currentSubtitle.id || subtitles.length + 1,
            name: subtitleName,
            startTimeMs: currentSubtitle.startTimeMs,
            endTimeMs: currentSubtitle.endTimeMs || 0,
            text: textLines.join('\n')
        });
    }
    
    return subtitles;
}
