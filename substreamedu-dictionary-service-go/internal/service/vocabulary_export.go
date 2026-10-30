package service

import (
	"bufio"
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/npcnixel/genanki-go"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/model"
	"go.uber.org/zap"
)

func (s *VocabularyService) StreamDictionaryAsCsv(ctx context.Context, userID uuid.UUID, w io.Writer) error {
	items, err := s.repo.FindAllLexemes(ctx, userID)
	if err != nil {
		return err
	}
	return s.streamCsv(ctx, items, w)
}

func (s *VocabularyService) StreamResourceAsCsv(ctx context.Context, userID uuid.UUID, resourceName string, w io.Writer) error {
	items, err := s.repo.FindLexemesByResource(ctx, userID, resourceName)
	if err != nil {
		return err
	}
	return s.streamCsv(ctx, items, w)
}

func (s *VocabularyService) streamCsv(ctx context.Context, items []model.Dictionary, w io.Writer) error {
	bw := bufio.NewWriter(w)
	defer bw.Flush()

	if _, err := bw.WriteString("#sep:;\n#model:SubstreamEDU (Reversed) V11\n#columns:Front;Back;Image\n"); err != nil {
		return err
	}

	for _, item := range items {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		firstCol := s.escapeCsv(item.Word)
		if item.Transcription != "" {
			firstCol += " [" + s.escapeCsv(item.Transcription) + "]"
		}
		if item.Context != "" {
			firstCol += " - " + s.escapeCsv(item.Context)
		}

		def := s.escapeCsv(item.Definition)
		trans := s.escapeCsv(item.Translation)

		var secondCol string
		if def != "" {
			secondCol = fmt.Sprintf("%s (%s)", def, trans)
		} else {
			secondCol = trans
		}

		line := fmt.Sprintf("%s;%s;%s\n", firstCol, secondCol, item.ImageUrl)
		if _, err := bw.WriteString(line); err != nil {
			return err
		}
	}
	return bw.Flush()
}

func (s *VocabularyService) ExportDictionaryAsAnki(ctx context.Context, userID uuid.UUID, maxLimit int) ([]byte, error) {
	items, err := s.repo.FindAllLexemes(ctx, userID)
	if err != nil {
		return nil, err
	}
	if maxLimit > 0 && len(items) > maxLimit {
		return nil, ErrExportLimitExceeded
	}
	return s.generateAnkiPackage(ctx, items, "SubstreamEDU Dictionary")
}

func (s *VocabularyService) ExportResourceAsAnki(ctx context.Context, userID uuid.UUID, resourceName string, maxLimit int) ([]byte, error) {
	items, err := s.repo.FindLexemesByResource(ctx, userID, resourceName)
	if err != nil {
		return nil, err
	}
	if maxLimit > 0 && len(items) > maxLimit {
		return nil, ErrExportLimitExceeded
	}
	return s.generateAnkiPackage(ctx, items, "SubstreamEDU - "+resourceName)
}

