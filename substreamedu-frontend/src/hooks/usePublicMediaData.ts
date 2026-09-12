import { useState, useEffect } from 'react';

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


const mockDatabase: Record<string, PublicMediaData> = {
  'shape-of-you-ed-sheeran': {
    slug: 'shape-of-you-ed-sheeran',
    title: 'Shape of You',
    artistOrCreator: 'Ed Sheeran',
    type: 'song',
    coverImageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    snippet: [
      "The club isn't the best place to find a lover",
      "So the bar is where I go",
      "Me and my friends at the table doing shots",
      "Drinking fast and then we talk slow"
    ],
    highlightedWords: [
      { word: "lover", transcription: "/ˈlʌv.ər/", translation: "возлюбленный / любимый" },
      { word: "shots", transcription: "/ʃɒts/", translation: "рюмки (с алкоголем)" },
      { word: "slow", transcription: "/sləʊ/", translation: "медленно" }
    ]
  },
  'interstellar-docking-scene': {
    slug: 'interstellar-docking-scene',
    title: 'Interstellar (Docking Scene)',
    artistOrCreator: 'Christopher Nolan',
    type: 'movie',
    coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
    snippet: [
      "Cooper: CASE, if I black out, you take the stick.",
      "CASE: Endurance rotation is 67, 68 RPM.",
      "Cooper: Get ready to match our spin with the retro thrusters."
    ],
    highlightedWords: [
      { word: "black out", transcription: "/blæk aʊt/", translation: "потерять сознание" },
      { word: "rotation", transcription: "/rəʊˈteɪ.ʃən/", translation: "вращение" },
      { word: "thrusters", transcription: "/ˈθrʌs.tərz/", translation: "двигатели" }
    ]
  }
};

export const usePublicMediaData = (slug: string) => {
  const [data, setData] = useState<PublicMediaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    
    setLoading(true);
    const timer = setTimeout(() => {
      const foundData = mockDatabase[slug];
      if (foundData) {
        setData(foundData);
        setError(null);
      } else {
        setError('Content not found');
        setData(null);
      }
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [slug]);

  return { data, loading, error };
};
