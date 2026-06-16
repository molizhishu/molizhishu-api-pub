package httpapi

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) settings(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"apiKey":   mask(h.cfg.Token),
		"security": gin.H{"apiKeyUpdateAllowed": h.cfg.AllowAPIKeyUpdate},
	}})
}

func (h *Handler) updateAPIKey(c *gin.Context) {
	if !h.cfg.AllowAPIKeyUpdate {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "当前环境禁止在页面修改 API Key"})
		return
	}
	c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Go demo 未启用运行时写入 .env，请通过服务端环境变量配置 API Key"})
}

func mask(value string) gin.H {
	value = strings.TrimSpace(value)
	if value == "" {
		return gin.H{"configured": false, "masked": nil, "last4": nil}
	}
	last4 := value
	if len(value) > 4 {
		last4 = value[len(value)-4:]
	}
	return gin.H{"configured": true, "masked": strings.Repeat("*", max(8, len(value)-4)) + last4, "last4": last4}
}
