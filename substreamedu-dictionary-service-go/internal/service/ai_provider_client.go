package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	json "github.com/goccy/go-json"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"go.uber.org/zap"
)

func (s *AIService) callWithFallback(ctx context.Context, dsReq dto.DeepSeekRequest) (string, error) {
	var errs []string

	// 1. Try DeepSeek (Primary: deepseek-chat)
	if s.deepseekKey != "" {
		dsReqCopy := dsReq
		dsReqCopy.Model = "deepseek-chat"
		resp, err := s.callDeepSeek(ctx, dsReqCopy)
		if err == nil && strings.TrimSpace(resp) != "" {
			return resp, nil
		}
		if err != nil {
			s.logger.Warn("DeepSeek call failed in callWithFallback, trying Groq fallback", zap.Error(err))
			errs = append(errs, fmt.Sprintf("DeepSeek: %v", err))
		}
	} else {
		errs = append(errs, "DeepSeek: not configured")
	}

	// 2. Try Groq (Fast Fallback: Llama-3.3-70B / 8B)
	if s.groqKey != "" {
		groqReq := dsReq
		if groqReq.Model == "" || groqReq.Model == "deepseek-chat" {
			groqReq.Model = "llama-3.3-70b-versatile"
		}
		resp, err := s.callGroq(ctx, groqReq)
		if err == nil && strings.TrimSpace(resp) != "" {
			return resp, nil
		}
		if err != nil {
			s.logger.Warn("Groq call failed in callWithFallback, trying Gemini fallback", zap.Error(err))
			errs = append(errs, fmt.Sprintf("Groq: %v", err))
		}
	} else {
		errs = append(errs, "Groq: not configured")
	}

	// 3. Try Gemini (Native Google Gemini 1.5/2.0 Flash)
	if s.geminiKey != "" {
		geminiReq := dsReq
		geminiReq.Model = "gemini-1.5-flash"
		resp, err := s.callGemini(ctx, geminiReq)
		if err == nil && strings.TrimSpace(resp) != "" {
			return resp, nil
		}
		if err != nil {
			s.logger.Warn("Gemini call failed in callWithFallback", zap.Error(err))
			errs = append(errs, fmt.Sprintf("Gemini: %v", err))
		}
	} else {
		errs = append(errs, "Gemini: not configured")
	}

	return "", fmt.Errorf("all AI providers failed: %s", strings.Join(errs, " | "))
}


func (s *AIService) callDeepSeek(ctx context.Context, dsReq dto.DeepSeekRequest) (string, error) {
	if s.deepseekKey == "" {
		return "", fmt.Errorf("DeepSeek API key is not configured")
	}

	logger := s.getLogger(ctx)

	result, err := s.breaker.Execute(func() (interface{}, error) {
		jsonData, err := json.Marshal(dsReq)
		if err != nil {
			return "", err
		}

		req, err := http.NewRequestWithContext(ctx, "POST", s.deepseekURL+"/chat/completions", bytes.NewBuffer(jsonData))
		if err != nil {
			return "", err
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+s.deepseekKey)

		logger.Debug("Calling DeepSeek API", zap.String("model", dsReq.Model))

		resp, err := s.httpClient.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return "", fmt.Errorf("DeepSeek API returned status %d: %s", resp.StatusCode, string(body))
		}

		var dsResp dto.DeepSeekResponse
		if err := json.NewDecoder(resp.Body).Decode(&dsResp); err != nil {
			return "", err
		}

		if len(dsResp.Choices) > 0 {
			return dsResp.Choices[0].Message.Content, nil
		}

		return "", fmt.Errorf("DeepSeek returned an empty response")
	})

	if err != nil {
		logger.Error("DeepSeek API Call Failed", zap.Error(err))
		return "", err
	}

	return result.(string), nil
}

