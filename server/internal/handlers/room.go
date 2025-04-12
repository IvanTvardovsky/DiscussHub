package handlers

import (
	"awesomeChat/internal/structures"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"time"
)

func GetRoomDetails(c *gin.Context, rooms *map[int]*structures.Room) {
	chatNumber, _ := strconv.Atoi(c.Param("id"))

	room, ok := (*rooms)[chatNumber]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid discussion ID"})
	}

	roomToSend := structures.RoomForList{
		ID:               room.ID,
		Name:             room.Name,
		Open:             room.Open,
		Users:            len(room.Users),
		MaxUsers:         room.MaxUsers,
		Mode:             room.Mode,
		SubType:          room.SubType,
		TopicID:          room.TopicID,
		SubtopicID:       room.SubtopicID,
		CustomTopic:      room.CustomTopic,
		CustomSubtopic:   room.CustomSubtopic,
		Description:      room.Description,
		Purpose:          room.Purpose,
		KeyQuestions:     room.KeyQuestions,
		Tags:             room.Tags,
		ExportOptions:    room.ExportOptions,
		DontJoin:         room.DontJoin,
		DiscussionActive: room.DiscussionActive,
		Duration:         int(room.Duration.Minutes()),
		StartTime:        room.StartTime.Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, roomToSend)
}
