export interface YouTubeValidationResult {
  isValid: boolean;
  error?: string;
  videoId?: string;
}

export const validateYouTubeUrl = (url: string): YouTubeValidationResult => {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      error: 'URL is required'
    };
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return {
      isValid: false,
      error: 'URL is required'
    };
  }

  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(&.*)?$/,
    /^https?:\/\/(www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(\?.*)?$/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(\?.*)?$/
  ];

  for (const pattern of patterns) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      const videoId = match[2];
      return {
        isValid: true,
        videoId
      };
    }
  }

  return {
    isValid: false,
    error: 'Please enter a valid YouTube URL (youtube.com/watch?v=...)'
  };
};

export const isPartialYouTubeUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  const trimmedUrl = url.trim().toLowerCase();

  return (
    trimmedUrl.includes('youtube.com') ||
    trimmedUrl.includes('youtu.be') ||
    trimmedUrl.startsWith('https://www.youtube.com') ||
    trimmedUrl.startsWith('http://www.youtube.com') ||
    trimmedUrl.startsWith('https://youtube.com') ||
    trimmedUrl.startsWith('http://youtube.com') ||
    trimmedUrl.startsWith('https://youtu.be') ||
    trimmedUrl.startsWith('http://youtu.be')
  );
};

export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};