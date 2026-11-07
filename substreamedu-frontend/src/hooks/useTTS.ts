import { useState, useRef, useCallback } from 'react';


const audioCache = new Map<string, string | null>();

// Circuit breaker state for external dictionary API
let externalApiFailures = 0;
let externalApiCooldownUntil = 0;
const EXTERNAL_API_TIMEOUT_MS = 1200; // 1.2s max wait before falling back to system speech synthesis
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minute cooldown after repeated failures

export const useTTS = () => {
    const [playingItemId, setPlayingItemId] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const getHumanAudioUrl = useCallback(async (word: string, lang: string = 'en'): Promise<string | null> => {
        if (lang !== 'en') return null;

        const cacheKey = `dict:${word.toLowerCase()}`;
        if (audioCache.has(cacheKey)) {
            return audioCache.get(cacheKey) ?? null;
        }

        // Fast circuit-breaker check: if API is unhealthy, don't stall the browser
        if (Date.now() < externalApiCooldownUntil) {
            return null;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT_MS);

        try {
            const response = await fetch(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status >= 500) {
                    externalApiFailures++;
                    if (externalApiFailures >= 2) {
                        externalApiCooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
                    }
                }
                audioCache.set(cacheKey, null);
                return null;
            }

            // Success: reset failure counter
            externalApiFailures = 0;

            const data = await response.json();
            if (!Array.isArray(data)) {
                audioCache.set(cacheKey, null);
                return null;
            }

            // Extract audio files from phonetics
            const audioEntries: { url: string; score: number }[] = [];

            for (const entry of data) {
                if (!entry.phonetics || !Array.isArray(entry.phonetics)) continue;

                for (const phonetic of entry.phonetics) {
                    if (!phonetic.audio || !phonetic.audio.startsWith('http')) continue;

                    let score = 0;
                    const audioUrl = phonetic.audio.toLowerCase();

                    // Prioritize US accent
                    if (audioUrl.includes('-us') || audioUrl.includes('_us') || audioUrl.includes('/us/')) {
                        score += 20;
                    }
                    // Secondary UK accent
                    if (audioUrl.includes('-uk') || audioUrl.includes('_uk') || audioUrl.includes('/uk/')) {
                        score += 10;
                    }
                    // Prefer MP3 over OGG
                    if (audioUrl.endsWith('.mp3')) {
                        score += 5;
                    }
                    // Other formats
                    if (audioUrl.endsWith('.ogg')) {
                        score += 3;
                    }

                    audioEntries.push({ url: phonetic.audio, score });
                }
            }

            if (audioEntries.length === 0) {
                audioCache.set(cacheKey, null);
                return null;
            }

            // Sort by score descending and take the best
            audioEntries.sort((a, b) => b.score - a.score);
            const bestUrl = audioEntries[0].url;
            audioCache.set(cacheKey, bestUrl);
            return bestUrl;
        } catch {
            clearTimeout(timeoutId);
            externalApiFailures++;
            if (externalApiFailures >= 2) {
                externalApiCooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
            }
            audioCache.set(cacheKey, null);
            // Silent fallback to Web Speech API without spamming console errors
            return null;
        }
    }, []);

        const playAudioFromUrl = useCallback((
        url: string,
        itemId: number,
        onFallback: () => void
    ) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        let fallbackTriggered = false;

        
        const timeout = setTimeout(() => {
            if (!fallbackTriggered) {
                fallbackTriggered = true;
                audio.pause();
                audioRef.current = null;
                onFallback();
            }
        }, 3000);

        const triggerFallback = () => {
            clearTimeout(timeout);
            if (!fallbackTriggered) {
                fallbackTriggered = true;
                audioRef.current = null;
                onFallback();
            }
        };

        audio.onended = () => {
            clearTimeout(timeout);
            setPlayingItemId(null);
            audioRef.current = null;
        };

        audio.oncanplaythrough = () => {
            clearTimeout(timeout);
        };

        audio.onerror = () => {
            triggerFallback();
        };

        audio.play().catch(() => {
            triggerFallback();
        });
    }, []);

        const getBestVoice = useCallback((lang: string): SpeechSynthesisVoice | null => {
        const voices = window.speechSynthesis.getVoices?.() || [];
        if (voices.length === 0) return null;

        const isEnglish = lang.startsWith('en');
        const targetLang = isEnglish ? 'en' : lang;

        
        const langVoices = voices.filter(v =>
            v.lang.toLowerCase().startsWith(targetLang.toLowerCase())
        );

        
        if (langVoices.length === 0) return null;

        const scoredVoices = langVoices.map(voice => {
            let score = 0;
            const name = voice.name.toLowerCase();
            const voiceLang = voice.lang.toLowerCase();

            
            
            if (name.includes('google')) score += 30;
            
            if (name.includes('enhanced')) score += 25;
            if (name.includes('premium')) score += 25;
            if (name.includes('natural')) score += 20;
            if (name.includes('neural')) score += 20;

            
            
            if (name.includes('samantha')) score += 18;
            if (name.includes('alex')) score += 15;
            if (name.includes('karen')) score += 12;
            
            if (name.includes('microsoft') && (name.includes('david') || name.includes('zira') || name.includes('mark'))) {
                score += 18;
            }

            
            if (isEnglish) {
                
                if (voiceLang === 'en-us') score += 10;
                
                if (voiceLang === 'en-gb') score += 5;
            }

            
            if (name.includes('compact')) score -= 10;

            return { voice, score };
        });

        return scoredVoices.sort((a, b) => b.score - a.score)[0].voice;
    }, []);

        const playSystemPronunciation = useCallback((
        word: string,
        lang: string,
        itemId: number,
        setPlayingId: (id: number | null) => void
    ) => {
        if (!('speechSynthesis' in window)) {
            setPlayingId(null);
            return;
        }

        const playWithVoice = () => {
            try {
                window.speechSynthesis.cancel();

                const voiceToUse = getBestVoice(lang);
                const utterance = new SpeechSynthesisUtterance(word);

                if (voiceToUse) {
                    utterance.voice = voiceToUse;
                    utterance.lang = voiceToUse.lang;
                } else {
                    utterance.lang = lang === 'en' ? 'en-US' : lang;
                }

                utterance.rate = 0.9;
                utterance.pitch = 1.0;

                utterance.onend = () => setPlayingId(null);
                utterance.onerror = () => setPlayingId(null);

                window.speechSynthesis.speak(utterance);
            } catch {
                setPlayingId(null);
            }
        };

        const availableVoices = window.speechSynthesis.getVoices?.() || [];
        if (availableVoices.length === 0 && typeof window.speechSynthesis.addEventListener === 'function') {
            window.speechSynthesis.addEventListener('voiceschanged', () => {
                playWithVoice();
            }, { once: true });
        } else {
            playWithVoice();
        }
    }, [getBestVoice]);

        const play = useCallback(async (word: string, itemId: number, lang: string = 'en') => {
        
        const cleanWord = word.replace(/<[^>]*>/g, '').trim();
        if (!cleanWord) {
            setPlayingItemId(null);
            return;
        }

        setPlayingItemId(itemId);

        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        const isPhrase = cleanWord.split(/\s+/).length > 1;

        
        const systemFallback = () => playSystemPronunciation(cleanWord, lang, itemId, setPlayingItemId);

        
        if (!isPhrase && lang === 'en') {
            const humanAudioUrl = await getHumanAudioUrl(cleanWord, lang);
            if (humanAudioUrl) {
                playAudioFromUrl(humanAudioUrl, itemId, systemFallback);
                return;
            }
        }

        
        systemFallback();
    }, [getHumanAudioUrl, playAudioFromUrl, playSystemPronunciation]);

    return {
        play,
        playingItemId,
        setPlayingItemId
    };
};
