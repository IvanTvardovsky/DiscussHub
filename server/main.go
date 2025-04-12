package main

import (
	"awesomeChat/internal/auth"
	"awesomeChat/internal/handlers"
	"awesomeChat/internal/myws"
	"awesomeChat/internal/structures"
	"awesomeChat/package/config"
	"awesomeChat/package/database"
	"awesomeChat/package/logger"
	"awesomeChat/package/web"
	"database/sql"
	"github.com/gin-gonic/gin"
	"io"
	"sort"
	"time"
)

func main() {
	logger.Log.Infoln("Sleeping 10s for database to start...")
	time.Sleep(10 * time.Second)
	cfg := config.GetConfig()
	db := database.InitPostgres(cfg)

	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
			logger.Log.Errorln("Error closing PG database: " + err.Error())
		}
	}(db)

	logger.Log.Infoln("Starting service...")
	router := gin.Default()
	gin.SetMode(gin.ReleaseMode)
	gin.DefaultWriter = io.Discard
	router.Use(web.CORSMiddleware())

	server := myws.NewWebSocketServer()
	var rooms = make(map[int]*structures.Room)

	logger.Log.Infoln("Serving handlers...")

	router.POST("/login", func(c *gin.Context) {
		handlers.Login(c, db)
	})
	router.GET("/logout", func(c *gin.Context) {
		//login(c, db) //todo
	})
	router.POST("/register", func(c *gin.Context) {
		handlers.Register(c, db)
	})
	router.GET("/ws/chat/:num", auth.AuthMiddleware(), func(c *gin.Context) {
		handlers.ConnectToChatroom(c, db, &rooms)
	})
	router.POST("/createChatroom/", auth.AuthMiddleware(), func(c *gin.Context) {
		handlers.CreateChatroom(c, &rooms)
	})
	router.GET("/roomUpdates", func(c *gin.Context) {
		server.HandleConnections(c.Writer, c.Request, &rooms)
	})
	router.POST("/rate/final", auth.AuthMiddleware(), func(c *gin.Context) {
		handlers.RateOpponent(c, db)
	})
	router.GET("/discussion/:id", auth.AuthMiddleware(), func(c *gin.Context) {
		handlers.GetDiscussionByID(c, db)
	})
	router.GET("/discussion/:id/export/csv", auth.AuthMiddleware(), func(c *gin.Context) {
		handlers.GetDiscussionCSVByID(c, db)
	})
	router.GET("/discussion/:id/export/graph", auth.AuthMiddleware(), func(c *gin.Context) {
		handlers.GetDiscussionGraphByID(c, db)
	})
	router.GET("/archive", auth.AuthMiddleware(), func(c *gin.Context) {
		handlers.GetArchives(c, db)
	})
	router.GET("/profile", auth.AuthMiddleware(), func(c *gin.Context) {
		handlers.GetProfile(c, db)
	})
	router.GET("/leaderboard", auth.AuthMiddleware(), func(c *gin.Context) {
		handlers.GetLeaderboard(c, db)
	})

	go server.HandleMessages()
	go func() {
		for {
			time.Sleep(5 * time.Second)
			roomsToSend := *structures.MakeRoomList(&rooms)
			sort.Slice(roomsToSend, func(i, j int) bool {
				return (roomsToSend)[i].ID < (roomsToSend)[j].ID
			})
			logger.Log.Traceln("Room update 5s: ", roomsToSend)
			server.Broadcast <- roomsToSend
		}
	}()

	logger.Log.Info("Starting router...")
	logger.Log.Trace("On port :" + cfg.Listen.Port)
	logger.Log.Fatal(router.Run(":" + cfg.Listen.Port))
}
