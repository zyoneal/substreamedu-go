import { useState, useEffect, useCallback } from 'react';

export interface RecentVideo {
  id: string;
  name: string;
  date: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

const RECENT_VIDEOS_KEY = 'recentVideos';
const MAX_RECENT_VIDEOS = 4;

export const useRecentVideos = (): [RecentVideo[], (video: RecentVideo) => void, (videoId: string) => void] => {
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);

  useEffect(() => {
    try {
      const storedVideos = localStorage.getItem(RECENT_VIDEOS_KEY);
      if (storedVideos) {
        const videos: RecentVideo[] = JSON.parse(storedVideos);
        setRecentVideos(videos);
      }
    } catch (error) {
      console.error('Failed to parse recent videos from localStorage', error);
    }
  }, []);

  const addRecentVideo = useCallback((video: RecentVideo) => {
    setRecentVideos(prevVideos => {
      const updatedVideos = [video, ...prevVideos.filter(v => v.videoUrl !== video.videoUrl)].slice(0, MAX_RECENT_VIDEOS);
      try {
        localStorage.setItem(RECENT_VIDEOS_KEY, JSON.stringify(updatedVideos));
      } catch (error) {
        console.error('Failed to save recent videos to localStorage', error);
      }
      return updatedVideos;
    });
  }, []);

  const deleteRecentVideo = useCallback((videoId: string) => {
    setRecentVideos(prevVideos => {
      const updatedVideos = prevVideos.filter(v => v.id !== videoId);
      try {
        localStorage.setItem(RECENT_VIDEOS_KEY, JSON.stringify(updatedVideos));
      } catch (error) {
        console.error('Failed to save recent videos to localStorage', error);
      }
      return updatedVideos;
    });
  }, []);

  return [recentVideos, addRecentVideo, deleteRecentVideo];
};