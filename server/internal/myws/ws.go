package myws

import (
	"awesomeChat/internal/informing"
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

func Reader(conn *websocket.Conn, room *structures.Room, rooms *map[int]*structures.Room) {
	var leftUser string
	defer func() {
		for i, user := range room.Users {
			if user.Connection == conn {
				room.Users = append(room.Users[:i], room.Users[i+1:]...)
				leftUser = user.Name
				break
			}
		}
		informing.InformUserLeft(room, leftUser)
		logger.Log.Traceln(fmt.Sprintf("Current amount of users in room %d: %d", room.ID, len(room.Users)))
		if len(room.Users) == 0 {
			delete(*rooms, room.ID)
			logger.Log.Traceln(fmt.Sprintf("Deleting room %d", room.ID))
		}
	}()

	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			logger.Log.Traceln("ReadMessage error: " + err.Error())
			return
		}
		logger.Log.Traceln("Received message:", string(p))

		var msg structures.Message
		err = json.Unmarshal(p, &msg)
		if err != nil {
			logger.Log.Traceln("Unmarshal message error: " + err.Error())
			return
		}

		switch msg.Type {
		case "usual":
			handleUsualMessage(room, conn, p)
		case "ready_check":
			handleReadyCheck(room, conn, msg.Username)
		case "rate":
			handleRating(room, msg)
		}
	}
}

func handleUsualMessage(room *structures.Room, conn *websocket.Conn, msg []byte) {
	for _, user := range room.Users {
		if user.Connection != conn { // отправить сообщение всем пользователям в комнате, кроме отправителя
			err := user.Connection.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				logger.Log.Errorln(err)
			}
		}
	}
}

func handleReadyCheck(room *structures.Room, conn *websocket.Conn, username string) {
	room.Mu.Lock()
	room.ReadyUsers[username] = true
	room.Mu.Unlock()

	informing.SendUserReady(room, username)

	logger.Log.Tracef("Ready users: %d", len(room.ReadyUsers))
	if len(room.ReadyUsers) == 2 {
		startDiscussion(room)
	}
}

func handleRating(room *structures.Room, msg structures.Message) {
	logger.Log.Traceln("i will place this info in db: ", msg)
	//todo
}

func startDiscussion(room *structures.Room) {
	room.Mu.Lock()
	defer room.Mu.Unlock()

	logger.Log.Tracef("Starting discussion %d", room.ID)

	// получаем тезисы для текущего сабтопика
	theses := getThesesForSubtopic(room.SubtopicID)
	if len(theses) < 2 {
		logger.Log.Errorf("No theses found for subtopic %d", room.SubtopicID)
		return
	}

	// перемешиваем тезисы для случайного распределения
	rand.Shuffle(len(theses), func(i, j int) {
		theses[i], theses[j] = theses[j], theses[i]
	})

	logger.Log.Tracef("Theses: %v", theses)

	room.AssignedTheses = theses
	room.UserTheses = make(map[string]string)

	for i, user := range room.Users {
		if i >= room.MaxUsers {
			break
		}
		room.UserTheses[user.Name] = theses[i]
	}
	// отправка темы и тезисов
	informing.SendDiscussionStart(room)

	room.DiscussionActive = true
	room.Duration = 2 * time.Minute //todo 10
	room.StartTime = time.Now()

	// запуск таймера
	go discussionTimer(room)
}

func getThesesForSubtopic(subtopicID int) []string {
	return structures.ThesesDB[subtopicID]
}

// в логике таймера
func discussionTimer(room *structures.Room) {
	ticker := time.NewTicker(1 * time.Minute) // отправляем обновления раз в минуту
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			remaining := room.Duration - time.Since(room.StartTime)
			if remaining <= 0 {
				informing.SendDiscussionEnd(room)
				return
			}
			informing.SendTimerUpdate(room, remaining)
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WebSocketServer struct {
	clients   map[*websocket.Conn]any
	Broadcast chan []structures.RoomForList
	mu        sync.Mutex
}

func NewWebSocketServer() *WebSocketServer {
	return &WebSocketServer{
		clients:   make(map[*websocket.Conn]any),
		Broadcast: make(chan []structures.RoomForList),
	}
}
