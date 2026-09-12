package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/substreamedu/substreamedu-media-service/internal/config"
	"github.com/substreamedu/substreamedu-media-service/internal/dto"
	"go.uber.org/zap"
)

var (
	sharedDeepSeekClient = &http.Client{
		Timeout:	60 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:		100,
			MaxIdleConnsPerHost:	10,
			IdleConnTimeout:	90 * time.Second,
		},
	}
)

type DeepSeekClient struct {
	cfg	*config.DeepSeekConfig
	logger	*zap.Logger
}

func NewDeepSeekClient(cfg *config.DeepSeekConfig, logger *zap.Logger) *DeepSeekClient {
	return &DeepSeekClient{
		cfg:	cfg,
		logger:	logger,
	}
}

func (c *DeepSeekClient) GenerateEducationalText(ctx context.Context, request dto.GenerateTextRequest) (string, error) {
	prompt := fmt.Sprintf(
		"Generate an educational text for language learning. Level: %s. Language: %s. Topic: %s. "+
			"The text should be engaging and appropriate for the level.",
		request.CefrLevel, request.Language, request.Topic)

	body := map[string]interface{}{
		"model":	"deepseek-chat",
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	jsonBody, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.deepseek.com/v1/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)

	resp, err := sharedDeepSeekClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("deepseek api error: %s", resp.Status)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Choices) == 0 {
		return "Failed to generate text.", nil
	}

	return result.Choices[0].Message.Content, nil
}
