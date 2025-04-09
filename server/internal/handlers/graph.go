package handlers

import (
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

type InteractionEdge struct {
	Source string  // имя пользователя, осуществившего действие
	Target string  // имя пользователя, которому адресовано действие
	Type   string  // тип действия: "like", "dislike", "rating"
	Count  int     // количество взаимодействий
	Avg    float64 // среднее значение рейтинга
}

type UserMetrics struct {
	Username         string
	MessagesSent     int
	LikesReceived    int
	DislikesReceived int
	LikesGiven       int
	DislikesGiven    int
	TotalRating      float64
	RatingCount      int
}

func GetDiscussionGraphByID(c *gin.Context, db *sql.DB) {
	discussionID := c.Param("id")
	if discussionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Discussion ID is required"})
		return
	}

	var discussion struct {
		ID           int
		Participants []byte
		Messages     []byte
	}
	err := db.QueryRow(`
        SELECT id, participants, messages 
        FROM discussions 
        WHERE id = $1`, discussionID).Scan(
		&discussion.ID,
		&discussion.Participants,
		&discussion.Messages,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Discussion not found"})
		return
	}

	var participants []string
	if err = json.Unmarshal(discussion.Participants, &participants); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse participants"})
		return
	}

	usernameToUserID := make(map[string]int)
	userIDToUsername := make(map[int]string)

	if len(participants) > 0 {
		rows, err := db.Query(`
        SELECT user_id, username 
        FROM users 
        WHERE username = ANY($1)`,
			pq.Array(participants))
		if err != nil {
			logger.Log.Errorf("SQL error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user IDs"})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var userID int
			var username string
			if err = rows.Scan(&userID, &username); err != nil {
				logger.Log.Errorf("Scan error: %v", err)
				continue
			}
			usernameToUserID[username] = userID
			userIDToUsername[userID] = username
		}
	}

	userMetrics := make(map[string]*UserMetrics)
	for _, username := range participants {
		userMetrics[username] = &UserMetrics{Username: username}
	}

	var messages []structures.Message
	if err = json.Unmarshal(discussion.Messages, &messages); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse messages"})
		return
	}

	edgesMap := make(map[string]*InteractionEdge)

	for _, msg := range messages {
		if msg.Type != "usual" {
			continue
		}
		author := msg.Username
		if um, ok := userMetrics[author]; ok {
			um.MessagesSent++
		}

		for _, liker := range msg.LikedBy {
			key := fmt.Sprintf("%s|%s|like", liker, author)
			if edge, exists := edgesMap[key]; exists {
				edge.Count++
			} else {
				edgesMap[key] = &InteractionEdge{
					Source: liker,
					Target: author,
					Type:   "like",
					Count:  1,
				}
			}
			if um, ok := userMetrics[author]; ok {
				um.LikesReceived++
			}
			if um, ok := userMetrics[liker]; ok {
				um.LikesGiven++
			}
		}

		for _, disliker := range msg.DislikedBy {
			key := fmt.Sprintf("%s|%s|dislike", disliker, author)
			if edge, exists := edgesMap[key]; exists {
				edge.Count++
			} else {
				edgesMap[key] = &InteractionEdge{
					Source: disliker,
					Target: author,
					Type:   "dislike",
					Count:  1,
				}
			}
			if um, ok := userMetrics[author]; ok {
				um.DislikesReceived++
			}
			if um, ok := userMetrics[disliker]; ok {
				um.DislikesGiven++
			}
		}
	}

	ratingRows, err := db.Query(`
		SELECT rater_user_id, rated_user_id, professionalism, arguments_quality, politeness 
		FROM ratings 
		WHERE discussion_id = $1`, discussionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ratings"})
		return
	}
	defer ratingRows.Close()

	for ratingRows.Next() {
		var raterID, ratedID, prof, arg, pol int
		if err = ratingRows.Scan(&raterID, &ratedID, &prof, &arg, &pol); err != nil {
			logger.Log.Errorf("Scan error: %v", err)
			continue
		}
		raterUsername, ok1 := userIDToUsername[raterID]
		ratedUsername, ok2 := userIDToUsername[ratedID]
		if !ok1 || !ok2 {
			logger.Log.Errorf("User IDs %d или %d не найдены", raterID, ratedID)
			continue
		}
		avgRating := float64(prof+arg+pol) / 3.0
		key := fmt.Sprintf("%s|%s|rating", raterUsername, ratedUsername)
		if edge, exists := edgesMap[key]; exists {
			totalRating := edge.Avg*float64(edge.Count) + avgRating
			edge.Count++
			edge.Avg = totalRating / float64(edge.Count)
		} else {
			edgesMap[key] = &InteractionEdge{
				Source: raterUsername,
				Target: ratedUsername,
				Type:   "rating",
				Count:  1,
				Avg:    avgRating,
			}
		}
		if um, ok := userMetrics[ratedUsername]; ok {
			um.TotalRating += avgRating
			um.RatingCount++
		}
	}

	maxMessages := 1
	maxPositivity := 1
	maxAvgRating := 1.0
	for _, um := range userMetrics {
		if um.MessagesSent > maxMessages {
			maxMessages = um.MessagesSent
		}
		positivity := um.LikesReceived - um.DislikesReceived
		if positivity > maxPositivity {
			maxPositivity = positivity
		}
		if um.RatingCount > 0 {
			avg := um.TotalRating / float64(um.RatingCount)
			if avg > maxAvgRating {
				maxAvgRating = avg
			}
		}
	}

	dotGraph := "digraph DiscussionGraph {\n"
	dotGraph += "\trankdir=LR;\n"
	dotGraph += "\tnode [shape=ellipse, style=filled];\n"

	// формирование узлов с изменяемыми атрибутами
	for _, um := range userMetrics {
		// размер шрифта пропорционален количеству сообщений
		fontSize := 12 + (float64(um.MessagesSent)/float64(maxMessages))*8

		// изменяем цвет узла на основе позитивности (лайки - дизлайки)
		positivity := um.LikesReceived - um.DislikesReceived
		fillColor := "lightgray"
		if positivity > 0 {
			fillColor = "palegreen"
		}

		// если среднее значение рейтинга высокое, изменяем цвет рамки
		borderColor := "black"
		if um.RatingCount > 0 {
			avgRating := um.TotalRating / float64(um.RatingCount)
			if avgRating > 4.0 {
				borderColor = "blue"
			}
		}

		dotGraph += fmt.Sprintf("\t\"%s\" [fontsize=%.1f, fillcolor=%s, color=%s];\n",
			um.Username, fontSize, fillColor, borderColor)
	}

	// добавление ребер взаимодействия
	for _, edge := range edgesMap {
		style := ""
		label := ""
		penWidth := 2 // базовая толщина линии

		// для лайков и дизлайков увеличиваем толщину стрелки, если их много.
		switch edge.Type {
		case "like":
			if edge.Count > 3 {
				penWidth = 2 + edge.Count/3
			}
			style = fmt.Sprintf("color=green, penwidth=%d", penWidth)
			label = fmt.Sprintf("Likes: %d", edge.Count)
		case "dislike":
			if edge.Count > 3 {
				penWidth = 2 + edge.Count/3
			}
			style = fmt.Sprintf("color=red, penwidth=%d", penWidth)
			label = fmt.Sprintf("Dislikes: %d", edge.Count)
		case "rating":
			style = "color=blue, style=dashed, penwidth=2"
			label = fmt.Sprintf("Rating: %.1f (%d)", edge.Avg, edge.Count)
		}
		dotGraph += fmt.Sprintf("\t\"%s\" -> \"%s\" [label=\"%s\", %s];\n",
			edge.Source, edge.Target, label, style)
	}
	dotGraph += "}\n"

	// генерация изображения PNG с помощью утилиты dot
	cmd := exec.Command("dot", "-Tpng")
	cmd.Stdin = bytes.NewBufferString(dotGraph)
	var pngBuffer bytes.Buffer
	cmd.Stdout = &pngBuffer
	if err = cmd.Run(); err != nil {
		logger.Log.Errorf("Ошибка генерации PNG: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate image"})
		return
	}

	c.Header("Content-Type", "image/png")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=discussion_%s_graph.png", discussionID))
	c.Data(http.StatusOK, "image/png", pngBuffer.Bytes())
}
