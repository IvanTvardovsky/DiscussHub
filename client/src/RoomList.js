import React, { useState, useEffect, useRef } from 'react';
import {
    Button,
    TextField,
    Typography,
    Container,
    Grid,
    Card,
    CardContent,
    CardActions,
    CardHeader,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    MenuItem,
    Box
} from '@mui/material';

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

const RoomList = ({ onJoinRoom }) => {
    const [availableRooms, setAvailableRooms] = useState([]);
    const [filterTopic, setFilterTopic] = useState(0); // 0 – все топики
    const [filterSubtopic, setFilterSubtopic] = useState(0); // 0 – все субтопики
    const socketRef = useRef(null);

    const [openDirectJoin, setOpenDirectJoin] = useState(false);
    const [directRoomId, setDirectRoomId] = useState('');
    const [directRoomPassword, setDirectRoomPassword] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [dialogPassword, setDialogPassword] = useState('');

    useEffect(() => {
        const socket = new WebSocket('ws://127.0.0.1:8080/roomUpdates');
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('Connected to room updates WebSocket');
            sendFilterUpdate(filterTopic, filterSubtopic);
        };

        socket.onmessage = (event) => {
            const rooms = JSON.parse(event.data);
            setAvailableRooms(rooms);
        };

        socket.onclose = (event) => {
            console.log('Room updates socket closed:', event);
        };

        socket.onerror = (error) => {
            console.log('Room updates socket error:', error);
        };

        return () => {
            socket.close();
        };
    }, []);

    const sendFilterUpdate = (topic, subtopic) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            const filterData = { type: 'filter', topic, subtopic };
            socketRef.current.send(JSON.stringify(filterData));
        }
    };

    const handleFilterTopicChange = (e) => {
        const newTopic = parseInt(e.target.value, 10);
        setFilterTopic(newTopic);
        setFilterSubtopic(0);
        sendFilterUpdate(newTopic, 0);
    };

    const handleFilterSubtopicChange = (e) => {
        const newSubtopic = parseInt(e.target.value, 10);
        setFilterSubtopic(newSubtopic);
        sendFilterUpdate(filterTopic, newSubtopic);
    };

    const handleJoinRoomClick = (room) => {
        if (room.open) {
            onJoinRoom(room.id, '');
        } else {
            setSelectedRoomId(room.id);
            setOpenDialog(true);
        }
    };

    const handleDialogClose = () => {
        setOpenDialog(false);
        setDialogPassword('');
        setSelectedRoomId(null);
    };

    const handleJoinRoomWithPassword = () => {
        if (selectedRoomId !== null) {
            onJoinRoom(selectedRoomId, dialogPassword);
            handleDialogClose();
        }
    };

    const handleDirectJoin = () => {
        if (directRoomId.trim() !== '') {
            onJoinRoom(directRoomId.trim(), directRoomPassword.trim());
            setOpenDirectJoin(false);
            setDirectRoomId('');
            setDirectRoomPassword('');
        }
    };

    const renderRoomTopic = (room) => {
        if (room.mode === 'personal') {
            if (room.subType === 'blitz') {
                return (
                    <>
                        <Typography variant="body2" color="text.secondary" component="p">
                            Топик: {getTopicNameById(room.topic)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" component="p">
                            Субтопик: {getSubtopicNameById(room.topic, room.subtopic)}
                        </Typography>
                    </>
                );
            } else if (room.subType === 'free') {
                return (
                    <>
                        <Typography variant="body2" color="text.secondary" component="p">
                            Тема: {room.customTopic}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" component="p">
                            Подтема: {room.customSubtopic}
                        </Typography>
                    </>
                );
            }
        }

        if (room.mode === 'professional') {
            return (
                <Typography variant="body2" color="text.secondary" component="p">
                    Цель: {room.purpose}
                </Typography>
            );
        }
        return null;
    };

    return (
        <Container component="main" maxWidth="lg">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" component="h2">
                    Доступные комнаты
                </Typography>
                <Button variant="outlined" onClick={() => setOpenDirectJoin(true)}>
                    Войти по ID комнаты
                </Button>
            </Box>

            <Box display="flex" gap={2} mb={2}>
                <TextField
                    select
                    label="Топик"
                    value={filterTopic}
                    onChange={handleFilterTopicChange}
                    size="small"
                >
                    <MenuItem value={0}>Все топики</MenuItem>
                    {topics.map((topic) => (
                        <MenuItem key={topic.id} value={topic.id}>
                            {topic.title}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    label="Субтопик"
                    value={filterSubtopic}
                    onChange={handleFilterSubtopicChange}
                    size="small"
                    disabled={filterTopic === 0}
                >
                    <MenuItem value={0}>Все субтопики</MenuItem>
                    {filterTopic !== 0 &&
                        subtopics[filterTopic]?.map((sub) => (
                            <MenuItem key={sub.id} value={sub.id}>
                                {sub.title}
                            </MenuItem>
                        ))}
                </TextField>
            </Box>

            <Grid container spacing={3} sx={{ padding: 3 }}>
                {availableRooms.map((room) => (
                    <Grid
                        item
                        key={room.id}
                        xs={12}
                        sm={6}
                        md={4}
                        lg={3}
                        xl={2}
                        sx={{
                            display: 'flex',
                            minWidth: 300,
                        }}
                    >
                        <Card
                            variant="outlined"
                            sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                borderRadius: 2,
                                boxShadow: 3,
                                transition: 'transform 0.3s, box-shadow 0.3s',
                                '&:hover': {
                                    transform: 'scale(1.03)',
                                    boxShadow: 6
                                }
                            }}
                        >
                            <CardHeader
                                title={
                                    <Typography variant="h6" component="div">
                                        {room.name}
                                    </Typography>
                                }
                                subheader={
                                    <>
                                        {`ID: ${room.id} — ${room.open ? 'Открытая' : 'Закрытая'}`}
                                        {room.discussionActive && " • Активная дискуссия"}
                                    </>
                                }
                            />
                            <CardContent>
                                <Typography variant="body2" color="text.secondary" component="p">
                                    Пользователи: {room.users}/{room.maxUsers}
                                </Typography>
                                {renderRoomTopic(room)}
                                {room.duration > 0 && (
                                    <Typography variant="body2" color="text.secondary" component="p">
                                        Длительность: {room.duration} мин
                                    </Typography>
                                )}
                                {room.discussionActive && (
                                    <Typography
                                        variant="body2"
                                        color="error.main"
                                        component="p"
                                        sx={{ mt: 1, fontWeight: 'bold' }}
                                    >
                                        Дискуссия уже началась
                                    </Typography>
                                )}
                            </CardContent>

                            {!room.discussionActive && (
                                <CardActions>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        onClick={() => handleJoinRoomClick(room)}
                                    >
                                        Присоединиться
                                    </Button>
                                </CardActions>
                            )}
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={openDirectJoin} onClose={() => setOpenDirectJoin(false)}>
                <DialogTitle>Вход по ID комнаты</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Введите ID комнаты и, если требуется, пароль для входа.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Room ID"
                        fullWidth
                        value={directRoomId}
                        onChange={(e) => setDirectRoomId(e.target.value)}
                    />
                    <TextField
                        margin="dense"
                        label="Пароль"
                        type="password"
                        fullWidth
                        value={directRoomPassword}
                        onChange={(e) => setDirectRoomPassword(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDirectJoin(false)} color="primary">
                        Отмена
                    </Button>
                    <Button onClick={handleDirectJoin} color="primary">
                        Войти
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDialog} onClose={handleDialogClose}>
                <DialogTitle>Введите пароль</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Эта комната закрыта. Введите пароль для входа.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Пароль"
                        type="password"
                        fullWidth
                        value={dialogPassword}
                        onChange={(e) => setDialogPassword(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose} color="primary">
                        Отмена
                    </Button>
                    <Button onClick={handleJoinRoomWithPassword} color="primary">
                        Войти
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default RoomList;
