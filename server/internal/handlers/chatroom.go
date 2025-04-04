package handlers

import (
	"awesomeChat/internal/informing"
	"awesomeChat/internal/myws"
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"awesomeChat/package/web"
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	"math/rand"
	"net/http"
	"strconv"
	"time"
)

const maxRooms = 1000

func ConnectToChatroom(c *gin.Context, db *sql.DB, rooms *map[int]*structures.Room) {
	chatNumber, _ := strconv.Atoi(c.Param("num"))
	username := c.Query("username")
	password := c.Query("password")
	logger.Log.Traceln(username + " wants to connect to room " + c.Param("num"))

	room, exists := (*rooms)[chatNumber]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room does not exists"})
		return
	}

	if !room.Open && room.Password != password {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Wrong password"})
		return
	}

	websocket, err := web.UpgradeConnection(c)
	if err != nil {
		logger.Log.Errorln("Error upgrading connection:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade connection"})
		return
	}

	users := &((*rooms)[chatNumber].Users)

	if len(*users) < room.MaxUsers {
		currentUser := structures.ChatUser{
			Name:       username,
			Connection: websocket,
		}
		*users = append(*users, &currentUser)
		logger.Log.Traceln(currentUser.Name + " added to room №" + strconv.Itoa(chatNumber))
	} else {
		logger.Log.Traceln("Too many users in the room")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Too many users in the room"})
		return
	}

	logger.Log.Traceln(fmt.Sprintf("Current amount of users in room %d: %d", chatNumber, len((*rooms)[chatNumber].Users)))
	informing.SetRoomName(room)
	informing.InformUserJoined(room, username)
	go myws.Reader(db, websocket, room, rooms)
}

func getRandomAvailableRoomNumber(rooms *map[int]*structures.Room, maxRooms int) int {
	for {
		rand.Seed(time.Now().UnixNano())
		randomRoom := rand.Intn(maxRooms)
		if _, ok := (*rooms)[randomRoom]; !ok {
			return randomRoom
		}
	}
}

func CreateChatroom(c *gin.Context, rooms *map[int]*structures.Room) {
	var req struct {
		Name            string   `json:"name"`
		Mode            string   `json:"mode"`
		SubType         string   `json:"subType"`
		Timer           int      `json:"timer"`
		MaxParticipants int      `json:"maxUsers"`
		Description     string   `json:"description"`
		Password        string   `json:"password"`
		Purpose         string   `json:"purpose"`
		KeyQuestions    []string `json:"keyQuestions"`
		Tags            []string `json:"tags"`
		Hidden          bool     `json:"hidden"`
		ExportOptions   []string `json:"exportOptions"`
		DontJoin        bool     `json:"dontJoin"`
		Topic           int      `json:"topic"`          // blitz
		Subtopic        int      `json:"subtopic"`       // blitz
		CustomTopic     string   `json:"customTopic"`    // free
		CustomSubtopic  string   `json:"customSubtopic"` // free
		Open            bool     `json:"open"`
		CreatorName     string   `json:"creatorName"`
	}

	if err := c.BindJSON(&req); err != nil {
		logger.Log.Errorf("Failed to bind request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	logger.Log.Traceln(req)

	if !req.Open && req.Password == "" {
		logger.Log.Errorf("Failed to bind request: Password is empty")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is empty"})
		return
	}

	if req.MaxParticipants <= 1 {
		req.MaxParticipants = 2
	}

	chatNumber := getRandomAvailableRoomNumber(rooms, maxRooms)
	//username := c.Query("username") // можно передавать имя пользователя как query-параметр

	//websocket, err := web.UpgradeConnection(c)
	//if err != nil {
	//	logger.Log.Errorln("Error upgrading connection:", err)
	//	c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade connection"})
	//	return
	//}

	//currentUser := structures.ChatUser{
	//	Name:       username,
	//	Connection: websocket,
	//}

	room := &structures.Room{
		ID:              chatNumber,
		Name:            req.Name,
		Open:            req.Open,
		Password:        req.Password,
		MaxUsers:        req.MaxParticipants,
		Mode:            req.Mode,
		SubType:         req.SubType,
		Description:     req.Description,
		Purpose:         req.Purpose,
		KeyQuestions:    req.KeyQuestions,
		Tags:            req.Tags,
		Hidden:          req.Hidden,
		ExportOptions:   req.ExportOptions,
		DontJoin:        req.DontJoin,
		Duration:        time.Duration(req.Timer) * time.Minute,
		ReadyUsers:      make(map[string]bool),
		AssignedTheses:  []string{},
		UserTheses:      make(map[string]string),
		CreatorUsername: req.CreatorName,
		Messages:        make([]structures.Message, 0),
		Participants:    make([]string, 0),
	}

	if req.Mode == "personal" && req.SubType == "blitz" {
		room.TopicID = req.Topic
		room.SubtopicID = req.Subtopic
	} else if req.Mode == "personal" && req.SubType == "free" {
		room.CustomTopic = req.CustomTopic
		room.CustomSubtopic = req.CustomSubtopic
	}

	(*rooms)[chatNumber] = room
	logger.Log.Traceln("Created room №" + strconv.Itoa(chatNumber))
	logger.Log.Traceln("room: ", room)
	//logger.Log.Traceln(currentUser.Name + " added to room")

	//informing.SetRoomName(room)
	//informing.InformUserJoined(room, username)
	//go myws.Reader(websocket, room, rooms)

	c.JSON(http.StatusOK, gin.H{"message": "Room created", "roomID": chatNumber, "wsUrl": "/ws/chat/" + strconv.Itoa(room.ID)})
}
