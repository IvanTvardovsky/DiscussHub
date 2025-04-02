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
	ID              int
	Name            string
	Open            bool
	Password        string
	Users           []*ChatUser
	MaxUsers        int
	TopicID         int    // личный (blitz)
	SubtopicID      int    // личный (blitz)
	CustomTopic     string // личный (free)
	CustomSubtopic  string // личный (free)
	Mode            string // "personal" или "professional"
	SubType         string // "blitz" или "free" (для personal)
	Description     string
	Purpose         string
	KeyQuestions    []string
	Tags            []string
	Hidden          bool
	ExportOptions   []string
	DontJoin        bool
	ReadyUsers      map[string]bool
	CreatorUsername string

	DiscussionActive bool
	StartTime        time.Time
	Duration         time.Duration
	Mu               sync.Mutex

	AssignedTheses []string          // назначенные тезисы для дискуссии
	UserTheses     map[string]string // маппинг пользователь -> тезис
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
	Type     string `json:"type"` // "usual", "system", "ready_check", "timer", "discussion_start", "discussion_end"
	Content  string `json:"content"`
	Username string `json:"username"`
	UserID   string `json:"userID"`
}
