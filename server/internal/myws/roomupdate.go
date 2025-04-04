package myws

import (
	"awesomeChat/internal/structures"
	"awesomeChat/package/logger"
	"github.com/gorilla/websocket"
	"net/http"
	"sort"
)

// HandleConnections апгрейдит соединение до вебсокета при заходе пользователя в список чатрумов, чтобы динамически показывать открытые
func (server *WebSocketServer) HandleConnections(w http.ResponseWriter, r *http.Request, rooms *map[int]*structures.Room) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Failed to upgrade connection", http.StatusInternalServerError)
		return
	}
	defer func(ws *websocket.Conn) {
		err = ws.Close()
		if err != nil {
			//todo
		}
	}(ws)

	server.mu.Lock()
	roomsToSend := structures.MakeRoomList(rooms)
	server.clients[ws] = struct{}{}

	sort.Slice(*roomsToSend, func(i, j int) bool {
		return (*roomsToSend)[i].ID < (*roomsToSend)[j].ID
	})

	// отправить текущий список комнат новому клиенту
	logger.Log.Traceln("To new client: ", *roomsToSend)
	if err = ws.WriteJSON(*roomsToSend); err != nil {
		delete(server.clients, ws)
		err = ws.Close()
		if err != nil {
			//todo
		}
	}
	server.mu.Unlock()

	for {
		_, _, err = ws.ReadMessage()
		if err != nil {
			server.mu.Lock()
			delete(server.clients, ws)
			server.mu.Unlock()
			break
		}
	}
}

// вечно слушаем канал. если там обновление -> рассылаем всем клиентам новый набор комнат
func (server *WebSocketServer) HandleMessages() {
	for {
		rooms := <-server.Broadcast

		server.mu.Lock()
		for client := range server.clients {
			err := client.WriteJSON(rooms)
			if err != nil {
				err = client.Close()
				if err != nil {
					logger.Log.Errorln(err)
				}
				delete(server.clients, client)
			}
		}
		server.mu.Unlock()
	}
}
