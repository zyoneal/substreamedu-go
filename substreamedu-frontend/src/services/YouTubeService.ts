import { axiosService } from './AxiosService';

export interface YoutubeVideoDto {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export const YouTubeService = {
  async getVideoInfo(videoId: string): Promise<YoutubeVideoDto> {
    try {
      const response = await axiosService.get<YoutubeVideoDto>('/api/youtube/info', {
        params: { videoId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch YouTube video info:', error);
      throw error;
    }
  },
};