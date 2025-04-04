package handlers

import (
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
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
			description, purpose, room_name, public
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
		&response.RoomName,
		&response.Public,
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

func GetArchives(c *gin.Context, db *sql.DB) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	username := c.Query("username")
	//username, exists := c.Get("username")
	//if !exists {
	//	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
	//	return
	//}

	var response structures.ArchiveResponse
	var items []structures.ArchiveItem

	rows, err := db.Query(`
        SELECT 
            id, 
            room_name as name,
            mode, 
            subtype, 
            key_questions, 
            tags,
            topic_id, 
            subtopic_id,
            custom_topic, 
            custom_subtopic,
            public
        FROM discussions
        WHERE public = true OR participants @> jsonb_build_array($1::text)
        ORDER BY end_time DESC
        LIMIT $2 OFFSET $3`,
		username,
		limit,
		offset,
	)

	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var item structures.ArchiveItem
		var keyQuestionsJSON []byte
		var tagsJSON []byte

		err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Mode,
			&item.SubType,
			&keyQuestionsJSON,
			&tagsJSON,
			&item.TopicID,
			&item.SubtopicID,
			&item.CustomTopic,
			&item.CustomSubtopic,
			&item.Public,
		)

		if err != nil {
			logger.Log.Error("Scan error:", err)
			continue
		}

		err = json.Unmarshal(keyQuestionsJSON, &item.KeyQuestions)
		if err != nil {
			logger.Log.Error("Unmarshal error:", err)
			return
		}
		err = json.Unmarshal(tagsJSON, &item.Tags)
		if err != nil {
			logger.Log.Error("Unmarshal error:", err)
			return
		}

		if item.Mode == "personal" && item.SubType == "blitz" {
			item.Topic = structures.TopicDB[item.TopicID]
			item.Subtopic = structures.SubtopicDB[item.SubtopicID]
		}

		items = append(items, item)
	}

	response.Data = items
	response.Page = page
	response.Limit = limit

	c.JSON(http.StatusOK, response)
}
