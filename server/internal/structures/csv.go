package structures

type UserStats struct {
	UserID                   int
	Username                 string
	MessagesSent             int
	LikesReceived            int
	DislikesReceived         int
	LikesGiven               int
	DislikesGiven            int
	ProfessionalismReceived  []int
	ArgumentsQualityReceived []int
	PolitenessReceived       []int
	ProfessionalismGiven     []int
	ArgumentsQualityGiven    []int
	PolitenessGiven          []int
}
