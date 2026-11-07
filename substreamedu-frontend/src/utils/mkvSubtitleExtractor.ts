import { SubDLSubtitle } from '../services/SubtitleService';
import { cleanSubtitleText } from './subtitleCleaner';

import { SubtitleParser } from 'matroska-subtitles';


import { Buffer } from 'buffer';



if (typeof window !== 'undefined' && !window.Buffer) {
    (window as any).Buffer = Buffer;
}

export const extractSubtitlesFromMkv = async (file: File): Promise<{
    subtitles: SubDLSubtitle[];
    files: File[];
    warnings: string[];
    info: string[];
}> => {
    return new Promise((resolve) => {
        const warnings: string[] = [];
        const info: string[] = [];
        const parser = new SubtitleParser();

        
        const tracks = new Map<number, {
            number: number,
            type: string,
            codec: string,
            language: string,
            name: string,
            content: string[],
            isSupported: boolean
        }>();

        parser.once('tracks', (trackList: any[]) => {
            console.log('Found MKV tracks:', trackList);
            info.push(`Found ${trackList.length} tracks in MKV header.`);

            trackList.forEach(track => {
                const codecID = track.codecID || track.codec;
                const type = track.type ? track.type.toLowerCase() : '';

                // Matroska-subtitles library simplifies S_TEXT/UTF8 to type='utf8', S_TEXT/SSA to type='ssa', etc.
                

                const isTextTrack = type === 'utf8' || type === 'ssa' || type === 'ass' || type === 'usf' || type === 'vtt' || type === 'subtitle';
                const isSupported = isTextTrack || (codecID && codecID.startsWith('S_TEXT'));

                if (isSupported || (codecID && (codecID.startsWith('S_VOBSUB') || codecID.startsWith('S_HDMV/PGS')))) {

                    tracks.set(track.number, {
                        number: track.number,
                        type: type || 'subtitle',
                        codec: codecID || type,
                        language: track.language || 'und',
                        name: track.name || `Track ${track.number} (${type})`,
                        content: [],
                        isSupported: !!isSupported
                    });

                    if (!isSupported) {
                        const msg = `Found unsupported subtitle track: ${codecID || type} (${track.language || 'und'})`;
                        console.warn(msg);
                        warnings.push(msg);
                    } else {
                        info.push(`Found supported subtitle track: ${codecID || type} (${track.language || 'und'})`);
                    }
                } else {
                    
                    console.log('Ignoring track:', track);
                }
            });

            if (tracks.size === 0) {
                warnings.push("No subtitle tracks found in MKV header.");
            }
        });

        parser.on('subtitle', (subtitle: any, trackNumber: number) => {
            const track = tracks.get(trackNumber);
            if (track && track.isSupported) {
                const startTime = formatTimestamp(subtitle.time);
                const endTime = formatTimestamp(subtitle.time + subtitle.duration);
                const text = cleanSubtitleText(subtitle.text || '');

                if (text) {
                    const index = track.content.length + 1;
                    const entry = `${index}\n${startTime} --> ${endTime}\n${text}\n`;
                    track.content.push(entry);
                }
            }
        });

        const onFinish = () => {
            const results: SubDLSubtitle[] = [];
            const resultFiles: File[] = [];

            tracks.forEach((track, number) => {
                if (track.isSupported && track.content.length > 0) {
                    // Filter: Only extract English subtitles
                    // Check language code ('en', 'eng') or track name ('English', 'Ingles', etc. if needed, but sticking to 'English' for now)
                    const lang = (track.language || '').toLowerCase();
                    const name = (track.name || '').toLowerCase();

                    const isEnglish = lang.startsWith('en') || name.includes('english') || name.includes('eng');

                    if (!isEnglish) {
                        
                        return;
                    }

                    const blobContent = track.content.join('\n');
                    const blob = new Blob([blobContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);

                    const languageCode = track.language || 'en';
                    let trackName = track.name || `Embedded ${languageCode.toUpperCase()} (${track.codec?.replace('S_TEXT/', '')})`;

                    
                    let supportedTrackCount = 0;
                    tracks.forEach(t => {
                        const tLang = (t.language || '').toLowerCase();
                        const tName = (t.name || '').toLowerCase();
                        const isEng = tLang.startsWith('en') || tName.includes('english') || tName.includes('eng');

                        if (t.isSupported && t.content.length > 0 && isEng) {
                            supportedTrackCount++;
                        }
                    });

                    let safeFileName;
                    if (supportedTrackCount === 1) {
                        safeFileName = `${file.name.replace(/\.[^/.]+$/, "")}.srt`;
                        
                        trackName = 'Embedded Subtitles';
                    } else {
                        safeFileName = `${file.name.replace(/\.[^/.]+$/, "")}.${languageCode}.${track.number}.srt`;
                    }

                    const subFile = new File([blob], safeFileName, { type: "text/plain" });
                    resultFiles.push(subFile);

                    results.push({
                        subtitlesId: `embedded-${number}-${Date.now()}`,
                        name: trackName,
                        releaseName: file.name,
                        language: languageCode,
                        author: 'Embedded',
                        url: url,
                        ratings: 0,
                        votes: 0,
                        hi: false,
                        frameRate: 0,
                        downloadCount: '0',
                        uploadDate: new Date().toISOString(),
                        seasonNumber: 0,
                        episodeNumber: 0,
                        fromTrusted: true
                    });
                } else if (track.isSupported && track.content.length === 0) {
                    warnings.push(`Supported track ${track.number} (${track.codec}) found but yielded no content (0 subtitles parsed).`);
                }
            });

            console.log(`Extracted ${results.length} subtitle tracks.`);
            resolve({ subtitles: results, files: resultFiles, warnings, info });
        };

        parser.on('finish', onFinish);
        parser.on('end', onFinish); 

        parser.on('error', (err: any) => {
            const msg = `Error in MKV parser: ${err.message || err}`;
            console.error(msg);
            warnings.push(msg);
            resolve({ subtitles: [], files: [], warnings, info });
        });

        parseFileChunks(file, parser);
    });
};

const parseFileChunks = (file: File, parser: any) => {
    const chunkSize = 5 * 1024 * 1024; 
    let offset = 0;

    const readNextChunk = () => {
        if (offset >= file.size) {
            parser.end();
            return;
        }

        const slice = file.slice(offset, offset + chunkSize);
        const reader = new FileReader();

        reader.onload = (e) => {
            if (e.target?.result) {
                try {
                    const buffer = new Uint8Array(e.target.result as ArrayBuffer);
                    parser.write(buffer);
                    offset += chunkSize;

                    
                    setTimeout(readNextChunk, 0);
                } catch (err) {
                    console.error('Error parsing MKV chunk:', err);
                    parser.end();
                }
            }
        };

        reader.onerror = () => {
            console.error('FileReader error');
            parser.end();
        };

        reader.readAsArrayBuffer(slice);
    };

    readNextChunk();
};

function formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor(ms % 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const msStr = String(milliseconds).padStart(3, '0');

    return `${hh}:${mm}:${ss},${msStr}`;
}
