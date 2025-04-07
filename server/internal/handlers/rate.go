package handlers

import (
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"net/http"
)

func RateOpponent(c *gin.Context, db *sql.DB) {
	username := c.Query("username")

	var raterUserID int
	err := db.QueryRow("SELECT user_id FROM users WHERE username = $1", username).Scan(&raterUserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req structures.RatingRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	logger.Log.Traceln("Req DiscussionID:", req.DiscussionID)

	var exists bool
	err = db.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM discussions WHERE id = $1 AND participants @> jsonb_build_array($2::text))",
		req.DiscussionID,
		username,
	).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusForbidden, gin.H{"error": "Discussion not found or user is not a participant"})
		return
	}

	ratedUsernames := make([]string, 0, len(req.Ratings))
	for usrnm := range req.Ratings {
		ratedUsernames = append(ratedUsernames, usrnm)
	}

	rows, err := db.Query("SELECT user_id, username FROM users WHERE username = ANY($1)", pq.Array(ratedUsernames))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	defer rows.Close()

	userIDMap := make(map[string]int)
	for rows.Next() {
		var userID int
		var usrnm string
		if err = rows.Scan(&userID, &usrnm); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}
		userIDMap[usrnm] = userID
	}

	for usrnm := range req.Ratings {
		if _, ok := userIDMap[usrnm]; !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("User %s not found", usrnm)})
			return
		}
	}

	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	defer tx.Rollback()

	for ratedUsername, criteria := range req.Ratings {
		ratedUserID := userIDMap[ratedUsername]
		if ratedUserID == raterUserID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot rate yourself"})
			return
		}

		requiredCriteria := map[string]bool{
			"professionalism":   true,
			"arguments_quality": true,
			"politeness":        true,
		}
		for crit := range criteria {
			delete(requiredCriteria, crit)
		}
		if len(requiredCriteria) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required criteria"})
			return
		}

		_, err = tx.Exec(`
			INSERT INTO ratings (
				discussion_id, rater_user_id, rated_user_id, 
				professionalism, arguments_quality, politeness
			) VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (discussion_id, rater_user_id, rated_user_id) DO NOTHING`,
			req.DiscussionID, raterUserID, ratedUserID,
			criteria["professionalism"], criteria["arguments_quality"], criteria["politeness"],
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save rating"})
			return
		}
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ratings submitted successfully"})
}
