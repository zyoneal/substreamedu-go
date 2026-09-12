import { VIDEO_EXTENSIONS } from '../constants/scoring';

export interface SeriesInfo {
  isSeriesLike: boolean;
  hasEpisodeInfo: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
  seriesName?: string;
}

export function cleanVideoName(videoName: string): string {
  if (!videoName) return '';
  
  // Remove extension
  const extensionsPattern = VIDEO_EXTENSIONS.join('|');
  const cleanedName = videoName.replace(
    new RegExp(`\\.(${extensionsPattern})$`, 'i'),
    ''
  );
  
  // Replace common separators with spaces
  const withSpaces = cleanedName
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove quality/codec info after episode number
  // Pattern: "Show Name S01E02 720p BluRay" -> "Show Name S01E02"
  return withSpaces.replace(/(\s+s\d{1,2}e\d{1,2})\s+.*$/i, '$1');
}

export function extractSeriesInfo(videoName: string): SeriesInfo {
  const episodeMatch = videoName.match(/\bs(\d{1,2})e(\d{1,2})\b/i);
  
  if (episodeMatch) {
    const seasonNumber = parseInt(episodeMatch[1], 10);
    const episodeNumber = parseInt(episodeMatch[2], 10);
    const seriesName = videoName
      .replace(/\s+s\d{1,2}e\d{1,2}.*$/i, '')
      .trim();
    
    return {
      isSeriesLike: true,
      hasEpisodeInfo: true,
      seasonNumber,
      episodeNumber,
      seriesName,
    };
  }
  
  // Check if it looks like a series but doesn't have episode info
  const looksLikeSeries = /\b(season|series|episode|s\d{1,2}|e\d{1,2})\b/i.test(videoName);
  
  return {
    isSeriesLike: looksLikeSeries,
    hasEpisodeInfo: false,
  };
}

export interface MovieYearInfo {
  hasYear: boolean;
  year?: number;
  cleanTitle: string;
}

export function extractMovieYear(videoName: string): MovieYearInfo {
  const yearMatch = videoName.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    const cleanTitle = videoName
      .replace(/\b(19\d{2}|20\d{2})\b/, '')
      .replace(/[()[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      hasYear: true,
      year,
      cleanTitle,
    };
  }
  return {
    hasYear: false,
    cleanTitle: videoName,
  };
}

export function buildLanguageList(learningLanguage?: string): string {
  const languageSet = new Set<string>(['EN']);
  
  
  if (learningLanguage && learningLanguage.toUpperCase() !== 'EN') {
    languageSet.add(learningLanguage.toUpperCase());
  }
  
  return Array.from(languageSet).join(',');
}

export function extractVideoNameFromUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    
    const cleanUrl = url.split('?')[0];
    
    
    const segments = cleanUrl.split('/');
    const fileName = segments[segments.length - 1];
    
    
    return decodeURIComponent(fileName);
  } catch (error) {
    console.error('Error extracting video name from URL:', error);
    return null;
  }
}
