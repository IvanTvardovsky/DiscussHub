import React, { useState, useEffect } from 'react';
import Login from './Login';
import Registration from './Registration';
import ChatComponent from './ChatComponent';
import RoomContainer from './RoomContainer';
import {
    Container,
    CssBaseline,
    Snackbar,
    Alert,
    AppBar,
    Toolbar,
    Button
} from '@mui/material';

const ArchiveComponent = () => (
    <Container>
        <div style={{ marginTop: 32 }}>
            <h4>Архив</h4>
            <p>Список завершенных чатов будет здесь</p>
        </div>
    </Container>
);

const ProfileComponent = () => (
    <Container>
        <div style={{ marginTop: 32 }}>
            <h4>Профиль</h4>
            <p>Информация о пользователе будет здесь</p>
        </div>
    </Container>
);

const LeaderboardComponent = () => (
    <Container>
        <div style={{ marginTop: 32 }}>
            <h4>Лидерборд</h4>
            <p>Рейтинг пользователей будет здесь</p>
        </div>
    </Container>
);

const App = () => {
    const [currentView, setCurrentView] = useState('login');
    const [socket, setSocket] = useState(null);
    const [messageHistory, setMessageHistory] = useState([]);
    const [roomName, setRoomName] = useState('AwesomeChat');
    const [error, setError] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const username = localStorage.getItem('username');
        if (username) {
            setIsLoggedIn(true);
            setCurrentView('room');
        }
    }, []);

    const handleLogin = () => {
        setIsLoggedIn(true);
        setCurrentView('room');
    };

    const handleRegistration = () => {
        setCurrentView('registration');
    };

    const navigateTo = (view) => {
        setCurrentView(view);
    };

    const NavigationBar = () => (
        <AppBar position="static">
            <Toolbar>
                <Button color="inherit" onClick={() => navigateTo('room')}>Комнаты</Button>
                <Button color="inherit" onClick={() => navigateTo('archive')}>Архив</Button>
                <Button color="inherit" onClick={() => navigateTo('profile')}>Профиль</Button>
                <Button color="inherit" onClick={() => navigateTo('leaderboard')}>Лидерборд</Button>
            </Toolbar>
        </AppBar>
    );

    const handleJoinRoom = (roomId, password) => {
        const username = localStorage.getItem('username');
        const socketUrl = `ws://127.0.0.1:8080/connectToChatroom/${roomId}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        connectToWebSocket(socketUrl, () => {
            setCurrentView('chat');
        });
    };

    const handleCreateRoom = (roomName, password, open, maxUsers, topic, subtopic) => {
        const username = localStorage.getItem('username');
        const socketUrl = `ws://127.0.0.1:8080/createChatroom/?username=${encodeURIComponent(username)}&roomname=${encodeURIComponent(roomName)}&open=${open}&password=${encodeURIComponent(password)}&maxUsers=${maxUsers}&topic=${topic}&subtopic=${subtopic}`;
        connectToWebSocket(socketUrl, () => {
            setCurrentView('chat');
        });
    };

    const handleRegister = (username, password) => {
        fetch('http://127.0.0.1:8080/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Registration failed');
                }
            })
            .then(data => {
                localStorage.setItem('username', username);
                handleLogin();
            })
            .catch(error => {
                console.error('Registration error:', error);
                setError('Registration failed. Please try again.');
            });
    };

    const connectToWebSocket = (url, onSuccess) => {
        const newSocket = new WebSocket(url);
        newSocket.onopen = () => {
            console.log('Successfully connected to chat room');
            onSuccess();
        };
        newSocket.onclose = (event) => {
            console.log('Socket Closed Connection: ', event);
            setError('Failed to connect to the chat room');
        };
        newSocket.onerror = (error) => {
            console.log('Socket Error: ', error);
            setError('An error occurred while connecting to the chat room');
        };
        // убрали обработчик onmessage
        setSocket(newSocket);
    };

    const handleLeaveChat = () => {
        if (socket) {
            socket.close();
        }
        setMessageHistory([]);
        setCurrentView('room');
    };

    const handleGoToLogin = () => {
        setCurrentView('login');
    };

    const handleCloseError = () => {
        setError(null);
    };

    return (
        <>
            <CssBaseline />
            {isLoggedIn && <NavigationBar />}
            <Container component="main" maxWidth="md" style={{ marginTop: 32 }}>
                {currentView === 'login' && (
                    <Login onLogin={handleLogin} onGoToRegistration={handleRegistration} />
                )}
                {currentView === 'registration' && (
                    <Registration onRegister={handleRegister} onGoToLogin={handleGoToLogin} />
                )}
                {currentView === 'chat' && (
                    <ChatComponent
                        socket={socket}
                        messageHistory={messageHistory}
                        roomName={roomName}
                        onUpdateRoomName={setRoomName}
                        onLeaveChat={handleLeaveChat}
                        setMessageHistory={setMessageHistory}
                    />
                )}
                {currentView === 'room' && (
                    <RoomContainer
                        onJoinRoom={handleJoinRoom}
                        onCreateRoom={handleCreateRoom}
                    />
                )}
                {currentView === 'archive' && <ArchiveComponent />}
                {currentView === 'profile' && <ProfileComponent />}
                {currentView === 'leaderboard' && <LeaderboardComponent />}
                <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseError}>
                    <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
                        {error}
                    </Alert>
                </Snackbar>
            </Container>
        </>
    );
};

export default App;