func (s *AIService) callGroq(ctx context.Context, dsReq dto.DeepSeekRequest) (string, error) {
	if s.groqKey == "" {
		return "", fmt.Errorf("Groq API key is not configured")
	}

	logger := s.getLogger(ctx)

	result, err := s.groqBreaker.Execute(func() (interface{}, error) {
		jsonData, err := json.Marshal(dsReq)
		if err != nil {
			return "", err
		}

		req, err := http.NewRequestWithContext(ctx, "POST", s.groqURL+"/chat/completions", bytes.NewBuffer(jsonData))
		if err != nil {
			return "", err
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+s.groqKey)

		logger.Debug("Calling Groq API", zap.String("model", dsReq.Model))

		resp, err := s.httpClient.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			// Auto-fallback from 70B to 8B on 429 Rate Limit
			if resp.StatusCode == http.StatusTooManyRequests && dsReq.Model != "llama-3.1-8b-instant" {
				logger.Warn("Groq 70B rate limited (429), attempting fast fallback to llama-3.1-8b-instant")
				fallbackReq := dsReq
				fallbackReq.Model = "llama-3.1-8b-instant"
				fallbackJson, errFb := json.Marshal(fallbackReq)
				if errFb == nil {
					reqFb, errFbReq := http.NewRequestWithContext(ctx, "POST", s.groqURL+"/chat/completions", bytes.NewBuffer(fallbackJson))
					if errFbReq == nil {
						reqFb.Header.Set("Content-Type", "application/json")
						reqFb.Header.Set("Authorization", "Bearer "+s.groqKey)
						respFb, errDo := s.httpClient.Do(reqFb)
						if errDo == nil {
							defer respFb.Body.Close()
							if respFb.StatusCode == http.StatusOK {
								var fbResp dto.DeepSeekResponse
								if errDecode := json.NewDecoder(respFb.Body).Decode(&fbResp); errDecode == nil && len(fbResp.Choices) > 0 {
									return fbResp.Choices[0].Message.Content, nil
								}
							}
						}
					}
				}
			}
			return "", fmt.Errorf("Groq API returned status %d: %s", resp.StatusCode, string(body))
		}

		var dsResp dto.DeepSeekResponse
		if err := json.NewDecoder(resp.Body).Decode(&dsResp); err != nil {
			return "", err
		}

		if len(dsResp.Choices) > 0 {
			return dsResp.Choices[0].Message.Content, nil
		}

		return "", fmt.Errorf("Groq returned an empty response")
	})

	if err != nil {
		logger.Error("Groq API Call Failed", zap.Error(err))
		return "", err
	}

	return result.(string), nil
}

func (s *AIService) callGemini(ctx context.Context, dsReq dto.DeepSeekRequest) (string, error) {
	if s.geminiKey == "" {
		return "", fmt.Errorf("Gemini API key is not configured")
	}

	logger := s.getLogger(ctx)

	result, err := s.geminiBreaker.Execute(func() (interface{}, error) {
		var systemPrompt string
		var userPrompt string
		for _, msg := range dsReq.Messages {
			if msg.Role == "system" {
				systemPrompt = msg.Content
			} else if msg.Role == "user" {
				userPrompt = msg.Content
			}
		}

		generationConfig := map[string]interface{}{
			"temperature":     dsReq.Temperature,
			"maxOutputTokens": dsReq.MaxTokens,
		}

		combinedText := strings.ToLower(userPrompt + " " + systemPrompt)
		if strings.Contains(combinedText, "json") || strings.Contains(combinedText, "output schema") {
			generationConfig["responseMimeType"] = "application/json"
		}

		payload := map[string]interface{}{
			"contents": []map[string]interface{}{
				{
					"parts": []map[string]interface{}{
						{
							"text": userPrompt,
						},
					},
				},
			},
			"generationConfig": generationConfig,
		}

		if systemPrompt != "" {
			payload["system_instruction"] = map[string]interface{}{
				"parts": []map[string]interface{}{
					{
						"text": systemPrompt,
					},
				},
			}
		}

		jsonData, err := json.Marshal(payload)
		if err != nil {
			return "", err
		}

		url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return "", err
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-goog-api-key", s.geminiKey)

		logger.Debug("Calling Native Gemini API", zap.String("model", "gemini-1.5-flash"))

		resp, err := s.httpClient.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return "", err
		}

		if resp.StatusCode != http.StatusOK {
			// Fallback to gemini-2.0-flash
			url2 := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
			req2, err2 := http.NewRequestWithContext(ctx, "POST", url2, bytes.NewBuffer(jsonData))
			if err2 == nil {
				req2.Header.Set("Content-Type", "application/json")
				req2.Header.Set("x-goog-api-key", s.geminiKey)
				resp2, errDo2 := s.httpClient.Do(req2)
				if errDo2 == nil {
					defer resp2.Body.Close()
					if resp2.StatusCode == http.StatusOK {
						body2, _ := io.ReadAll(resp2.Body)
						var geminiResp2 struct {
							Candidates []struct {
								Content struct {
									Parts []struct {
										Text string `json:"text"`
									} `json:"parts"`
								} `json:"content"`
							} `json:"candidates"`
						}
						if errUnmarshal2 := json.Unmarshal(body2, &geminiResp2); errUnmarshal2 == nil && len(geminiResp2.Candidates) > 0 && len(geminiResp2.Candidates[0].Content.Parts) > 0 {
							return geminiResp2.Candidates[0].Content.Parts[0].Text, nil
						}
					}
				}
			}
			return "", fmt.Errorf("Gemini API returned status %d: %s", resp.StatusCode, string(body))
		}

		var geminiResp struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}

		if err := json.Unmarshal(body, &geminiResp); err != nil {
			return "", err
		}

		if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
			return geminiResp.Candidates[0].Content.Parts[0].Text, nil
		}

		return "", fmt.Errorf("Gemini returned an empty or malformed candidate response")
	})

	if err != nil {
		logger.Error("Gemini API Call Failed", zap.Error(err))
		return "", err
	}

	return result.(string), nil
}
