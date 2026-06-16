package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/molizhishu"
)

func bindJSON(c *gin.Context, target any) bool {
	if err := c.ShouldBindJSON(target); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "JSON 格式错误"})
		return false
	}
	return true
}

func respondError(c *gin.Context, err error) bool {
	if err == nil {
		return false
	}
	if apiErr, ok := err.(molizhishu.APIError); ok {
		status := http.StatusBadGateway
		if apiErr.HTTPStatus >= 400 {
			status = apiErr.HTTPStatus
		}
		c.JSON(status, gin.H{"success": false, "code": apiErr.Code, "message": apiErr.Message})
		return true
	}
	c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
	return true
}
