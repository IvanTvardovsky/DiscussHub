package structures

import "time"

// MakeRoomList формирует список комнат для фронтенда, пропускает скрытые комнаты
func MakeRoomList(rooms *map[int]*Room) *[]RoomForList {
	roomList := make([]RoomForList, 0, len(*rooms))

	for _, room := range *rooms {
		if room.Hidden {
			continue
		}

		var startTime string
		if !room.StartTime.IsZero() {
			startTime = room.StartTime.Format(time.RFC3339)
		}

		roomList = append(roomList, RoomForList{
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
			StartTime:        startTime,
		})
	}

	return &roomList
}
