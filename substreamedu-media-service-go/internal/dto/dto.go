package dto

import (
	"encoding/json"
	"time"
)

type ApiResponse struct {
	Success		bool		`json:"success"`
	Message		string		`json:"message,omitempty"`
	Data		interface{}	`json:"data"`
	Timestamp	time.Time	`json:"timestamp"`
}

type UserMediaStatsDto struct {
	SubtitleCount int `json:"subtitleCount"`
}

type YoutubeVideoDto struct {
	ID		string	`json:"id"`
	Title		string	`json:"title"`
	Description	string	`json:"description"`
	ThumbnailURL	string	`json:"thumbnailUrl"`
	ViewCount	string	`json:"viewCount"`
	LikeCount	string	`json:"likeCount"`
	Duration	string	`json:"duration"`
}

type YoutubeResponseDto struct {
	Items []YoutubeVideoDto `json:"items"`
}

type SubtitleDto struct {
	Name string `json:"name"`
}

type SubtitleResponseDto struct {
	ID		int64	`json:"id"`
	Name		string	`json:"name"`
	StartTimeMs	int32	`json:"startTimeMs"`
	EndTimeMs	int32	`json:"endTimeMs"`
	Text		string	`json:"text"`
}

type MusicTrackDto struct {
	ID		string	`json:"id"`
	Title		string	`json:"title"`
	Artist		string	`json:"artist"`
	Album		string	`json:"album"`
	DurationMs	int	`json:"durationMs"`
	PreviewURL	string	`json:"previewUrl"`
	ImageURL	string	`json:"imageUrl"`
	ExternalURL	string	`json:"externalUrl"`
}

type GenerateTextRequest struct {
	CefrLevel	string	`json:"cefrLevel"`
	Language	string	`json:"language"`
	Topic		string	`json:"topic"`
}

type SubtitleSearchResponse struct {
	Status		bool		`json:"status"`
	Results		[]SearchResult	`json:"results"`
	Subtitles	[]SubtitleItem	`json:"subtitles"`
}

type SearchResult struct {
	ImdbID		string	`json:"imdbId"`
	TmdbID		int	`json:"tmdbId"`
	Type		string	`json:"type"`
	Name		string	`json:"name"`
	SdID		int	`json:"sdId"`
	FirstAirDate	string	`json:"firstAirDate"`
	Year		int	`json:"year"`
}

type SubtitleItem struct {
	SubtitlesID	string	`json:"subtitlesId"`
	Name		string	`json:"name"`
	ReleaseName	string	`json:"releaseName"`
	URL		string	`json:"url"`
	Ratings		int	`json:"ratings"`
	Votes		int	`json:"votes"`
	HI		bool	`json:"hi"`
	Language	string	`json:"language"`
	Author		string	`json:"author"`
	SeasonNumber	int	`json:"seasonNumber"`
	EpisodeNumber	int	`json:"episodeNumber"`
	FrameRate	int	`json:"frameRate"`
	DownloadCount	string	`json:"downloadCount"`
	UploadDate	string	`json:"uploadDate"`
}

type SubDLSearchResponse struct {
	Status		bool			`json:"status"`
	Results		[]SubDLSearchResult	`json:"results"`
	Subtitles	[]SubDLSubtitleItem	`json:"subtitles"`
}

type SubDLSearchResult struct {
	ImdbID		string	`json:"imdb_id"`
	TmdbID		int	`json:"tmdb_id"`
	Type		string	`json:"type"`
	Name		string	`json:"name"`
	SdID		int	`json:"sd_id"`
	FirstAirDate	string	`json:"first_air_date"`
	Year		int	`json:"year"`
}

type SubDLSubtitleItem struct {
	SubtitleID	json.Number	`json:"subtitle_id"`
	ID		json.Number	`json:"id"`
	Name		string		`json:"name"`
	ReleaseName	string		`json:"release_name"`
	URL		string		`json:"url"`
	Ratings		int		`json:"ratings"`
	Votes		int		`json:"votes"`
	HI		bool		`json:"hi"`
	Language	string		`json:"language"`
	Author		string		`json:"author"`
	SeasonNumber	int		`json:"season"`
	EpisodeNumber	int		`json:"episode"`
	FrameRate	int		`json:"frame_rate"`
	DownloadCount	string		`json:"download_count"`
	UploadDate	string		`json:"upload_date"`
}
