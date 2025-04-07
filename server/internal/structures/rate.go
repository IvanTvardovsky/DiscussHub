package structures

type RatingRequest struct {
	DiscussionID int                       `json:"discussionId"`
	Ratings      map[string]map[string]int `json:"ratings"`
}
