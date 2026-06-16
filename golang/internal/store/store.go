package store

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct{ db *gorm.DB }

func Open(dsn string) (*Repository, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	return &Repository{db: db}, nil
}

func (r *Repository) SaveSubmitted(request JSONMap, response JSONMap) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		taskID, _ := response["taskId"].(string)
		if taskID == "" {
			return errors.New("missing taskId in response")
		}
		task := Task{
			TaskID: taskID, Status: str(response["status"], "pending"),
			PromptsJSON: toArray(request["prompts"]), PlatformsJSON: toArray(request["platforms"]), RegionCodeJSON: toArray(request["regionCode"]),
			CallbackURL: ptrString(response["callbackUrl"]), TotalItems: intValue(response["totalTask"], intValue(response["totalItems"], 0)),
			PollURL: ptrString(response["pollUrl"]), RawRequestJSON: request, RawResponseJSON: response,
			CreatedLocalAt: time.Now(), UpdatedAt: time.Now(),
		}
		if err := tx.Clauses(clause.OnConflict{UpdateAll: true}).Create(&task).Error; err != nil {
			return err
		}
		return upsertSubtasks(tx, taskID, toArray(response["subTaskList"]))
	})
}

func (r *Repository) SaveRemoteResult(payload JSONMap) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		taskID, _ := payload["taskId"].(string)
		if taskID == "" {
			return errors.New("missing taskId")
		}
		task := Task{
			TaskID: taskID, Status: str(payload["status"], "processing"), TotalItems: intValue(payload["totalItems"], 0),
			CompletedItems: intValue(payload["completedItems"], 0), FailedItems: intValue(payload["failedItems"], 0),
			RemoteCreatedAt: ptrInt64(payload["createdAt"]), CompletedAt: ptrInt64(payload["completedAt"]),
			PromptsJSON: JSONArray{}, PlatformsJSON: JSONArray{}, RegionCodeJSON: JSONArray{},
			RawRequestJSON: JSONMap{}, RawResponseJSON: payload, UpdatedAt: time.Now(), CreatedLocalAt: time.Now(),
		}
		if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "task_id"}}, DoUpdates: clause.AssignmentColumns([]string{"status", "total_items", "completed_items", "failed_items", "created_at", "completed_at", "raw_response_json", "updated_at"})}).Create(&task).Error; err != nil {
			return err
		}
		return upsertSubtasks(tx, taskID, toArray(payload["subTaskList"]))
	})
}

func (r *Repository) SaveCallback(payload JSONMap) (bool, error) {
	taskID, _ := payload["taskId"].(string)
	if taskID == "" {
		return false, errors.New("missing taskId")
	}
	raw, _ := json.Marshal(payload)
	hashBytes := sha256.Sum256(raw)
	event := CallbackEvent{TaskID: taskID, PayloadJSON: payload, PayloadHash: hex.EncodeToString(hashBytes[:]), ProcessStatus: "processed", ReceivedAt: time.Now()}
	now := time.Now()
	event.ProcessedAt = &now
	err := r.db.Create(&event).Error
	if err != nil {
		return true, nil
	}
	return false, r.SaveRemoteResult(payload)
}

