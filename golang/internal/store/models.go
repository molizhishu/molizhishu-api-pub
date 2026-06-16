package store

import "time"

// Task is the local persisted master task record.
type Task struct {
	TaskID          string    `gorm:"column:task_id;primaryKey" json:"taskId"`
	Status          string    `json:"status"`
	PromptsJSON     JSONArray `gorm:"column:prompts_json" json:"prompts"`
	PlatformsJSON   JSONArray `gorm:"column:platforms_json" json:"platforms"`
	RegionCodeJSON  JSONArray `gorm:"column:region_code_json" json:"regionCode"`
	CallbackURL     *string   `gorm:"column:callback_url" json:"callbackUrl"`
	TotalItems      int       `gorm:"column:total_items" json:"totalItems"`
	CompletedItems  int       `gorm:"column:completed_items" json:"completedItems"`
	FailedItems     int       `gorm:"column:failed_items" json:"failedItems"`
	PollURL         *string   `gorm:"column:poll_url" json:"pollUrl"`
	RemoteCreatedAt *int64    `gorm:"column:created_at" json:"createdAt"`
	CompletedAt     *int64    `gorm:"column:completed_at" json:"completedAt"`
	RawRequestJSON  JSONMap   `gorm:"column:raw_request_json" json:"rawRequest"`
	RawResponseJSON JSONMap   `gorm:"column:raw_response_json" json:"rawResponse"`
	LastError       *string   `gorm:"column:last_error" json:"lastError"`
	CreatedLocalAt  time.Time `gorm:"column:created_local_at" json:"createdLocalAt"`
	UpdatedAt       time.Time `gorm:"column:updated_at" json:"updatedAt"`
	Subtasks        []Subtask `gorm:"foreignKey:TaskID" json:"subTaskList,omitempty"`
}

func (Task) TableName() string { return "geo_tasks" }

// Subtask stores platform-level task status and final answer fields.
type Subtask struct {
	SubtaskID                string    `gorm:"column:subtask_id;primaryKey" json:"subTaskId"`
	TaskID                   string    `gorm:"column:task_id" json:"taskId"`
	Platform                 *string   `json:"platform"`
	Mode                     *string   `json:"mode"`
	Prompt                   *string   `json:"prompt"`
	Status                   *string   `json:"status"`
	Time                     *int64    `json:"time"`
	PageScreenshot           *string   `gorm:"column:page_screenshot" json:"pageScreenshot"`
	AnswerContent            *string   `gorm:"column:answer_content" json:"answerContent"`
	ReferenceListJSON        JSONArray `gorm:"column:reference_list_json" json:"referenceList"`
	CitationListJSON         JSONArray `gorm:"column:citation_list_json" json:"citationList"`
	ReasoningProcessJSON     JSONMap   `gorm:"column:reasoning_process_json" json:"reasoningProcess"`
	RecommendedQuestionsJSON JSONArray `gorm:"column:recommended_questions_json" json:"recommendedQuestions"`
	MediaContentJSON         JSONArray `gorm:"column:media_content_json" json:"mediaContent"`
	ErrorMessage             *string   `gorm:"column:error_message" json:"errorMessage"`
	ProxyIP                  *string   `gorm:"column:proxy_ip" json:"proxyIp"`
	RawResultJSON            JSONMap   `gorm:"column:raw_result_json" json:"rawResult"`
	UpdatedAt                time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (Subtask) TableName() string { return "geo_subtasks" }

// CallbackEvent records every callback payload for audit and idempotency checks.
type CallbackEvent struct {
	ID            uint64     `json:"id"`
	TaskID        string     `gorm:"column:task_id" json:"taskId"`
	PayloadJSON   JSONMap    `gorm:"column:payload_json" json:"payload"`
	PayloadHash   string     `gorm:"column:payload_hash" json:"payloadHash"`
	ProcessStatus string     `gorm:"column:process_status" json:"processStatus"`
	ErrorMessage  *string    `gorm:"column:error_message" json:"errorMessage"`
	ReceivedAt    time.Time  `gorm:"column:received_at" json:"receivedAt"`
	ProcessedAt   *time.Time `gorm:"column:processed_at" json:"processedAt"`
}

func (CallbackEvent) TableName() string { return "geo_callback_events" }

// AdminUser is the local admin account used by the shared frontend login flow.
type AdminUser struct {
	ID             uint64     `json:"id"`
	Username       string     `json:"username"`
	PasswordHash   string     `gorm:"column:password_hash" json:"-"`
	DisplayName    string     `gorm:"column:display_name" json:"displayName"`
	Role           string     `json:"role"`
	Status         int        `json:"status"`
	AuthTokenHash  *string    `gorm:"column:auth_token_hash" json:"-"`
	TokenExpiresAt *time.Time `gorm:"column:token_expires_at" json:"-"`
	LastLoginAt    *time.Time `gorm:"column:last_login_at" json:"lastLoginAt"`
	LastLoginIP    *string    `gorm:"column:last_login_ip" json:"lastLoginIp"`
}

func (AdminUser) TableName() string { return "geo_admin_users" }
