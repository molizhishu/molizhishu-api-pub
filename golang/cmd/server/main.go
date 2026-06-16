package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/config"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/httpapi"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/molizhishu"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/store"
	"github.com/molizhishu/molizhishu-api-pub-golang/internal/syncer"
)

func main() {
	cfg := config.Load()
	if cfg.DatabaseDSN == "" {
		log.Fatal("DATABASE_DSN 未配置")
	}

	repo, err := store.Open(cfg.DatabaseDSN)
	if err != nil {
		log.Fatal(err)
	}

	client := molizhishu.New(cfg.BaseURL, cfg.CityURL, cfg.Token, cfg.Timeout)
	taskSync := syncer.New(client, repo)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if cfg.SyncEnabled {
		go taskSync.Run(ctx, cfg.SyncInterval, cfg.SyncLimit)
	}

	r := gin.Default()
	if err := r.SetTrustedProxies(nil); err != nil {
		log.Fatal(err)
	}
	httpapi.New(cfg, client, repo, taskSync).Register(r)

	log.Printf("molizhishu-api-pub-golang listening on :%s", cfg.AppPort)
	if err := r.Run(":" + cfg.AppPort); err != nil {
		log.Fatal(err)
	}
}
