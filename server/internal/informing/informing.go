package informing

import (
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"strconv"
	"time"
)

func InformUserLeft(room *structures.Room, username string) {
	msg := structures.Message{
		Type:     "userLeft",
		Content:  username + " покинул комнату",
		Username: "default",
	}

	sendToAll(room, msg)
}

func InformUserJoined(room *structures.Room, username string) {
	msg := structures.Message{
		Type:     "userJoined",
		Content:  username + " присоединился",
		Username: "default",
	}

	sendToAll(room, msg)
}

func SetRoomName(room *structures.Room) {
	msg := structures.Message{
		Type:    "setRoomName",
		Content: "[Комната #" + strconv.Itoa(room.ID) + "]    " + room.Name,
	}

	sendToAll(room, msg)
}

//func SendSystemMessage(room *structures.Room, content string) {
//	msg := structures.Message{
//		Type:     "system",
//		Content:  content,
//		Username: "system",
//	}
//
//	sendToAll(room, msg)
//}

func sendToAll(room *structures.Room, msg structures.Message) {
	messageToSend, _ := json.Marshal(msg)

	for _, user := range room.Users {
		logger.Log.Traceln("Sending message:", string(messageToSend))
		user.Connection.WriteMessage(websocket.TextMessage, messageToSend)
	}
}

func sendToOne(user *structures.ChatUser, msg structures.Message) {
	messageToSend, _ := json.Marshal(msg)

	logger.Log.Traceln("Sending message:", string(messageToSend))
	user.Connection.WriteMessage(websocket.TextMessage, messageToSend)
}

func SendTimerUpdate(room *structures.Room, remaining time.Duration) {
	msg := structures.Message{
		Type: "timer",
		Content: fmt.Sprintf("Осталось времени: %02d:%02d",
			int(remaining.Minutes()),
			int(remaining.Seconds())%60),
	}
	sendToAll(room, msg)
}

func SendDiscussionEnd(room *structures.Room) {
	msg := structures.Message{
		Type:    "discussion_end",
		Content: "Обсуждение закончено! Оцените вашего оппонента",
	}
	sendToAll(room, msg)
}

func sendTheses(room *structures.Room) {
	for _, user := range room.Users {
		msg := structures.Message{
			Type:    "system",
			Content: fmt.Sprintf("Ваша точка зрения на это обсуждение: %s", room.UserTheses[user.Name]),
		}
		sendToOne(user, msg)
	}
}

func SendDiscussionStart(room *structures.Room) {
	time.Sleep(2 * time.Second)
	msg := structures.Message{
		Type:    "system",
		Content: fmt.Sprintf("Тема: %s", structures.SubtopicDB[room.SubtopicID]),
	}
	sendToAll(room, msg)
	time.Sleep(3 * time.Second)
	msg = structures.Message{
		Type:    "system",
		Content: "Противоположные тезисы:",
	}
	sendToAll(room, msg)
	time.Sleep(3 * time.Second)
	msg = structures.Message{
		Type:    "system",
		Content: fmt.Sprintf("1. %s", structures.ThesesDB[room.SubtopicID][0]),
	}
	sendToAll(room, msg)
	time.Sleep(4 * time.Second)
	msg = structures.Message{
		Type:    "system",
		Content: fmt.Sprintf("2. %s", structures.ThesesDB[room.SubtopicID][1]),
	}
	sendToAll(room, msg)
	time.Sleep(4 * time.Second)

	sendTheses(room)
	time.Sleep(5 * time.Second)

	msg = structures.Message{
		Type:    "discussion_start",
		Content: "🎉 Дискуссия началась!",
	}
	sendToAll(room, msg)
	time.Sleep(2 * time.Second)
}

func SendUserReady(room *structures.Room, username string) {
	msg := structures.Message{
		Type:     "system",
		Content:  fmt.Sprintf("User %s is ready to start!", username),
		Username: "system",
	}
	sendToAll(room, msg)
}
