import React, { useState, useEffect, useRef } from 'react';
import { Button, TextField, Typography, Container, Box, Paper, Rating, Stack } from '@mui/material';

const ChatComponent = ({ socket, messageHistory, roomName, onLeaveChat, setMessageHistory, onUpdateRoomName }) => {
    const [messageInput, setMessageInput] = useState('');
    const [isDiscussionActive, setIsDiscussionActive] = useState(false);
    const [showRatingForm, setShowRatingForm] = useState(false);
    const [ratings, setRatings] = useState({ politeness: 0, argumentsQuality: 0 });
    const messagesEndRef = useRef(null);
    const [isChatLocked, setIsChatLocked] = useState(false);
    const currentUsername = localStorage.getItem('username');

    useEffect(() => {
        if (isDiscussionActive) {
            setMessageHistory(prev =>
                prev.filter(m => !m.content.includes('Type '+' to start'))
            );
        }
    }, [isDiscussionActive]);

    useEffect(() => {
        if (!socket) return;

        const messageListener = (event) => {
            console.log('MESSAGE IN CHAT COMPONENT:', event.data);
            const message = JSON.parse(event.data);

            switch(message.type) {
                case 'system':
                    setMessageHistory(prev => [...prev, {
                        ...message,
                        username: 'system' // форматируем как системное
                    }]);
                    break;
                case 'discussion_start':
                    setMessageHistory(prev => [...prev, {
                        ...message,
                        username: 'system' // форматируем как системное
                    }]);
                    setIsDiscussionActive(true);
                    setMessageInput('');
                    break;
                case 'discussion_end':
                    setMessageHistory(prev => [...prev, message]);
                    setIsDiscussionActive(false);
                    setIsChatLocked(true);
                    setShowRatingForm(true);
                    break;
                case 'timer':
                    setMessageHistory(prev => [...prev, message]);
                    break;
                case 'userJoined':
                case 'userLeft':
                    setMessageHistory(prev => [...prev, {
                        ...message,
                        username: 'system' // форматируем как системное
                    }]);
                    break;
                // case 'setRoomName':
                //     console.log('Updating room name to:', message.content);
                //     onUpdateRoomName(message.content);
                //     break;
                case 'usual':
                    setMessageHistory(prev => {
                        const filtered = prev.filter(m => m.id !== message.tempId);
                        return [...filtered, {
                            id: message.id,
                            type: message.type,
                            content: message.content,
                            username: message.username,
                            timestamp: new Date(message.timestamp),
                            likeCount: message.likeCount || 0,
                            dislikeCount: message.dislikeCount || 0
                        }];
                    });
                    break;
                case 'vote_update':
                    setMessageHistory(prev => prev.map(m => {
                        if (m.id === message.messageID) {
                            return {
                                ...m,
                                likeCount: message.likeCount,
                                dislikeCount: message.dislikeCount
                            };
                        }
                        return m;
                    }));
                    break;
                default:
                    console.error('Неизвестный тип сообщения:', message.type);
            }
        };

        socket.addEventListener('message', messageListener);
        return () => {
            socket.removeEventListener('message', messageListener);
        };
    }, [socket, onUpdateRoomName, setMessageHistory]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messageHistory]);

    const sendMessage = () => {
        const trimmed = messageInput.trim();
        const username = localStorage.getItem('username');

        if (!isDiscussionActive) {
            if (trimmed === '+') {
                const msg = {
                    type: 'ready_check',
                    username: username
                };
                socket.send(JSON.stringify(msg));
                setMessageInput('');
            }
            return;
        }

        if (trimmed !== '') {
            const tempId = `temp-${Date.now()}`;
            const tempMessage = {
                id: tempId,
                type: 'usual',
                content: trimmed,
                username: username,
                timestamp: new Date().toISOString(),
                likeCount: 0,
                dislikeCount: 0,
                isPending: true
            };

            setMessageHistory(prev => [...prev, tempMessage]);
            socket.send(JSON.stringify({
                type: 'usual',
                content: trimmed,
                username: username,
                tempId: tempId
            }));
            setMessageInput('');
        }
    };

    const handleRatingSubmit = () => {
        socket.send(JSON.stringify({
            type: 'rate',
            ratings: {
                politeness: ratings.politeness,
                argumentsQuality: ratings.argumentsQuality
            },
            username: localStorage.getItem('username')
        }));
        setShowRatingForm(false);
        setRatings({ politeness: 0, argumentsQuality: 0 });
        setIsChatLocked(true);
    };

    const handleVote = (messageId, vote) => {
        socket.send(JSON.stringify({
            type: 'rate',
            messageID: messageId,
            vote: vote, // отправляем как число (1, -1, 0)
            username: currentUsername,
        }));
    };

    return (
        <Container component="main" maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">{roomName}</Typography>
                <Button variant="contained" color="secondary" onClick={onLeaveChat}>
                    Покинуть чат
                </Button>
            </Box>

            <Paper elevation={3} sx={{ mt: 2, p: 2, flexGrow: 1, overflowY: 'auto' }}>
                {messageHistory.map((message, index) => (
                    <Box
                        key={message.id || index}
                        sx={{
                            mb: 1,
                            textAlign: ['system', 'timer', 'discussion_end'].includes(message.type)
                                ? 'center'
                                : 'left',
                            bgcolor: message.type === 'system' ? '#f5f5f5' : 'transparent',
                            p: 1,
                            borderRadius: 1
                        }}
                    >
                        {message.type === 'usual' ? (
                                <>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="subtitle2">
                                            {message.username}
                                            <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                                                {message.timestamp instanceof Date ?
                                                    message.timestamp.toLocaleTimeString() :
                                                    new Date(message.timestamp).toLocaleTimeString()}
                                            </Typography>
                                        </Typography>
                                        <Box>
                                            <Button
                                                size="small"
                                                onClick={() => handleVote(message.id, 1)}
                                                disabled={message.username === currentUsername}
                                            >
                                                👍 {message.likeCount}
                                            </Button>
                                            <Button
                                                size="small"
                                                onClick={() => handleVote(message.id, -1)}
                                                disabled={message.username === currentUsername}
                                                sx={{ ml: 1 }}
                                            >
                                                👎 {message.dislikeCount}
                                            </Button>
                                        </Box>
                                    </Box>
                                    <Typography variant="body1">{message.content}</Typography>
                                </>
                            ) : ['userJoined', 'userLeft', 'system', 'discussion_start'].includes(message.type) ? (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>⚙️</span>
                                <span>[SYSTEM]: {message.content}</span>
                            </Typography>
                        ) : message.type === 'timer' ? (
                            <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                ⏳ {message.content}
                            </Typography>
                        ) : message.type === 'discussion_end' ? (
                            <Typography variant="subtitle2" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                🚩 {message.content}
                            </Typography>
                        ) : (
                            <>
                                <strong>{message.username}: </strong>
                                {message.content}
                            </>
                        )}
                    </Box>
                ))}
                <div ref={messagesEndRef} />
            </Paper>

            {!isDiscussionActive && !showRatingForm && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                    {messageHistory.some(m => m.type === 'discussion_end')
                        ? "Дискуссия завершена"
                        : "Напишите '+' чтобы начать"}
                </Typography>
            )}

            {showRatingForm && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="h6">Оцените дискуссию</Typography>
                    <Stack spacing={3} sx={{ mt: 2, maxWidth: 300, margin: '0 auto' }}>
                        <div>
                            <Typography>Вежливость</Typography>
                            <Rating
                                size="large"
                                value={ratings.politeness}
                                onChange={(e, value) => setRatings(prev => ({ ...prev, politeness: value }))}
                            />
                        </div>
                        <div>
                            <Typography>Качество аргументов</Typography>
                            <Rating
                                size="large"
                                value={ratings.argumentsQuality}
                                onChange={(e, value) => setRatings(prev => ({ ...prev, argumentsQuality: value }))}
                            />
                        </div>
                        <Button
                            variant="contained"
                            onClick={handleRatingSubmit}
                            disabled={!ratings.politeness || !ratings.argumentsQuality}>
                            Отправить оценку
                        </Button>
                    </Stack>
                </Box>
            )}

            <Box component="form" onSubmit={e => e.preventDefault()} sx={{ mt: 2, display: 'flex' }}>
                <TextField
                    variant="outlined"
                    fullWidth
                    placeholder={isDiscussionActive ? "Ваше сообщение..." : "Напишите '+'"}
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    disabled={isChatLocked || showRatingForm}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={sendMessage}
                    disabled={
                        isChatLocked ||
                        (isDiscussionActive && messageInput.trim() === '') ||
                        (!isDiscussionActive && messageInput.trim() !== '+') ||
                        showRatingForm
                    }
                >
                    Отправить
                </Button>
            </Box>
        </Container>
    );
};

export default ChatComponent;