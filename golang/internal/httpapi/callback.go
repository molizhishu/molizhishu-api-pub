package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/store"
)

// callback records Molizhishu push payloads idempotently.
func (h *Handler) callback(c *gin.Context) {
	var payload map[string]any
	if !bindJSON(c, &payload) {
		return
	}
	if payload["taskId"] == nil || payload["status"] == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "taskId 和 status 必填"})
		return
	}
	duplicate, err := h.repo.SaveCallback(store.JSONMap(payload))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"duplicate": duplicate}})
}

func (h *Handler) getCallbackURL(c *gin.Context) {
	data, err := h.client.GetCallbackURL()
	if !respondError(c, err) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
	}
}

func (h *Handler) updateCallbackURL(c *gin.Context) {
	var payload struct {
		CallbackURL *string `json:"callbackUrl"`
	}
	if !bindJSON(c, &payload) {
		return
	}
	data, err := h.client.UpdateCallbackURL(payload.CallbackURL)
	if !respondError(c, err) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
	}
}

func (h *Handler) cities(c *gin.Context) {
	data, err := h.client.GetCities()
	if !respondError(c, err) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
	}
}
