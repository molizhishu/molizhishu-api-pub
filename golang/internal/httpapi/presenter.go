package httpapi

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/store"
)

func jsonString(v any) string {
	raw, err := json.Marshal(v)
	if err != nil || raw == nil {
		return "null"
	}
	return string(raw)
}

func taskForFrontend(task store.Task) gin.H {
	return gin.H{
		"task_id": task.TaskID, "status": task.Status, "prompts_json": jsonString(task.PromptsJSON),
		"platforms_json": jsonString(task.PlatformsJSON), "region_code_json": jsonString(task.RegionCodeJSON),
		"callback_url": task.CallbackURL, "total_items": task.TotalItems, "completed_items": task.CompletedItems,
		"failed_items": task.FailedItems, "poll_url": task.PollURL, "created_at": task.RemoteCreatedAt,
		"completed_at": task.CompletedAt, "raw_request_json": jsonString(task.RawRequestJSON),
		"raw_response_json": jsonString(task.RawResponseJSON), "last_error": task.LastError,
		"created_local_at": task.CreatedLocalAt, "updated_at": task.UpdatedAt,
	}
}

func taskDetailForFrontend(task store.Task, events []store.CallbackEvent) gin.H {
	result := taskForFrontend(task)
	subtasks := make([]gin.H, 0, len(task.Subtasks))
	for _, item := range task.Subtasks {
		subtasks = append(subtasks, gin.H{
			"subtask_id": item.SubtaskID, "task_id": item.TaskID, "platform": item.Platform, "mode": item.Mode,
			"prompt": item.Prompt, "status": item.Status, "time": item.Time, "page_screenshot": item.PageScreenshot,
			"answer_content": item.AnswerContent, "reference_list_json": jsonString(item.ReferenceListJSON),
			"citation_list_json": jsonString(item.CitationListJSON), "reasoning_process_json": jsonString(item.ReasoningProcessJSON),
			"recommended_questions_json": jsonString(item.RecommendedQuestionsJSON), "media_content_json": jsonString(item.MediaContentJSON),
			"error_message": item.ErrorMessage, "proxy_ip": item.ProxyIP, "raw_result_json": jsonString(item.RawResultJSON), "updated_at": item.UpdatedAt,
		})
	}
	callbackEvents := make([]gin.H, 0, len(events))
	for _, event := range events {
		callbackEvents = append(callbackEvents, gin.H{
			"id": event.ID, "task_id": event.TaskID, "payload_json": jsonString(event.PayloadJSON),
			"payload_hash": event.PayloadHash, "process_status": event.ProcessStatus,
			"error_message": event.ErrorMessage, "received_at": event.ReceivedAt, "processed_at": event.ProcessedAt,
		})
	}
	result["subTaskList"] = subtasks
	result["callbackEvents"] = callbackEvents
	return result
}
