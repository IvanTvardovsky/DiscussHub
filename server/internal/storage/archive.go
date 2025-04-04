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

	messagesJSON, err := json.Marshal(room.Messages)
	if err != nil {
		logger.Log.Errorln("Marshal error:", err)
		return
	}

	keyQuestionsJSON, _ := json.Marshal(room.KeyQuestions)
	tagsJSON, _ := json.Marshal(room.Tags)
	exportOptionsJSON, _ := json.Marshal(room.ExportOptions)
	participantsJSON, _ := json.Marshal(room.Participants)

	// todo топик и субтопик для блитца поменять

	_, err = db.Exec(`
        INSERT INTO discussions 
            (room_id, mode, subtype, duration, start_time, end_time,
             messages, creator_username, key_questions, tags,
             export_options, participants, topic_id, subtopic_id,
             custom_topic, custom_subtopic, description, purpose) 
        VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
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
	)

	if err != nil {
		logger.Log.Errorln("Save to DB error:", err)
		return
	}

	room.Messages = nil
	logger.Log.Traceln("Discussion saved for room", room.ID)
}
