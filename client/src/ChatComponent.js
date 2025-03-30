import React, { useState, useEffect, useRef } from 'react';
import { Button, TextField, Typography, Container, Box, Paper, Rating, Stack } from '@mui/material';

const ChatComponent = ({ socket, messageHistory, roomName, onLeaveChat, setMessageHistory, onUpdateRoomName }) => {
    const [messageInput, setMessageInput] = useState('');
    const [isDiscussionActive, setIsDiscussionActive] = useState(false);
    const [showRatingForm, setShowRatingForm] = useState(false);
    const [ratings, setRatings] = useState({ politeness: 0, argumentsQuality: 0 });
    const messagesEndRef = useRef(null);

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
            console.log('MESSAGE IN CHAT COMPONENT:', event.data); // Добавим логирование
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
                    setMessageHistory(prev => [...prev, message]);
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

    const sendMessage = () => { console.log('MESSAGE IN CHAT COMPONENT:', event.data); // Добавим логирование
        const trimmed = messageInput.trim();

        if (!isDiscussionActive) {
            if (trimmed === '+') {
                const msg = {
                    type: 'ready_check',
                    username: localStorage.getItem('username')
                };
                socket.send(JSON.stringify(msg));
            }
            setMessageInput('');
            return;
        }

        if (trimmed !== '') {
            const newMessage = {
                type: 'usual',
                content: trimmed,
                username: localStorage.getItem('username')
            };
            // добавляем сообщение в историю сразу
            setMessageHistory(prev => [...prev, newMessage]);
            socket.send(JSON.stringify(newMessage));
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
                        key={index}
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
                        {['userJoined', 'userLeft', 'system', 'discussion_start'].includes(message.type) ? (
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
                    disabled={showRatingForm}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={sendMessage}
                    disabled={
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