func (r *Repository) ListTasks(page, size int, status string) ([]Task, int64, error) {
	var rows []Task
	var total int64
	q := r.db.Model(&Task{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("created_local_at DESC").Limit(size).Offset((page - 1) * size).Find(&rows).Error
	return rows, total, err
}

func (r *Repository) GetTask(taskID string) (*Task, error) {
	var task Task
	err := r.db.Preload("Subtasks").First(&task, "task_id = ?", taskID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &task, err
}

func (r *Repository) GetCallbackEvents(taskID string) ([]CallbackEvent, error) {
	var rows []CallbackEvent
	err := r.db.Where("task_id = ?", taskID).Order("received_at DESC").Limit(20).Find(&rows).Error
	return rows, err
}

func (r *Repository) UnfinishedTaskIDs(limit int) ([]string, error) {
	if limit <= 0 {
		limit = 20
	}
	var rows []struct {
		TaskID string `gorm:"column:task_id"`
	}
	err := r.db.Raw(`
		SELECT t.task_id
		FROM geo_tasks t
		LEFT JOIN geo_subtasks s ON s.task_id = t.task_id
		WHERE t.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped')
			OR s.subtask_id IS NULL
			OR s.status IS NULL
			OR s.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped')
			OR (
				t.status IN ('completed', 'partial_completed')
				AND s.status = 'completed'
				AND (s.answer_content IS NULL OR s.answer_content = '')
			)
		GROUP BY t.task_id
		ORDER BY MIN(t.created_local_at) ASC
		LIMIT ?
	`, limit).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.TaskID)
	}
	return ids, nil
}

func (r *Repository) FindAdminByUsername(username string) (*AdminUser, error) {
	var user AdminUser
	err := r.db.First(&user, "username = ? AND status = 1", strings.TrimSpace(username)).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &user, err
}

func (r *Repository) IssueToken(user *AdminUser, ip string) (string, time.Time, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", time.Time{}, err
	}
	token := hex.EncodeToString(tokenBytes)
	hashBytes := sha256.Sum256([]byte(token))
	hash := hex.EncodeToString(hashBytes[:])
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	err := r.db.Model(&AdminUser{}).Where("id = ?", user.ID).Updates(map[string]any{
		"auth_token_hash":  hash,
		"token_expires_at": expiresAt,
		"last_login_at":    time.Now(),
		"last_login_ip":    ip,
	}).Error
	return token, expiresAt, err
}

func (r *Repository) Authenticate(token string) (*AdminUser, error) {
	if strings.TrimSpace(token) == "" {
		return nil, nil
	}
	hashBytes := sha256.Sum256([]byte(strings.TrimSpace(token)))
	hash := hex.EncodeToString(hashBytes[:])
	var user AdminUser
	err := r.db.First(&user, "auth_token_hash = ? AND status = 1", hash).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if user.TokenExpiresAt == nil || user.TokenExpiresAt.Before(time.Now()) {
		return nil, nil
	}
	return &user, nil
}

func (r *Repository) Logout(token string) error {
	user, err := r.Authenticate(token)
	if err != nil || user == nil {
		return err
	}
	return r.db.Model(&AdminUser{}).Where("id = ?", user.ID).Updates(map[string]any{
		"auth_token_hash":  nil,
		"token_expires_at": nil,
	}).Error
}

func upsertSubtasks(tx *gorm.DB, taskID string, rows JSONArray) error {
	for _, item := range rows {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		id, _ := m["subTaskId"].(string)
		if id == "" {
			continue
		}
		sub := Subtask{
			SubtaskID: id, TaskID: taskID, Platform: ptrString(m["platform"]), Mode: ptrString(m["mode"]), Prompt: ptrString(m["prompt"]),
			Status: ptrString(m["status"]), Time: ptrInt64(m["time"]), PageScreenshot: ptrString(m["pageScreenshot"]),
			AnswerContent: ptrString(m["answerContent"]), ReferenceListJSON: toArray(m["referenceList"]), CitationListJSON: toArray(m["citationList"]),
			ReasoningProcessJSON: toMap(m["reasoningProcess"]), RecommendedQuestionsJSON: toArray(m["recommendedQuestions"]), MediaContentJSON: toArray(m["mediaContent"]),
			ErrorMessage: ptrString(m["errorMessage"]), ProxyIP: ptrString(m["proxyIp"]), RawResultJSON: JSONMap(m), UpdatedAt: time.Now(),
		}
		if err := tx.Clauses(clause.OnConflict{UpdateAll: true}).Create(&sub).Error; err != nil {
			return err
		}
	}
	return nil
}
