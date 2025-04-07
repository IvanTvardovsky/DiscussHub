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
	if remaining < 0 {
		remaining = 0
	}

	hours := int(remaining.Hours())
	minutes := int(remaining.Minutes()) % 60
	seconds := int(remaining.Seconds()) % 60

	var timeStr string
	if hours > 0 {
		timeStr = fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
	} else {
		timeStr = fmt.Sprintf("%02d:%02d", minutes, seconds)
	}

	msg := structures.Message{
		Type:    "timer",
		Content: fmt.Sprintf("Осталось времени: %s", timeStr),
	}
	sendToAll(room, msg)
}

func sendRateYourOpponents(room *structures.Room) {
	var msg structures.FinalRateMessage
	if room.Mode == "professional" {
		msg = structures.FinalRateMessage{
			DiscussionID: room.DiscussionID,
			Type:         "discussion_end",
			Users:        room.Participants,
			Criteria:     []string{"professionalism", "arguments_quality", "politeness"}, //todo make const
		}
	} else {
		msg = structures.FinalRateMessage{
			DiscussionID: room.DiscussionID,
			Type:         "discussion_end",
			Users:        room.Participants,
			Criteria:     []string{"professionalism", "politeness", "arguments_quality"}, //todo make const
		}
	}

	messageToSend, _ := json.Marshal(msg)

	for _, user := range room.Users {
		logger.Log.Traceln("Sending message:", string(messageToSend))
		user.Connection.WriteMessage(websocket.TextMessage, messageToSend)
	}
}

func SendDiscussionEnd(room *structures.Room) {
	sendRateYourOpponents(room)

	msg := structures.Message{
		Type:    "discussion_end",
		Content: "Обсуждение закончено! Оцените ваших собеседников",
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

func sendBlitzDiscussion(room *structures.Room) {
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

func sendFreeDiscussion(room *structures.Room) {
	msg := structures.Message{
		Type:    "discussion_start",
		Content: "🎉 Дискуссия началась!",
	}
	sendToAll(room, msg)
	time.Sleep(2 * time.Second)
}

func sendProfessionalDiscussion(room *structures.Room) {
	msg := structures.Message{
		Type:    "discussion_start",
		Content: "🎉 Дискуссия началась!",
	}
	sendToAll(room, msg)
	time.Sleep(2 * time.Second)
}

func SendDiscussionStart(room *structures.Room) {
	switch room.Mode {
	case "personal":
		if room.SubType == "blitz" {
			sendBlitzDiscussion(room)
		} else if room.SubType == "free" {
			sendFreeDiscussion(room)
		}
	case "professional":
		sendProfessionalDiscussion(room)
	}
}

func SendUserReady(room *structures.Room, username string) {
	msg := structures.Message{
		Type:     "system",
		Content:  fmt.Sprintf("User %s is ready to start!", username),
		Username: "system",
	}
	sendToAll(room, msg)
}
