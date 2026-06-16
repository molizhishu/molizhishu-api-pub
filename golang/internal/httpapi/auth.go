package httpapi

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/store"
	"golang.org/x/crypto/bcrypt"
)

// login issues a short-lived admin token for the shared frontend.
func (h *Handler) login(c *gin.Context) {
	var payload struct{ Username, Password string }
	if !bindJSON(c, &payload) {
		return
	}
	user, err := h.repo.FindAdminByUsername(payload.Username)
	if err != nil || user == nil || !verifyPassword(user.PasswordHash, payload.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "账号或密码不正确"})
		return
	}
	token, expiresAt, err := h.repo.IssueToken(user, c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"token": token, "expiresAt": expiresAt.Format("2006-01-02 15:04:05"), "user": publicUser(user)}})
}

func (h *Handler) me(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": publicUser(c.MustGet("user").(*store.AdminUser))})
}

func (h *Handler) logout(c *gin.Context) {
	_ = h.repo.Logout(bearerToken(c))
	c.JSON(http.StatusOK, gin.H{"success": true, "data": true})
}

// authRequired protects local APIs while leaving health, login, and callback public.
func (h *Handler) authRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := h.repo.Authenticate(bearerToken(c))
		if err != nil || user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "请先登录"})
			c.Abort()
			return
		}
		c.Set("user", user)
		c.Next()
	}
}

func bearerToken(c *gin.Context) string {
	header := strings.TrimSpace(c.GetHeader("Authorization"))
	if len(header) < 8 || !strings.EqualFold(header[:7], "Bearer ") {
		return ""
	}
	return strings.TrimSpace(header[7:])
}

func verifyPassword(hash, password string) bool {
	if strings.HasPrefix(hash, "$2y$") {
		hash = "$2a$" + strings.TrimPrefix(hash, "$2y$")
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func publicUser(user *store.AdminUser) gin.H {
	return gin.H{"id": user.ID, "username": user.Username, "displayName": user.DisplayName, "role": user.Role}
}
