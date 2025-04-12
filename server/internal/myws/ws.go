package myws

import (
	"awesomeChat/internal/informing"
	"awesomeChat/internal/storage"
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

func Reader(db *sql.DB, conn *websocket.Conn, room *structures.Room, rooms *map[int]*structures.Room) {
	var leftUser string
	defer func() {
		for i, user := range room.Users {
			if user.Connection == conn {
				room.Users = append(room.Users[:i], room.Users[i+1:]...)
				leftUser = user.Name
				break
			}
		}
		room.Mu.Lock()
		delete(room.ReadyUsers, leftUser)
		room.Mu.Unlock()
		informing.InformUserLeft(room, leftUser)
		logger.Log.Traceln(fmt.Sprintf("Current amount of users in room %d: %d", room.ID, len(room.Users)))
		if len(room.Users) == 0 {
			go func() {
				//todo если никого нет больше часа, то удаляем
			}()
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
			var clientMsg structures.Message
			err = json.Unmarshal(p, &clientMsg)
			if err != nil {
				logger.Log.Traceln("Unmarshal message error: " + err.Error())
				return
			}

			finalMsg := structures.Message{
				ID:           uuid.New().String(),
				Type:         "usual",
				Content:      clientMsg.Content,
				Username:     clientMsg.Username,
				Timestamp:    time.Now(),
				LikeCount:    0,
				DislikeCount: 0,
				Votes:        make(map[string]int),
				TempID:       clientMsg.TempID,
			}

			room.Mu.Lock()
			room.Messages = append(room.Messages, finalMsg)
			room.Mu.Unlock()

			handleUsualMessage(room, conn, finalMsg)
		case "ready_check":
			handleReadyCheck(db, room, conn, msg.Username)
		case "rate":
			handleRating(room, p)
		}
	}
}

func handleUsualMessage(room *structures.Room, conn *websocket.Conn, msg structures.Message) {
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		logger.Log.Errorln("Marshal error:", err)
		return
	}

	for _, user := range room.Users {
		//if user.Connection != conn { // отправить сообщение всем пользователям в комнате, кроме отправителя
		if err := user.Connection.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			logger.Log.Errorln(err)
		}
		//}
	}
}

func handleReadyCheck(db *sql.DB, room *structures.Room, conn *websocket.Conn, username string) {
	if _, ready := room.ReadyUsers[username]; room.DiscussionActive || ready {
		return
	}
	room.Mu.Lock()
	room.ReadyUsers[username] = true
	room.Mu.Unlock()

	informing.SendUserReady(room, username)

	logger.Log.Tracef("Ready users: %d", len(room.ReadyUsers))
	if len(room.ReadyUsers) == room.MaxUsers {
		startDiscussion(db, room)
	}
}

func handleRating(room *structures.Room, p []byte) {
	var msg structures.RateMessage
	err := json.Unmarshal(p, &msg)
	if err != nil {
		logger.Log.Traceln("Unmarshal message error: " + err.Error())
		return
	}

	room.Mu.Lock()
	defer room.Mu.Unlock()

	var targetMsg *structures.Message
	for i := range room.Messages {
		if room.Messages[i].ID == msg.TargetMessageID {
			targetMsg = &room.Messages[i]
			break
		}
	}

	if targetMsg == nil {
		logger.Log.Warnf("Message %s not found", msg.TargetMessageID)
		return
	}

	if targetMsg.Username == msg.Username {
		logger.Log.Warnf("User %s tried to vote own message", msg.Username)
		return
	}

	previousVote := targetMsg.Votes[msg.Username]
	newVote := msg.Vote

	switch previousVote {
	case 1:
		targetMsg.LikeCount--
	case -1:
		targetMsg.DislikeCount--
	}

	switch newVote {
	case 1:
		targetMsg.LikeCount++
	case -1:
		targetMsg.DislikeCount++
	case 0:
		delete(targetMsg.Votes, msg.Username)
	default:
		logger.Log.Warnf("Invalid vote value: %d", newVote)
		return
	}

	if newVote != 0 {
		targetMsg.Votes[msg.Username] = newVote
	}

	update := map[string]interface{}{
		"type":         "vote_update",
		"messageID":    targetMsg.ID,
		"likeCount":    targetMsg.LikeCount,
		"dislikeCount": targetMsg.DislikeCount,
	}

	logger.Log.Traceln("Updating vote update:", update)

	msgBytes, _ := json.Marshal(update)
	for _, user := range room.Users {
		if err := user.Connection.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			logger.Log.Errorln("Broadcast error:", err)
		}
	}
}

func startDiscussion(db *sql.DB, room *structures.Room) {
	room.Mu.Lock()
	defer room.Mu.Unlock()

	logger.Log.Tracef("Starting discussion %d. Mode: %s, subtype: %s", room.ID, room.Mode, room.SubType)

	for _, user := range room.Users {
		room.Participants = append(room.Participants, user.Name)
	}

	if room.Mode == "personal" && room.SubType == "blitz" {
		theses := getThesesForSubtopic(room.SubtopicID)
		if len(theses) < 2 {
			logger.Log.Errorf("No theses found for subtopic %d", room.SubtopicID)
			return
		}

		// получаем тезисы для текущего сабтопика

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
	}

	// отправка сообщения о старте (+ для блитца темы и тезисов)
	informing.SendDiscussionStart(room)

	room.DiscussionActive = true
	room.StartTime = time.Now()

	// запуск таймера
	go discussionTimer(db, room)
}

func getThesesForSubtopic(subtopicID int) []string {
	return structures.ThesesDB[subtopicID]
}

// в логике таймера
func discussionTimer(db *sql.DB, room *structures.Room) {
	var reminderInterval time.Duration

	switch {
	case room.Duration <= 30*time.Minute:
		reminderInterval = 1 * time.Minute
	case room.Duration <= 3*time.Hour:
		reminderInterval = 5 * time.Minute
	case room.Duration <= 6*time.Hour:
		reminderInterval = 15 * time.Minute
	default:
		reminderInterval = 1 * time.Hour
	}

	ticker := time.NewTicker(reminderInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			remaining := room.Duration - time.Since(room.StartTime)
			if remaining <= 0 {
				room.DiscussionID = int(storage.SaveDiscussionHistory(db, room))

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
