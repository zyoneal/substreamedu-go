package parser

import (
	"encoding/json"
	"encoding/xml"
	"html"
	"regexp"
	"strconv"
	"strings"

	"github.com/substreamedu/substreamedu-media-service/internal/dto"
)

var (
	srtTimeRegex	= regexp.MustCompile(`(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})`)
	vttTimeRegex	= regexp.MustCompile(`((?:\d{2}:)?\d{2}:\d{2}\.\d{3}) --> ((?:\d{2}:)?\d{2}:\d{2}\.\d{3})`)
)

type timedTextXML struct {
	XMLName	xml.Name	`xml:"transcript"`
	Texts	[]textXML	`xml:"text"`
}

type textXML struct {
	Start	string	`xml:"start,attr"`
	Dur	string	`xml:"dur,attr"`
	Value	string	`xml:",chardata"`
}

func ParseSrt(lines []string) []dto.SubtitleResponseDto {
	return parse(lines, false)
}

func ParseVtt(lines []string) []dto.SubtitleResponseDto {
	return parse(lines, true)
}

type youtubeJSON3 struct {
	Events []struct {
		TStartMs	int32	`json:"tStartMs"`
		DDurationMs	int32	`json:"dDurationMs"`
		Segs		[]struct {
			Utf8 string `json:"utf8"`
		}	`json:"segs"`
	} `json:"events"`
}

func ParseYoutubeJSON3(data []byte) ([]dto.SubtitleResponseDto, error) {
	var tt youtubeJSON3
	if err := json.Unmarshal(data, &tt); err != nil {
		return nil, err
	}

	var subs []dto.SubtitleResponseDto
	var id int64 = 1
	for _, event := range tt.Events {
		var textBuilder strings.Builder
		for _, seg := range event.Segs {
			textBuilder.WriteString(seg.Utf8)
		}

		clean := CleanSubtitleText(textBuilder.String())
		if clean == "" {
			continue
		}

		subs = append(subs, dto.SubtitleResponseDto{
			ID:		id,
			Name:		"YouTube",
			StartTimeMs:	event.TStartMs,
			EndTimeMs:	event.TStartMs + event.DDurationMs,
			Text:		clean,
		})
		id++
	}
	return subs, nil
}

func ParseYoutubeXML(data []byte) ([]dto.SubtitleResponseDto, error) {
	var tt timedTextXML
	if err := xml.Unmarshal(data, &tt); err != nil {
		return nil, err
	}

	var subs []dto.SubtitleResponseDto
	for i, t := range tt.Texts {
		start, _ := strconv.ParseFloat(t.Start, 64)
		dur, _ := strconv.ParseFloat(t.Dur, 64)

		clean := CleanSubtitleText(t.Value)
		if clean == "" {
			continue
		}

		subs = append(subs, dto.SubtitleResponseDto{
			ID:		int64(i + 1),
			Name:		"YouTube",
			StartTimeMs:	int32(start * 1000),
			EndTimeMs:	int32((start + dur) * 1000),
			Text:		clean,
		})
	}
	return subs, nil
}

func parse(lines []string, isVtt bool) []dto.SubtitleResponseDto {
	var subs []dto.SubtitleResponseDto
	var id int64 = 1
	var startTime, endTime string
	var textBuilder strings.Builder
	timeRegex := srtTimeRegex
	if isVtt {
		timeRegex = vttTimeRegex
	}

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || (isVtt && line == "WEBVTT") {
			if startTime != "" && textBuilder.Len() > 0 {
				addSub(&subs, &id, startTime, endTime, textBuilder.String(), isVtt)
			}
			startTime = ""
			textBuilder.Reset()
			continue
		}

		matches := timeRegex.FindStringSubmatch(line)
		if len(matches) > 0 {
			if startTime != "" && textBuilder.Len() > 0 {
				addSub(&subs, &id, startTime, endTime, textBuilder.String(), isVtt)
			}
			startTime = matches[1]
			endTime = matches[2]
			textBuilder.Reset()
		} else if startTime != "" {
			if textBuilder.Len() > 0 {
				textBuilder.WriteString(" ")
			}
			textBuilder.WriteString(line)
		}
	}

	if startTime != "" && textBuilder.Len() > 0 {
		addSub(&subs, &id, startTime, endTime, textBuilder.String(), isVtt)
	}

	return subs
}

func addSub(subs *[]dto.SubtitleResponseDto, id *int64, start, end, text string, isVtt bool) {
	clean := CleanSubtitleText(text)
	if clean == "" {
		return
	}

	startMs := ParseTime(start, isVtt)
	endMs := ParseTime(end, isVtt)

	name := "Srt Subtitle"
	if isVtt {
		name = "Video Subtitle"
	}

	*subs = append(*subs, dto.SubtitleResponseDto{
		ID:		*id,
		Name:		name,
		StartTimeMs:	int32(startMs),
		EndTimeMs:	int32(endMs),
		Text:		clean,
	})
	*id++
}

var cleanTagsRegex = regexp.MustCompile("<[^>]*>")

func CleanSubtitleText(text string) string {
	text = cleanTagsRegex.ReplaceAllString(text, "")
	text = html.UnescapeString(text)
	return strings.Join(strings.Fields(text), " ")
}

func ParseTime(t string, isVtt bool) int {
	var parts []string
	if isVtt {
		parts = strings.FieldsFunc(t, func(r rune) bool { return r == ':' || r == '.' })
	} else {
		parts = strings.FieldsFunc(t, func(r rune) bool { return r == ':' || r == ',' })
	}

	if len(parts) == 4 {
		h, _ := strconv.Atoi(parts[0])
		m, _ := strconv.Atoi(parts[1])
		s, _ := strconv.Atoi(parts[2])
		ms, _ := strconv.Atoi(parts[3])
		return (h*3600+m*60+s)*1000 + ms
	} else if len(parts) == 3 && isVtt {
		m, _ := strconv.Atoi(parts[0])
		s, _ := strconv.Atoi(parts[1])
		ms, _ := strconv.Atoi(parts[2])
		return (m*60+s)*1000 + ms
	}
	return 0
}
