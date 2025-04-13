package structures

type ArchiveResponse struct {
	Data  []ArchiveItem `json:"data"`
	Total int           `json:"total"`
	Page  int           `json:"page"`
	Limit int           `json:"limit"`
}
type ArchiveItem struct {
	ID                int      `json:"id"`
	Name              string   `json:"name"`
	Mode              string   `json:"mode"`
	SubType           string   `json:"subtype"`
	KeyQuestions      []string `json:"key_questions"`
	Tags              []string `json:"tags"`
	TopicID           int      `json:"topic_id"`
	SubtopicID        int      `json:"subtopic_id"`
	Topic             string   `json:"topic"`
	Subtopic          string   `json:"subtopic"`
	CustomTopic       string   `json:"custom_topic"`
	CustomSubtopic    string   `json:"custom_subtopic"`
	Public            bool     `json:"public"`
	ParticipantsCount int      `json:"participants_count"`
}
