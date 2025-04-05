package storage

import (
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"database/sql"
	"encoding/json"
	"time"
)

func SaveDiscussionHistory(db *sql.DB, room *structures.Room) {
	room.Mu.Lock()
	defer room.Mu.Unlock()

	for i := range room.Messages {
		msg := &room.Messages[i]
		msg.LikedBy = []string{}
		msg.DislikedBy = []string{}
		for username, vote := range msg.Votes {
			if vote == 1 {
				msg.LikedBy = append(msg.LikedBy, username)
			} else if vote == -1 {
				msg.DislikedBy = append(msg.DislikedBy, username)
			}
		}
	}

	messagesJSON, err := json.Marshal(room.Messages)
	if err != nil {
		logger.Log.Errorln("Marshal error:", err)
		return
	}

	keyQuestionsJSON, _ := json.Marshal(room.KeyQuestions)
	tagsJSON, _ := json.Marshal(room.Tags)
	exportOptionsJSON, _ := json.Marshal(room.ExportOptions)
	participantsJSON, _ := json.Marshal(room.Participants)

	_, err = db.Exec(`
        INSERT INTO discussions 
            (room_id, mode, subtype, duration, start_time, end_time,
             messages, creator_username, key_questions, tags,
             export_options, participants, topic_id, subtopic_id,
             custom_topic, custom_subtopic, description, purpose, room_name, public) 
        VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
		room.ID,
		room.Mode,
		room.SubType,
		room.Duration, // сюда записался бредик
		room.StartTime,
		time.Now(),
		messagesJSON,
		room.CreatorUsername,
		keyQuestionsJSON,
		tagsJSON,
		exportOptionsJSON,
		participantsJSON,
		room.TopicID,
		room.SubtopicID,
		room.CustomTopic,
		room.CustomSubtopic,
		room.Description,
		room.Purpose,
		room.Name,
		room.Password == "" || room.Hidden,
	)

	if err != nil {
		logger.Log.Errorln("Save to DB error:", err)
		return
	}

	room.Messages = nil
	logger.Log.Traceln("Discussion saved for room", room.ID)
}
