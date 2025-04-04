package handlers

import (
	"awesomeChat/internal/structures"
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
)

func GetDiscussionByID(c *gin.Context, db *sql.DB) {
	idParam := c.Param("id")
	discussionID, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid discussion ID"})
		return
	}

	var response structures.DiscussionResponse
	var messagesJSON []byte
	var keyQuestionsJSON []byte
	var tagsJSON []byte
	var exportOptionsJSON []byte
	var participantsJSON []byte

	row := db.QueryRow(`
		SELECT 
			id, room_id, mode, subtype, 
			duration, start_time, end_time,
			messages, creator_username,
			key_questions, tags, export_options,
			participants, 
			COALESCE(custom_topic, '') as topic,
			COALESCE(custom_subtopic, '') as subtopic,
			description, purpose
		FROM discussions 
		WHERE id = $1
	`, discussionID)

	err = row.Scan(
		&response.ID,
		&response.RoomID,
		&response.Mode,
		&response.SubType,
		&response.Duration,
		&response.StartTime,
		&response.EndTime,
		&messagesJSON,
		&response.Creator,
		&keyQuestionsJSON,
		&tagsJSON,
		&exportOptionsJSON,
		&participantsJSON,
		&response.Topic,
		&response.Subtopic,
		&response.Description,
		&response.Purpose,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Discussion not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if err = json.Unmarshal(messagesJSON, &response.Messages); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse messages"})
		return
	}

	if err = json.Unmarshal(keyQuestionsJSON, &response.KeyQuestions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse key questions"})
		return
	}

	if err = json.Unmarshal(tagsJSON, &response.Tags); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse tags"})
		return
	}

	if err = json.Unmarshal(exportOptionsJSON, &response.ExportOptions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse export options"})
		return
	}

	if err = json.Unmarshal(participantsJSON, &response.Participants); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse participants"})
		return
	}

	c.JSON(http.StatusOK, response)
}
