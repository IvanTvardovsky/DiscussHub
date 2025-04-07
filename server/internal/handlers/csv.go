package handlers

import (
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"net/http"
	"strconv"
)

func GetDiscussionCSVByID(c *gin.Context, db *sql.DB) {
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
	userStats := make(map[int]*structures.UserStats)

	if len(participants) > 0 {
		placeholders := make([]string, len(participants))
		params := make([]interface{}, len(participants))
		for i, username := range participants {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
			params[i] = username
		}

		rows, err := db.Query(`
        SELECT user_id, username 
        FROM users 
        WHERE username = ANY($1)`,
			pq.Array(participants),
		)
		if err != nil {
			logger.Log.Errorf("SQL error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user IDs"})
			return
		}
		defer rows.Close()

		logger.Log.Debugf("Searching users: %v", participants)

		foundUsers := 0
		for rows.Next() {
			var userID int
			var username string
			if err = rows.Scan(&userID, &username); err != nil {
				logger.Log.Errorf("Scan error: %v", err)
				continue
			}
			usernameToUserID[username] = userID
			userIDToUsername[userID] = username
			foundUsers++
			logger.Log.Debugf("Found user: %s → %d", username, userID)
		}

		logger.Log.Debugf("Total users found: %d", foundUsers)

		if err = rows.Err(); err != nil {
			logger.Log.Errorf("Rows error: %v", err)
		}

		for _, username := range participants {
			if _, ok := usernameToUserID[username]; !ok {
				logger.Log.Errorf("User %s not found in database", username)
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("User %s not found", username),
				})
				return
			}
		}
	}

	for username, userID := range usernameToUserID {
		userStats[userID] = &structures.UserStats{
			UserID:                   userID,
			Username:                 username,
			MessagesSent:             0,
			LikesReceived:            0,
			DislikesReceived:         0,
			LikesGiven:               0,
			DislikesGiven:            0,
			ProfessionalismReceived:  []int{},
			ArgumentsQualityReceived: []int{},
			PolitenessReceived:       []int{},
			ProfessionalismGiven:     []int{},
			ArgumentsQualityGiven:    []int{},
			PolitenessGiven:          []int{},
		}
	}

	var messages []structures.Message
	if err = json.Unmarshal(discussion.Messages, &messages); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse messages"})
		return
	}

	for _, msg := range messages {
		if msg.Type != "usual" {
			continue
		}

		userID, ok := usernameToUserID[msg.Username]
		if !ok {
			logger.Log.Errorf("User %s not found for message: %s", msg.Username, msg.ID)
			continue
		}

		stats, exists := userStats[userID]
		if !exists {
			logger.Log.Errorf("Stats not found for userID: %d", userID)
			continue
		}

		stats.MessagesSent++

		stats.LikesReceived += len(msg.LikedBy)
		stats.DislikesReceived += len(msg.DislikedBy)

		for _, likedUser := range msg.LikedBy {
			if likerID, ok := usernameToUserID[likedUser]; ok {
				if likerStats, exists := userStats[likerID]; exists {
					likerStats.LikesGiven++
				}
			}
		}

		for _, dislikedUser := range msg.DislikedBy {
			if dislikerID, ok := usernameToUserID[dislikedUser]; ok {
				if dislikerStats, exists := userStats[dislikerID]; exists {
					dislikerStats.DislikesGiven++
				}
			}
		}
	}

	rows, err := db.Query(`
		SELECT rater_user_id, rated_user_id, 
			professionalism, arguments_quality, politeness 
		FROM ratings 
		WHERE discussion_id = $1`, discussionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ratings"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var raterID, ratedID int
		var prof, arg, pol int
		if err := rows.Scan(&raterID, &ratedID, &prof, &arg, &pol); err != nil {
			continue
		}

		if stats, ok := userStats[ratedID]; ok {
			stats.ProfessionalismReceived = append(stats.ProfessionalismReceived, prof)
			stats.ArgumentsQualityReceived = append(stats.ArgumentsQualityReceived, arg)
			stats.PolitenessReceived = append(stats.PolitenessReceived, pol)
		}

		if stats, ok := userStats[raterID]; ok {
			stats.ProfessionalismGiven = append(stats.ProfessionalismGiven, prof)
			stats.ArgumentsQualityGiven = append(stats.ArgumentsQualityGiven, arg)
			stats.PolitenessGiven = append(stats.PolitenessGiven, pol)
		}
	}

	csvData := [][]string{}
	headers := []string{
		"UserID", "Username",
		"MessagesSent",
		"LikesReceived", "DislikesReceived",
		"LikesGiven", "DislikesGiven",
		"AvgProfessionalismReceived", "AvgArgumentsQualityReceived", "AvgPolitenessReceived",
		"TotalRatingsReceived",
		"AvgProfessionalismGiven", "AvgArgumentsQualityGiven", "AvgPolitenessGiven",
		"TotalRatingsGiven",
	}
	csvData = append(csvData, headers)

	for _, username := range participants {
		userID := usernameToUserID[username]
		stats, exists := userStats[userID]
		if !exists {
			logger.Log.Errorf("User %s not found", username)
			continue
		}
		avgProfReceived := average(stats.ProfessionalismReceived)
		avgArgReceived := average(stats.ArgumentsQualityReceived)
		avgPolReceived := average(stats.PolitenessReceived)
		totalReceived := len(stats.ProfessionalismReceived)

		avgProfGiven := average(stats.ProfessionalismGiven)
		avgArgGiven := average(stats.ArgumentsQualityGiven)
		avgPolGiven := average(stats.PolitenessGiven)
		totalGiven := len(stats.ProfessionalismGiven)

		row := []string{
			strconv.Itoa(stats.UserID),
			stats.Username,
			strconv.Itoa(stats.MessagesSent),
			strconv.Itoa(stats.LikesReceived),
			strconv.Itoa(stats.DislikesReceived),
			strconv.Itoa(stats.LikesGiven),
			strconv.Itoa(stats.DislikesGiven),
			fmt.Sprintf("%.2f", avgProfReceived),
			fmt.Sprintf("%.2f", avgArgReceived),
			fmt.Sprintf("%.2f", avgPolReceived),
			strconv.Itoa(totalReceived),
			fmt.Sprintf("%.2f", avgProfGiven),
			fmt.Sprintf("%.2f", avgArgGiven),
			fmt.Sprintf("%.2f", avgPolGiven),
			strconv.Itoa(totalGiven),
		}
		csvData = append(csvData, row)
	}

	c.Writer.Header().Set("Content-Type", "text/csv")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=discussion_%s_stats.csv", discussionID))
	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	for _, row := range csvData {
		if err := writer.Write(row); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate CSV"})
			return
		}
	}
}

func average(nums []int) float64 {
	if len(nums) == 0 {
		return 0.0
	}
	sum := 0
	for _, n := range nums {
		sum += n
	}
	return float64(sum) / float64(len(nums))
}
