import React, { useState, useEffect, useRef } from 'react';
import {
    Button,
    TextField,
    Typography,
    Container,
    Box,
    Paper,
    Rating,
    Stack,
    Grid,
    Alert,
    Avatar,
    Divider
} from '@mui/material';

const ChatComponent = ({
                           socket,
                           messageHistory,
                           roomName,
                           onLeaveChat,
                           setMessageHistory,
                           onUpdateRoomName,
                           selectedDiscussionId
                       }) => {
    const [messageInput, setMessageInput] = useState('');
    const [isDiscussionActive, setIsDiscussionActive] = useState(false);
    const [showRatingForm, setShowRatingForm] = useState(false);
    const messagesEndRef = useRef(null);
    const [isChatLocked, setIsChatLocked] = useState(false);
    const currentUsername = localStorage.getItem('username');
    const [usersToRate, setUsersToRate] = useState([]);
    const [ratingsData, setRatingsData] = useState({});
    const [ratingCriteria, setRatingCriteria] = useState([]);
    const [isRatingSubmitted, setIsRatingSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [discussionID, setDiscussionID] = useState(null);

    const criterionLabels = {
        professionalism: 'Профессионализм',
        arguments_quality: 'Качество аргументов',
        politeness: 'Вежливость'
    };

    useEffect(() => {
        if (isDiscussionActive) {
            setMessageHistory(prev => prev.filter(m => !m.content.includes('Type '+' to start')));
        }
    }, [isDiscussionActive, setMessageHistory]);

    useEffect(() => {
        if (!socket) return;

        const messageListener = event => {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case 'system':
                    setMessageHistory(prev => [
                        ...prev,
                        { ...message, username: 'system' }
                    ]);
                    break;
                case 'discussion_start':
                    setMessageHistory(prev => [
                        ...prev,
                        { ...message, username: 'system' }
                    ]);
                    setIsDiscussionActive(true);
                    setMessageInput('');
                    break;
                case 'discussion_end':
                    setMessageHistory(prev => [...prev, message]);
                    setIsDiscussionActive(false);
                    setIsChatLocked(true);
                    if (message.discussionID) {
                        setDiscussionID(message.discussionID);
                    }
                    if (message.users && message.criteria) {
                        setUsersToRate(message.users.filter(u => u !== currentUsername));
                        setRatingCriteria(message.criteria);
                        setShowRatingForm(true);
                    }
                    break;
                case 'timer':
                    setMessageHistory(prev => [...prev, message]);
                    break;
                case 'userJoined':
                case 'userLeft':
                    setMessageHistory(prev => [
                        ...prev,
                        { ...message, username: 'system' }
                    ]);
                    break;
                case 'usual':
                    setMessageHistory(prev => {
                        const filtered = prev.filter(m => m.id !== message.tempId);
                        return [
                            ...filtered,
                            {
                                id: message.id,
                                type: message.type,
                                content: message.content,
                                username: message.username,
                                timestamp: new Date(message.timestamp),
                                likeCount: message.likeCount || 0,
                                dislikeCount: message.dislikeCount || 0
                            }
                        ];
                    });
                    break;
                case 'vote_update':
                    setMessageHistory(prev =>
                        prev.map(m =>
                            m.id === message.messageID
                                ? { ...m, likeCount: message.likeCount, dislikeCount: message.dislikeCount }
                                : m
                        )
                    );
                    break;
                case 'rating_info':
                    setUsersToRate(message.users.filter(u => u !== currentUsername));
                    setRatingCriteria(message.criteria);
                    setShowRatingForm(true);
                    setIsChatLocked(true);
                    break;
                default:
                    console.error('Неизвестный тип сообщения:', message.type);
            }
        };

        socket.addEventListener('message', messageListener);
        return () => {
            socket.removeEventListener('message', messageListener);
        };
    }, [socket, onUpdateRoomName, setMessageHistory, currentUsername]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messageHistory]);

    const sendMessage = () => {
        const trimmed = messageInput.trim();
        const username = currentUsername;

        if (!isDiscussionActive) {
            if (trimmed === '+') {
                const msg = { type: 'ready_check', username };
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
                username,
                timestamp: new Date().toISOString(),
                likeCount: 0,
                dislikeCount: 0,
                isPending: true
            };
            setMessageHistory(prev => [...prev, tempMessage]);
            socket.send(
                JSON.stringify({
                    type: 'usual',
                    content: trimmed,
                    username,
                    tempId
                })
            );
            setMessageInput('');
        }
    };

    const handleRatingChange = (username, criterion, value) => {
        setRatingsData(prev => ({
            ...prev,
            [username]: { ...prev[username], [criterion]: value }
        }));
    };

    const validateRatings = () => {
        return usersToRate.every(user =>
            ratingCriteria.every(criterion => ratingsData[user]?.[criterion] > 0)
        );
    };

    const handleRatingSubmit = async () => {
        try {
            if (!validateRatings()) {
                throw new Error('Заполните все оценки перед отправкой');
            }
            if (!discussionID) {
                throw new Error('Не удалось идентифицировать дискуссию');
            }

            const response = await fetch(
                `http://127.0.0.1:8080/rate/final?username=${currentUsername}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        discussionId: discussionID,
                        ratings: ratingsData
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка отправки оценок');
            }

            setShowRatingForm(false);
            setIsRatingSubmitted(true);
            setError(null);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleVote = (messageId, vote) => {
        socket.send(
            JSON.stringify({
                type: 'rate',
                messageID: messageId,
                vote, // число: 1, -1, 0
                username: currentUsername
            })
        );
    };

    return (
        <Container
            component="main"
            maxWidth="md"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                py: 2
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    px: 1
                }}
            >
                <Typography variant="h5" component="h1">
                    {roomName}
                </Typography>
                <Button variant="contained" color="secondary" onClick={onLeaveChat}>
                    Покинуть чат
                </Button>
            </Box>

            <Paper
                elevation={4}
                sx={{
                    flexGrow: 1,
                    p: 2,
                    overflowY: 'auto',
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: 'background.default'
                }}
            >
                {messageHistory.map((message, index) => (
                    <Box
                        key={message.id || index}
                        sx={{
                            mb: 1,
                            p: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: ['system', 'timer', 'discussion_end'].includes(message.type)
                                ? 'center'
                                : 'flex-start',
                            backgroundColor:
                                message.type === 'system' ? 'grey.100' : 'transparent',
                            borderRadius: 1
                        }}
                    >
                        {message.type === 'usual' ? (
                            <>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        width: '100%',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 0.5
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>
                                            {message.username.slice(0, 1).toUpperCase()}
                                        </Avatar>
                                        <Typography variant="subtitle2">
                                            {message.username}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ ml: 1 }}
                                        >
                                            {message.timestamp instanceof Date
                                                ? message.timestamp.toLocaleTimeString()
                                                : new Date(message.timestamp).toLocaleTimeString()}
                                        </Typography>
                                    </Box>
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
                        ) : ['userJoined', 'userLeft', 'system', 'discussion_start'].includes(
                            message.type
                        ) ? (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                                ⚙️ [SYSTEM]: {message.content}
                            </Typography>
                        ) : message.type === 'timer' ? (
                            <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                                ⏳ {message.content}
                            </Typography>
                        ) : message.type === 'discussion_end' ? (
                            <Typography
                                variant="subtitle2"
                                color="error"
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                            >
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
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {messageHistory.some(m => m.type === 'discussion_end')
                        ? 'Дискуссия завершена'
                        : "Напишите '+' чтобы начать"}
                </Typography>
            )}

            {showRatingForm && (
                <Box
                    sx={{
                        mt: 2,
                        p: 2,
                        border: '1px solid',
                        borderColor: 'grey.300',
                        borderRadius: 2,
                        maxHeight: '60vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <Typography variant="h6" gutterBottom>
                        Оцените участников дискуссии
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {usersToRate.length === 0 ? (
                        <Typography color="textSecondary">
                            Нет пользователей для оценки
                        </Typography>
                    ) : (
                        <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, pr: 1 }}>
                            <Grid container spacing={2}>
                                {usersToRate.map(user => (
                                    <Grid item xs={12} sm={6} md={4} key={user}>
                                        <Paper sx={{ p: 2, height: '100%' }}>
                                            <Typography variant="subtitle1" gutterBottom>
                                                {user}
                                            </Typography>
                                            <Stack spacing={2}>
                                                {ratingCriteria.map(criterion => (
                                                    <Box key={criterion}>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                            {criterionLabels[criterion]}
                                                        </Typography>
                                                        <Rating
                                                            size="medium"
                                                            value={ratingsData[user]?.[criterion] || 0}
                                                            onChange={(e, value) =>
                                                                handleRatingChange(user, criterion, value)
                                                            }
                                                        />
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                    <Box
                        sx={{
                            mt: 'auto',
                            position: 'sticky',
                            bottom: 0,
                            backgroundColor: 'background.paper',
                            pt: 2,
                            borderTop: '1px solid',
                            borderColor: 'grey.300'
                        }}
                    >
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleRatingSubmit}
                            disabled={isRatingSubmitted}
                            fullWidth
                        >
                            {isRatingSubmitted ? '✓ Оценки отправлены' : 'Подтвердить все оценки'}
                        </Button>
                    </Box>
                </Box>
            )}

            <Box
                component="form"
                onSubmit={e => {
                    e.preventDefault();
                    sendMessage();
                }}
                sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center'
                }}
            >
                <TextField
                    variant="outlined"
                    fullWidth
                    placeholder={isDiscussionActive ? 'Ваше сообщение...' : "Напишите '+'" }
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    disabled={isChatLocked || showRatingForm}
                    sx={{ flexGrow: 1 }}
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
