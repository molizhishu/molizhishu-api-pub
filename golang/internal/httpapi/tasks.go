package httpapi

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/store"
)

// createTask validates frontend input, submits a remote task, and stores the initial snapshot.
func (h *Handler) createTask(c *gin.Context) {
	var payload map[string]any
	if !bindJSON(c, &payload) {
		return
	}
	if err := validateSubmitPayload(payload); err != "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"success": false, "message": err})
		return
	}
	if _, ok := payload["callbackUrl"].(string); !ok && h.cfg.CallbackURL != "" {
		payload["callbackUrl"] = h.cfg.CallbackURL
	}

	data, err := h.client.SubmitTask(payload)
	if respondError(c, err) {
		return
	}
	if err := h.repo.SaveSubmitted(store.JSONMap(payload), store.JSONMap(data)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *Handler) listTasks(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	if size > 100 {
		size = 100
	}
	rows, total, err := h.repo.ListTasks(page, size, c.Query("status"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	items := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		items = append(items, taskForFrontend(row))
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"items": items, "total": total, "page": page, "size": size}})
}

func (h *Handler) getTask(c *gin.Context) {
	task, err := h.repo.GetTask(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if task == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "任务不存在"})
		return
	}
	events, err := h.repo.GetCallbackEvents(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": taskDetailForFrontend(*task, events)})
}

func (h *Handler) syncTask(c *gin.Context) {
	data, err := h.taskSync.SyncOne(c.Param("taskId"), "local-api:manual-compensation")
	if respondError(c, err) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *Handler) stopTask(c *gin.Context) {
	message, err := h.client.StopTask(c.Param("taskId"))
	if respondError(c, err) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"message": message}})
}

func validateSubmitPayload(payload map[string]any) string {
	if prompts, ok := payload["prompts"].([]any); !ok || len(prompts) == 0 {
		return "prompts 必须是非空数组"
	} else if len(prompts) > 50 {
		return "prompts 最多 50 个"
	}
	platforms, ok := payload["platforms"].([]any)
	if !ok || len(platforms) == 0 {
		return "platforms 必须是非空数组"
	}
	for _, item := range platforms {
		row, ok := item.(map[string]any)
		if !ok || row["platform"] == nil || row["mode"] == nil {
			return "platforms 每一项必须包含 platform 和 mode"
		}
	}
	return ""
}
