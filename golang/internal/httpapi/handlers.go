package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/config"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/molizhishu"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/store"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/syncer"
)

type Handler struct {
	cfg      config.Config
	client   *molizhishu.Client
	repo     *store.Repository
	taskSync *syncer.Service
}

func New(cfg config.Config, client *molizhishu.Client, repo *store.Repository, taskSync *syncer.Service) *Handler {
	return &Handler{cfg: cfg, client: client, repo: repo, taskSync: taskSync}
}

func (h *Handler) Register(r *gin.Engine) {
	r.GET("/", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>模力指数 Go API Demo</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #18231f; background: #f6faf8; }
    main { max-width: 760px; margin: 12vh auto; padding: 0 24px; }
    section { background: #fff; border: 1px solid #dce9e2; border-radius: 12px; padding: 28px; box-shadow: 0 18px 45px rgba(18, 82, 56, .08); }
    h1 { margin: 0 0 12px; font-size: 26px; color: #148a5c; }
    p { margin: 8px 0; line-height: 1.7; color: #56645f; }
    a { color: #148a5c; text-decoration: none; font-weight: 600; }
    code { background: #edf7f2; color: #146948; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>模力指数 Go API Demo</h1>
      <p>服务已启动，当前端口提供后端 API，不包含公共前端页面。</p>
      <p>健康检查：<a href="/api/health">/api/health</a></p>
      <p>默认接口前缀：<code>/api</code></p>
      <p>公共前端需要单独启动，并将 API 地址指向当前服务。</p>
    </section>
  </main>
</body>
</html>`)
	})
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"service": "molizhishu-api-pub-golang", "status": "ok"}})
	})
	r.POST("/api/auth/login", h.login)
	r.POST("/webhooks/molizhishu", h.callback)

	api := r.Group("/api", h.authRequired())
	api.GET("/auth/me", h.me)
	api.POST("/auth/logout", h.logout)
	api.POST("/tasks", h.createTask)
	api.GET("/tasks", h.listTasks)
	api.GET("/tasks/:taskId", h.getTask)
	api.POST("/tasks/:taskId/sync", h.syncTask)
	api.PUT("/tasks/:taskId/stop", h.stopTask)
	api.GET("/callback-url", h.getCallbackURL)
	api.PUT("/callback-url", h.updateCallbackURL)
	api.GET("/cities", h.cities)
	api.GET("/settings", h.settings)
	api.PUT("/settings/api-key", h.updateAPIKey)
}
