package structures

type DiscussionResponse struct {
	ID            int       `json:"id"`
	RoomID        int       `json:"room_id"`
	RoomName      string    `json:"room_name"`
	Public        bool      `json:"public"`
	Mode          string    `json:"mode"`
	SubType       string    `json:"subtype"`
	Duration      string    `json:"duration"`
	StartTime     string    `json:"start_time"`
	EndTime       string    `json:"end_time"`
	Messages      []Message `json:"messages"`
	Creator       string    `json:"creator"`
	KeyQuestions  []string  `json:"key_questions"`
	Tags          []string  `json:"tags"`
	ExportOptions []string  `json:"export_options"`
	Participants  []string  `json:"participants"`
	Topic         string    `json:"topic"`
	Subtopic      string    `json:"subtopic"`
	Description   string    `json:"description"`
	Purpose       string    `json:"purpose"`
}
