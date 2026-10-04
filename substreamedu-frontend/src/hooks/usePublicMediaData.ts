import { useState, useEffect } from 'react';
import { axiosService as AxiosService } from '../services/AxiosService';
import { urls } from '../constants/urls';

export interface HighlightedWord {
  word: string;
  transcription: string;
  translation: string;
}

export interface PublicMediaData {
  title: string;
  artistOrCreator: string;
  type: 'song' | 'movie';
  coverImageUrl: string;
  snippet: string[];
  highlightedWords: HighlightedWord[];
  slug: string;
}

export const usePublicMediaData = (slug: string) => {
  const [data, setData] = useState<PublicMediaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    AxiosService.get(urls.publicMedia(slug))
      .then((response: any) => {
        // AxiosService response interceptor automatically unwraps { success: true, data: {...} } -> response.data
        const payload = (response?.data && response.data.title)
          ? response.data
          : (response?.data?.data && response.data.data.title ? response.data.data : null);

        if (isMounted && payload) {
          setData(payload);
          setError(null);
        } else if (isMounted) {
          setError('Content not found');
          setData(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error("Error fetching public media:", err);
          setError('Content not found');
          setData(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return { data, loading, error };
};
