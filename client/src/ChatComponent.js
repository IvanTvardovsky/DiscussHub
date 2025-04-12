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
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

const topics = [
    { id: 1, title: 'Технологии', icon: '💻' },
    { id: 2, title: 'Здоровье и благополучие', icon: '🏥' },
    { id: 3, title: 'Образование и саморазвитие', icon: '📚' },
    { id: 4, title: 'Искусство и культура', icon: '🎨' },
    { id: 5, title: 'Путешествия и приключения', icon: '✈️' },
    { id: 6, title: 'Экология и устойчивое развитие', icon: '🌱' }
];

const subtopics = {
    1: [
        { id: 101, title: 'Как ИИ влияет на рынок труда?' },
        { id: 102, title: 'Этика в разработке новых технологий' },
        { id: 103, title: 'Развитие квантовых вычислений' },
        { id: 104, title: 'Интернет вещей (IoT)' },
        { id: 105, title: 'Кибербезопасность' }
    ],
    2: [
        { id: 201, title: 'Здоровое питание' },
        { id: 202, title: 'Физическая активность' },
        { id: 203, title: 'Психическое здоровье' },
        { id: 204, title: 'Медитация и релаксация' },
        { id: 205, title: 'Профилактика заболеваний' }
    ],
    3: [
        { id: 301, title: 'Онлайн-курсы' },
        { id: 302, title: 'Чтение и литература' },
        { id: 303, title: 'Языковое обучение' },
        { id: 304, title: 'Навыки будущего' },
        { id: 305, title: 'Образовательные технологии' }
    ],
    4: [
        { id: 401, title: 'Современное искусство' },
        { id: 402, title: 'Классическая музыка' },
        { id: 403, title: 'Кино и театр' },
        { id: 404, title: 'Литература и поэзия' },
        { id: 405, title: 'Культурное наследие' }
    ],
    5: [
        { id: 501, title: 'Популярные направления' },
        { id: 502, title: 'Культурные путешествия' },
        { id: 503, title: 'Приключенческий туризм' },
        { id: 504, title: 'Путешествия с семьей' },
        { id: 505, title: 'Фотография путешествий' }
    ],
    6: [
        { id: 601, title: 'Возобновляемая энергия' },
        { id: 602, title: 'Эко-инициативы' },
        { id: 603, title: 'Зеленые технологии' },
        { id: 604, title: 'Сохранение биоразнообразия' },
        { id: 605, title: 'Устойчивое потребление' }
    ]
};

const getTopicNameById = (topicId) => {
    const topic = topics.find((t) => t.id === topicId);
    return topic ? `${topic.icon} ${topic.title}` : 'N/A';
};

const getSubtopicNameById = (topicId, subtopicId) => {
    if (!topicId || !subtopicId) return 'N/A';
    const group = subtopics[topicId];
    if (!group) return 'N/A';
    const sub = group.find((s) => s.id === subtopicId);
    return sub ? sub.title : 'N/A';
};

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
    const [roomDetails, setRoomDetails] = useState(null);
    const [isRoomDetailsCollapsed, setIsRoomDetailsCollapsed] = useState(false);

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
        const fetchRoomDetails = async () => {
            try {
                const response = await fetch(
                    `http://127.0.0.1:8080/room/${selectedDiscussionId}/details`
                );
                if (!response.ok) throw new Error('Ошибка загрузки данных комнаты');
                const data = await response.json();
                setRoomDetails(data);
            } catch (error) {
                setError(error.message);
                setRoomDetails(null);
            }
        };

        if (selectedDiscussionId) fetchRoomDetails();
    }, [selectedDiscussionId]);

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
                    px: 1,
                    gap: 2
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={isRoomDetailsCollapsed ? "Показать детали" : "Скрыть детали"}>
                        <IconButton
                            onClick={() => setIsRoomDetailsCollapsed(!isRoomDetailsCollapsed)}
                            size="small"
                        >
                            {isRoomDetailsCollapsed ? <ExpandMore /> : <ExpandLess />}
                        </IconButton>
                    </Tooltip>
                    <Typography variant="h5" component="h1">
                        {roomName}
                    </Typography>
                </Box>

                <Button variant="contained" color="secondary" onClick={onLeaveChat}>
                    Покинуть чат
                </Button>
            </Box>

            {!isRoomDetailsCollapsed && roomDetails && (
                <Paper elevation={3} sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                    overflow: 'hidden',
                    transition: '0.3s all'
                }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            {roomDetails.mode === 'personal' ? (
                                roomDetails.subType === 'blitz' ? (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            <strong>Топик:</strong> {getTopicNameById(roomDetails.topic)}
                                        </Typography>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            <strong>Субтопик:</strong> {getSubtopicNameById(roomDetails.topic, roomDetails.subtopic)}
                                        </Typography>
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            <strong>Тема:</strong> {roomDetails.customTopic}
                                        </Typography>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            <strong>Подтема:</strong> {roomDetails.customSubtopic}
                                        </Typography>
                                    </>
                                )
                            ) : (
                                <>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        <strong>Цель:</strong> {roomDetails.purpose}
                                    </Typography>
                                    {roomDetails.keyQuestions?.length > 0 && (
                                        <Box sx={{ mt: 1 }}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                <strong>Ключевые вопросы:</strong>
                                            </Typography>
                                            <Box sx={{
                                                maxHeight: 150,
                                                overflowY: 'auto',
                                                bgcolor: 'background.default',
                                                borderRadius: 1,
                                                p: 1,
                                                mt: 0.5
                                            }}>
                                                {roomDetails.keyQuestions.map((q, index) => (
                                                    <Typography
                                                        key={index}
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                            mb: 0.5
                                                        }}
                                                    >
                                                        • {q}
                                                    </Typography>
                                                ))}
                                            </Box>
                                        </Box>
                                    )}
                                </>
                            )}

                            {roomDetails.description && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        <strong>Описание:</strong>
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            maxHeight: 100,
                                            overflowY: 'auto',
                                            bgcolor: 'background.default',
                                            borderRadius: 1,
                                            p: 1
                                        }}
                                    >
                                        {roomDetails.description}
                                    </Typography>
                                </Box>
                            )}
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {roomDetails.tags?.length > 0 && (
                                    <Typography variant="subtitle2" color="text.secondary">
                                        <strong>Метки:</strong> {roomDetails.tags.join(', ')}
                                    </Typography>
                                )}

                                {roomDetails.duration > 0 && (
                                    <Typography variant="subtitle2" color="text.secondary">
                                        <strong>Длительность:</strong> {roomDetails.duration} минут
                                    </Typography>
                                )}

                                <Typography variant="subtitle2" color="text.secondary">
                                    <strong>Максимум пользователей:</strong> {roomDetails.maxUsers}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}

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
