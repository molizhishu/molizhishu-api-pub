package syncer

import (
	"context"
	"log"
	"time"

	"github.com/molizhishu/molizhishu-api-pub-golang/internal/molizhishu"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/store"
)

// Service synchronizes local task records with Molizhishu remote APIs.
//
// It is trigger-agnostic: the same service is used by the background ticker and
// the manual compensation endpoint, so persistence rules stay consistent.
type Service struct {
	client *molizhishu.Client
	repo   *store.Repository
}

// Summary describes one compensation pass.
type Summary struct {
	Total  int
	Synced int
	Failed int
}

// New creates a task synchronization service.
func New(client *molizhishu.Client, repo *store.Repository) *Service {
	return &Service{client: client, repo: repo}
}

// Run starts the in-process background compensation loop.
//
// The loop uses time.Ticker because Go services are long-running processes. PHP
// uses a separate worker container, but Go can keep this scheduler inside the
// API process.
func (s *Service) Run(ctx context.Context, interval time.Duration, limit int) {
	if interval <= 0 {
		interval = time.Minute
	}
	if limit <= 0 {
		limit = 20
	}

	log.Printf("[sync] background sync started interval=%s limit=%d", interval, limit)
	s.syncAndLog(limit, "golang-sync-loop")

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("[sync] background sync stopped")
			return
		case <-ticker.C:
			s.syncAndLog(limit, "golang-sync-loop")
		}
	}
}

// SyncUnfinished synchronizes a bounded batch of unfinished or incomplete tasks.
func (s *Service) SyncUnfinished(limit int, source string) Summary {
	taskIDs, err := s.repo.UnfinishedTaskIDs(limit)
	if err != nil {
		log.Printf("[sync] source=%s failed=true error=%q", source, err.Error())
		return Summary{Failed: 1}
	}

	summary := Summary{Total: len(taskIDs)}
	for _, taskID := range taskIDs {
		if _, err := s.SyncOne(taskID, source); err != nil {
			summary.Failed++
			log.Printf("[sync] source=%s task_id=%s failed=true error=%q", source, taskID, err.Error())
			continue
		}
		summary.Synced++
	}
	return summary
}

// SyncOne fetches status for one task and persists the latest snapshot.
//
// When the master task is terminal, or when any subtask is already terminal,
// the result endpoint is also fetched. This preserves partial results before
// the entire master task completes.
func (s *Service) SyncOne(taskID string, source string) (map[string]any, error) {
	started := time.Now()
	status, err := s.client.GetTaskStatus(taskID, source+":status")
	if err != nil {
		return nil, err
	}
	if err := s.repo.SaveRemoteResult(store.JSONMap(status)); err != nil {
		return nil, err
	}

	data := status
	fetchResult := terminalStatus(status["status"]) || hasCompletedItems(status)
	if fetchResult {
		result, err := s.client.GetTaskResult(taskID, source+":result")
		if err != nil {
			return nil, err
		}
		if err := s.repo.SaveRemoteResult(store.JSONMap(result)); err != nil {
			return nil, err
		}
		data = result
	}

	log.Printf(
		"[sync] source=%s task_id=%s status=%s fetch_result=%t duration=%dms",
		source,
		taskID,
		stringValue(status["status"], "unknown"),
		fetchResult,
		time.Since(started).Milliseconds(),
	)
	return data, nil
}

func (s *Service) syncAndLog(limit int, source string) {
	summary := s.SyncUnfinished(limit, source)
	log.Printf("[sync] source=%s total=%d synced=%d failed=%d", source, summary.Total, summary.Synced, summary.Failed)
}

func terminalStatus(v any) bool {
	switch stringValue(v, "") {
	case "completed", "partial_completed", "failed", "stopped":
		return true
	default:
		return false
	}
}

func hasCompletedItems(status map[string]any) bool {
	if intValue(status["completedItems"]) > 0 {
		return true
	}
	rows, ok := status["subTaskList"].([]any)
	if !ok {
		return false
	}
	for _, item := range rows {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if terminalStatus(m["status"]) {
			return true
		}
	}
	return false
}

func stringValue(v any, fallback string) string {
	if value, ok := v.(string); ok && value != "" {
		return value
	}
	return fallback
}

func intValue(v any) int {
	switch value := v.(type) {
	case float64:
		return int(value)
	case int:
		return value
	case int64:
		return int(value)
	default:
		return 0
	}
}
