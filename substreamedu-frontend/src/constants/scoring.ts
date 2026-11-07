
export const SCORING_WEIGHTS = {
  
  RATINGS_MAX: 15,
  VOTES_MAX: 10,
  
  
  TRUSTED_SOURCE: 15,
  
  
  FPS_EXACT_MATCH: 10,
  FPS_CLOSE_MATCH: 5,
  
  
  QUALITY_MATCH: 5,
  RELEASE_NAME_MATCH: 5,
  
  
  TIMELINE_PERFECT: 40,      
  TIMELINE_EXCELLENT: 35,    
  TIMELINE_GOOD: 25,         
  TIMELINE_ACCEPTABLE: 15,   
} as const;

export const SCORE_THRESHOLDS = {
  
  EXCELLENT_RATING: 9,
  GOOD_RATING: 7,
  
  
  POPULAR_VOTES: 50,
  
  
  GOOD_SUBTITLE_SCORE: 40,
  
  
  FPS_EXACT_TOLERANCE: 0.1,
  FPS_CLOSE_TOLERANCE: 1.0,
  
  
  TIMELINE_PERFECT_PERCENT: 1,
  TIMELINE_EXCELLENT_PERCENT: 2,
  TIMELINE_GOOD_PERCENT: 5,
  TIMELINE_ACCEPTABLE_PERCENT: 10,
  
  
  MIN_COMMON_WORDS: 3,
} as const;

export const VIDEO_QUALITY_MARKERS = [
  '720p',
  '1080p',
  '2160p',
  '4k',
  'bluray',
  'web-dl',
  'webrip',
  'hdtv',
  'brrip',
  'dvdrip',
] as const;

export const VIDEO_EXTENSIONS = [
  'mp4',
  'mkv',
  'avi',
  'mov',
  'wmv',
  'flv',
  'webm',
] as const;
