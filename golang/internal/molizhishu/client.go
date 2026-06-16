package molizhishu

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	cityURL string
	token   string
	http    *http.Client
}

type APIError struct {
	Message    string
	Code       *int
	HTTPStatus int
	Body       string
}

func (e APIError) Error() string { return e.Message }

func New(baseURL, cityURL, token string, timeout time.Duration) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		cityURL: cityURL,
		token:   token,
		http:    &http.Client{Timeout: timeout},
	}
}

func (c *Client) SubmitTask(payload map[string]any) (map[string]any, error) {
	return c.request(http.MethodPost, "/task/batch/shared", payload, "local-api:submit-task", false)
}

func (c *Client) GetTaskStatus(taskID string, source string) (map[string]any, error) {
	return c.request(http.MethodGet, "/task/status/"+taskID, nil, source, false)
}

func (c *Client) GetTaskResult(taskID string, source string) (map[string]any, error) {
	return c.request(http.MethodGet, "/task/result/"+taskID, nil, source, false)
}

func (c *Client) StopTask(taskID string) (any, error) {
	data, err := c.request(http.MethodPut, "/task/"+taskID+"/stop", nil, "local-api:stop-task", false)
	if err != nil {
		return nil, err
	}
	return data["value"], nil
}

func (c *Client) GetCallbackURL() (any, error) {
	data, err := c.request(http.MethodGet, "/task/callback-url", nil, "local-api:callback-url:get", false)
	if err != nil {
		return nil, err
	}
	return data["value"], nil
}

func (c *Client) UpdateCallbackURL(callbackURL *string) (any, error) {
	payload := map[string]any{"callbackUrl": callbackURL}
	data, err := c.request(http.MethodPut, "/task/callback-url", payload, "local-api:callback-url:update", false)
	if err != nil {
		return nil, err
	}
	return data["value"], nil
}

func (c *Client) GetCities() (any, error) {
	data, err := c.request(http.MethodGet, c.cityURL, nil, "local-api:cities", true)
	if err != nil {
		return nil, err
	}
	return data["value"], nil
}

func (c *Client) request(method, pathOrURL string, payload map[string]any, source string, absolute bool) (map[string]any, error) {
	if c.token == "" {
		return nil, APIError{Message: "MOLIZHISHU_TOKEN 未配置"}
	}

	url := pathOrURL
	if !absolute {
		url = c.baseURL + pathOrURL
	}

	var body io.Reader
	if payload != nil {
		raw, _ := json.Marshal(payload)
		body = bytes.NewReader(raw)
	}

	started := time.Now()
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.http.Do(req)
	if err != nil {
		log.Printf("[molizhishu] source=%s method=%s url=%s http_status=0 success=false code=null message=%q duration=%dms", source, method, url, err.Error(), time.Since(started).Milliseconds())
		return nil, APIError{Message: "模力指数接口网络异常：" + err.Error()}
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var envelope struct {
		Success bool            `json:"success"`
		Code    *int            `json:"code"`
		Message string          `json:"message"`
		Data    json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return nil, APIError{Message: "模力指数接口返回非 JSON", HTTPStatus: resp.StatusCode, Body: string(raw)}
	}

	log.Printf("[molizhishu] source=%s method=%s url=%s http_status=%d success=%t code=%v message=%q duration=%dms", source, method, url, resp.StatusCode, envelope.Success, envelope.Code, envelope.Message, time.Since(started).Milliseconds())

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, APIError{Message: fmt.Sprintf("模力指数 HTTP 异常：%d", resp.StatusCode), Code: envelope.Code, HTTPStatus: resp.StatusCode, Body: string(raw)}
	}
	if !envelope.Success {
		msg := envelope.Message
		if msg == "" {
			msg = "模力指数业务处理失败"
		}
		return nil, APIError{Message: msg, Code: envelope.Code, HTTPStatus: resp.StatusCode, Body: string(raw)}
	}

	var data any
	if len(envelope.Data) > 0 && string(envelope.Data) != "null" {
		_ = json.Unmarshal(envelope.Data, &data)
	}
	if object, ok := data.(map[string]any); ok {
		return object, nil
	}
	return map[string]any{"value": data}, nil
}
