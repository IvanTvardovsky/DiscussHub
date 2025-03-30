package handlers

import (
	"awesomeChat/internal/informing"
	"awesomeChat/internal/myws"
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"awesomeChat/package/web"
	"fmt"
	"github.com/gin-gonic/gin"
	"math/rand"
	"net/http"
	"strconv"
	"time"
)

const maxRooms = 1000

func ConnectToChatroom(c *gin.Context, rooms *map[int]*structures.Room) {
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
	go myws.Reader(websocket, room, rooms)
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
	//todo вынести забор аргументов в функцию?
	username := c.Query("username")
	roomname := c.Query("roomname")
	open, err := strconv.ParseBool(c.Query("open"))
	if err != nil {
		//todo
	}
	password := c.Query("password")
	maxUsers, err := strconv.Atoi(c.Query("maxUsers"))
	if err != nil {
		//todo
	}
	if maxUsers <= 1 {
		maxUsers = 2
	}
	subtopic := c.Query("subtopic")
	subtopicID, err := strconv.Atoi(subtopic)
	if err != nil {
		//todo
	}
	topic := c.Query("topic")
	topicID, err := strconv.Atoi(topic)
	if err != nil {
		//todo
	}

	chatNumber := getRandomAvailableRoomNumber(rooms, maxRooms)

	logger.Log.Traceln(fmt.Sprintf("%s wants to connect to room %d", username, chatNumber))

	room, exists := (*rooms)[chatNumber]
	if exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room already exists"})
		return
	}

	if !open && password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is empty"})
		return
	}

	websocket, err := web.UpgradeConnection(c)
	if err != nil {
		logger.Log.Errorln("Error upgrading connection:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade connection"})
		return
	}

	currentUser := structures.ChatUser{
		Name:       username,
		Connection: websocket,
	}
	room = &structures.Room{
		ID:         chatNumber,
		Name:       roomname,
		Open:       open,
		Password:   password,
		Users:      []*structures.ChatUser{&currentUser}, // сразу инициализация
		MaxUsers:   maxUsers,
		TopicID:    topicID,
		SubtopicID: subtopicID,
		ReadyUsers: make(map[string]bool),
	}
	(*rooms)[chatNumber] = room
	logger.Log.Traceln("Created room №" + strconv.Itoa(chatNumber))
	logger.Log.Traceln(currentUser.Name + " added to room")

	logger.Log.Traceln(fmt.Sprintf("Current amount of users in room %d: %d", chatNumber, len((*rooms)[chatNumber].Users)))
	informing.SetRoomName(room)
	informing.InformUserJoined(room, username)
	go myws.Reader(websocket, room, rooms)
}
