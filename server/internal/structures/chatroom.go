package structures

import (
	"github.com/gorilla/websocket"
	"sync"
	"time"
)

type ChatRequest struct {
	ChatNumber int `json:"chatNumber"`
}

type ChatUser struct {
	ID         int
	Name       string
	Connection *websocket.Conn
}

type Room struct {
	ID       int
	Name     string
	Open     bool
	Password string
	Users    []*ChatUser
	MaxUsers int

	TopicID    int // личный (blitz)
	SubtopicID int // личный (blitz)

	CustomTopic    string // личный (free)
	CustomSubtopic string // личный (free)

	Mode    string // "personal" или "professional"
	SubType string // "blitz" или "free" (для personal)

	Description string

	Purpose       string
	KeyQuestions  []string
	Tags          []string
	ExportOptions []string
	DontJoin      bool

	Hidden          bool
	ReadyUsers      map[string]bool
	CreatorUsername string
	Participants    []string // для кого в архиве будет доступен диалог (пока что берутся просто юзеры в момент старта дискуссии)

	DiscussionActive bool
	StartTime        time.Time
	Duration         time.Duration

	Messages []Message `json:"messages"`
	Mu       sync.Mutex

	AssignedTheses []string          // назначенные тезисы для дискуссии
	UserTheses     map[string]string // маппинг пользователь -> тезис
	DiscussionID   int
}

type RoomForList struct {
	ID               int      `json:"id"`
	Name             string   `json:"name"`
	Open             bool     `json:"open"`
	Users            int      `json:"users"`
	MaxUsers         int      `json:"maxUsers"`
	Mode             string   `json:"mode"`
	SubType          string   `json:"subType"`
	TopicID          int      `json:"topic"`          // blitz
	SubtopicID       int      `json:"subtopic"`       // blitz
	CustomTopic      string   `json:"customTopic"`    // free
	CustomSubtopic   string   `json:"customSubtopic"` // free
	Description      string   `json:"description"`
	Purpose          string   `json:"purpose"`
	KeyQuestions     []string `json:"keyQuestions"`
	Tags             []string `json:"tags"`
	ExportOptions    []string `json:"exportOptions"`
	DontJoin         bool     `json:"dontJoin"`
	DiscussionActive bool     `json:"discussionActive"`
	Duration         int      `json:"duration"` // в минутах
	StartTime        string   `json:"startTime,omitempty"`
}

type Message struct {
	ID           string         `json:"id"`
	Type         string         `json:"type"` // "usual", "system", "ready_check", "timer", "discussion_start", "discussion_end"
	Content      string         `json:"content"`
	Username     string         `json:"username"`
	UserID       string         `json:"userID"`
	Timestamp    time.Time      `json:"timestamp"`
	LikeCount    int            `json:"likeCount"`
	DislikeCount int            `json:"dislikeCount"`
	LikedBy      []string       `json:"likedBy"` // usernames
	DislikedBy   []string       `json:"dislikedBy"`
	Votes        map[string]int `json:"-"` // username -> vote (-1, 0, 1)
	TempID       string         `json:"tempId,omitempty"`
}

type RateMessage struct {
	UserID          string `json:"userID"`    // todo кто прислал
	Username        string `json:"username"`  // кто прислал
	Type            string `json:"type"`      // "usual", "system", "ready_check", "timer", "discussion_start", "discussion_end"
	TargetMessageID string `json:"messageID"` // uuid
	Vote            int    `json:"vote"`      // (-1, 0, 1)
}

type FinalRateMessage struct {
	DiscussionID int      `json:"discussionID"`
	Type         string   `json:"type"`
	Users        []string `json:"users"`
	Criteria     []string `json:"criteria"`
}