func (s *VocabularyService) generateAnkiPackage(ctx context.Context, items []model.Dictionary, deckName string) ([]byte, error) {
	modelIDStraight := int64(1607392342)
	mStraight := genanki.NewModel(modelIDStraight, "SubstreamEDU (Straight) V12")
	mStraight.AddField(genanki.Field{Name: "Word"})
	mStraight.AddField(genanki.Field{Name: "Transcription"})
	mStraight.AddField(genanki.Field{Name: "Context"})
	mStraight.AddField(genanki.Field{Name: "Translation"})
	mStraight.AddField(genanki.Field{Name: "Image"})

	mStraight.AddTemplate(genanki.Template{
		Name: "Card 1 (Straight)",
		Qfmt: `
			<div class="card">
				<div class="word">{{Word}}</div>
				{{#Transcription}}<div class="transcription">[{{Transcription}}]</div>{{/Transcription}}
				{{#Context}}<div class="context">{{Context}}</div>{{/Context}}
			</div>`,
		Afmt: `
			<div class="card">
				<div class="word">{{Word}}</div>
				{{#Transcription}}<div class="transcription">[{{Transcription}}]</div>{{/Transcription}}
				<hr>
				<div class="translation">{{Translation}}</div>
				{{#Image}}<div class="image-container">{{Image}}</div>{{/Image}}
			</div>`,
	})

	modelIDReversed := int64(1607392343)
	mReversed := genanki.NewModel(modelIDReversed, "SubstreamEDU (Reversed) V12")
	mReversed.AddField(genanki.Field{Name: "Word"})
	mReversed.AddField(genanki.Field{Name: "Transcription"})
	mReversed.AddField(genanki.Field{Name: "Context"})
	mReversed.AddField(genanki.Field{Name: "Translation"})
	mReversed.AddField(genanki.Field{Name: "Image"})

	mReversed.AddTemplate(genanki.Template{
		Name: "Card 2 (Reversed)",
		Qfmt: `
			<div class="card">
				<div class="translation">{{Translation}}</div>
			</div>`,
		Afmt: `
			<div class="card">
				<div class="translation">{{Translation}}</div>
				<hr>
				<div class="word">{{Word}}</div>
				{{#Transcription}}<div class="transcription">[{{Transcription}}]</div>{{/Transcription}}
				{{#Context}}<div class="context">{{Context}}</div>{{/Context}}
				{{#Image}}<div class="image-container">{{Image}}</div>{{/Image}}
			</div>`,
	})

	css := `
		.card {
			font-family: arial;
			font-size: 20px;
			text-align: center;
			background-color: white !important;
			color: black !important;
			padding: 20px;
			min-height: 100vh;
		}
		.nightMode .card {
			background-color: white !important;
			color: black !important;
		}
		.word { font-size: 32px; font-weight: bold; margin-bottom: 0.5em; color: black !important; }
		.transcription { color: #666 !important; font-size: 18px; margin-bottom: 0.5em; }
		.context {
			font-style: italic;
			color: #444 !important;
			margin: 1em 0;
			padding: 0.5em;
			background: #f0f0f0 !important;
			border-radius: 4px;
			border-left: 3px solid #4CAF50;
		}
		.translation { font-size: 24px; color: #2e7d32 !important; font-weight: bold; }
		.image-container { margin-top: 1em; }
		img { max-width: 100%; height: auto; border-radius: 8px; }
	`
	mStraight.SetCSS(css)
	mReversed.SetCSS(css)

	deckID := int64(1607392320 + time.Now().UnixNano()%1000)
	deck := genanki.NewDeck(deckID, deckName, "Generated by SubstreamEDU Engine")

	type mediaResult struct {
		index     int
		name      string
		data      []byte
		err       error
		mediaKind string
	}

	results := make(chan mediaResult, len(items)*2)
	var wg sync.WaitGroup

	sem := make(chan struct{}, 10)

	httpClient := &http.Client{Timeout: 10 * time.Second}
	userAgent := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

	downloadFile := func(ctx context.Context, url string) ([]byte, error) {
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", userAgent)
		resp, err := httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
		}
		return io.ReadAll(resp.Body)
	}

	for i, item := range items {
		if item.ImageUrl == "" || !strings.HasPrefix(item.ImageUrl, "http") {
			results <- mediaResult{index: i, mediaKind: "image"}
		} else {
			wg.Add(1)
			sem <- struct{}{}
			go func(idx int, url string) {
				defer wg.Done()
				defer func() { <-sem }()

				data, err := downloadFile(ctx, url)
				if err != nil {
					results <- mediaResult{index: idx, err: err, mediaKind: "image"}
					return
				}

				hash := md5.Sum([]byte(url))
				cleanPath := url
				if qi := strings.Index(cleanPath, "?"); qi != -1 {
					cleanPath = cleanPath[:qi]
				}
				if hi := strings.Index(cleanPath, "#"); hi != -1 {
					cleanPath = cleanPath[:hi]
				}
				ext := strings.ToLower(filepath.Ext(cleanPath))
				if ext == "" || len(ext) > 5 {
					ext = ".jpg"
				}
				name := hex.EncodeToString(hash[:]) + ext
				results <- mediaResult{index: idx, name: name, data: data, mediaKind: "image"}
			}(i, item.ImageUrl)
		}

		isPhrase := len(strings.Fields(item.Word)) > 1
		if isPhrase || item.Word == "" {
			results <- mediaResult{index: i, mediaKind: "audio"}
		} else {
			wg.Add(1)
			sem <- struct{}{}
			go func(idx int, word string) {
				defer wg.Done()
				defer func() { <-sem }()

				var audioData []byte
				var audioErr error

				audioURL := s.getHumanAudioURL(ctx, word)
				if audioURL != "" {
					audioData, audioErr = downloadFile(ctx, audioURL)
				}

				if audioData == nil || audioErr != nil {
					ttsURL := fmt.Sprintf(
						"https://translate.googleapis.com/translate_tts?ie=UTF-8&q=%s&tl=en&total=1&idx=0&textlen=%d&client=gtx",
						strings.ReplaceAll(word, " ", "+"),
						len(word),
					)
					audioData, audioErr = downloadFile(ctx, ttsURL)
				}

				if audioErr != nil || audioData == nil {
					results <- mediaResult{index: idx, err: audioErr, mediaKind: "audio"}
					return
				}

				hash := md5.Sum([]byte("audio:" + word))
				name := "audio-" + hex.EncodeToString(hash[:]) + ".mp3"
				results <- mediaResult{index: idx, name: name, data: audioData, mediaKind: "audio"}
			}(i, item.Word)
		}
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	imageFiles := make(map[int]string)
	audioFiles := make(map[int]string)
	type mediaItem struct {
		name string
		data []byte
	}
	var allMedia []mediaItem
	for res := range results {
		if res.err != nil {
			s.logger.Warn("Failed to download Anki media", zap.Error(res.err), zap.Int("index", res.index), zap.String("kind", res.mediaKind))
			continue
		}
		if res.name != "" {
			switch res.mediaKind {
			case "image":
				imageFiles[res.index] = res.name
			case "audio":
				audioFiles[res.index] = res.name
			}
			allMedia = append(allMedia, mediaItem{name: res.name, data: res.data})
		}
	}

	for i, item := range items {
		noteImage := ""
		if name, ok := imageFiles[i]; ok {
			noteImage = fmt.Sprintf(`<img src="%s">`, name)
		}

		wordField := item.Word
		if name, ok := audioFiles[i]; ok {
			wordField = fmt.Sprintf("%s [sound:%s]", item.Word, name)
		}

		mainMeaning := item.Translation
		if item.Definition != "" {
			if item.Translation != "" {
				mainMeaning = fmt.Sprintf("%s (%s)", item.Definition, item.Translation)
			} else {
				mainMeaning = item.Definition
			}
		}

		noteStraight := genanki.NewNote(modelIDStraight, []string{
			wordField,
			item.Transcription,
			item.Context,
			mainMeaning,
			noteImage,
		}, []string{"SubstreamEDU"})
		deck.AddNote(noteStraight)

		noteReversed := genanki.NewNote(modelIDReversed, []string{
			wordField,
			item.Transcription,
			item.Context,
			mainMeaning,
			noteImage,
		}, []string{"SubstreamEDU"})
		deck.AddNote(noteReversed)
	}

	package_ := genanki.NewPackage([]*genanki.Deck{deck})
	package_.AddModel(mStraight)
	package_.AddModel(mReversed)

	for _, m := range allMedia {
		package_.AddMedia(m.name, m.data)
	}

	tmpFile, err := os.CreateTemp("", "anki_export_*.apkg")
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary file: %w", err)
	}
	tmpPath := tmpFile.Name()
	tmpFile.Close()
	defer os.Remove(tmpPath)

	if err := package_.WriteToFile(tmpPath); err != nil {
		return nil, fmt.Errorf("failed to write anki package: %w", err)
	}

	ankiData, err := os.ReadFile(tmpPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read generated anki package: %w", err)
	}

	return ankiData, nil
}

func (s *VocabularyService) escapeCsv(value string) string {
	if value == "" {
		return ""
	}

	replacer := strings.NewReplacer(";", " ", "\t", " ", "\n", " ", "\r", "")
	return replacer.Replace(value)
}

func (s *VocabularyService) getHumanAudioURL(ctx context.Context, word string) string {
	apiURL := fmt.Sprintf("https://api.dictionaryapi.dev/api/v2/entries/en/%s", strings.ToLower(word))

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return ""
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return ""
	}
	defer resp.Body.Close()

	var entries []struct {
		Phonetics []struct {
			Audio string `json:"audio"`
		} `json:"phonetics"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&entries); err != nil {
		return ""
	}

	for _, entry := range entries {
		for _, p := range entry.Phonetics {
			if p.Audio != "" && strings.HasPrefix(p.Audio, "http") {
				return p.Audio
			}
		}
	}
	return ""
}
