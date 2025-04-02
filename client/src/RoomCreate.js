import React, { useState } from 'react';
import {
    Button,
    TextField,
    Typography,
    Container,
    Grid,
    RadioGroup,
    FormControlLabel,
    Radio,
    MenuItem,
    Box,
    FormControl,
    FormLabel,
    Checkbox,
    FormGroup,
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
        { id: 504, title: 'Путешествия с семьёй' },
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

const professionalPurposes = [
    'Мозговой штурм',
    'Защита проекта',
    'Решение кейса',
    'Тимбилдинг',
    'Обсуждение проекта'
];

const RoomCreate = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        mode: 'personal',           // 'personal' или 'professional'
        subType: 'blitz',           // 'blitz' (блиц-дебаты) или 'free' (свободное общение)
        topic: 1,                   // для блиц-дебатов
        subtopic: 101,              // для блиц-дебатов
        customTopic: '',            // для свободного общения (тема — обязательно)
        customSubtopic: '',         // для свободного общения (подтема — опционально)
        timer: 30,
        maxParticipants: 2,
        description: '',
        password: '',
        purpose: '',
        keyQuestions: '',
        tags: '',
        hidden: false,
        exportOptions: [],
        dontJoin: false,            // "не присоединять меня в комнату" для проф. режима
    });

    const handleNextStep = () => {
        if (step === 1 && validateStep1()) setStep(2);
        else if (step === 2 && validateStep2()) handleCreate();
    };

    const validateStep1 = () => {
        if (formData.name.trim() === '' || formData.timer <= 0) return false;
        // если личный режим и свободное общение — тема обязательна
        if (formData.mode === 'personal' && formData.subType === 'free' && formData.customTopic.trim() === '') return false;
        return true;
    };

    const validateStep2 = () => {
        if (formData.mode === 'professional') {
            return formData.password.trim() !== '' && formData.purpose !== '';
        }
        return true;
    };

    const handleCreate = async () => {
        let roomData = {
            name: formData.name,
            mode: formData.mode,
            subType: formData.subType,
            timer: Number(formData.timer),
            maxParticipants: Number(formData.maxParticipants),
            description: formData.description,
            password: formData.password,
            purpose: formData.purpose,
            // ключевые вопросы и теги в массивы
            keyQuestions: formData.keyQuestions.split('\n').filter(q => q.trim()),
            tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
            hidden: formData.hidden,
            exportOptions: formData.exportOptions,
            dontJoin: formData.dontJoin,

            topic: formData.mode === 'personal'
                ? (formData.subType === 'free' ? formData.customTopic : formData.topic)
                : undefined,
            subtopic: formData.mode === 'personal'
                ? (formData.subType === 'free' ? formData.customSubtopic : formData.subtopic)
                : undefined,

            open: formData.mode === 'personal' && formData.password.trim() === '',
        };

        try {
            const response = await fetch('/createChatroom/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roomData),
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Комната создана', data);
            } else {
                console.error('Ошибка создания комнаты', response.statusText);
            }
        } catch (error) {
            console.error('Ошибка запроса', error);
        }
    };

    return (
        <Container component="main" maxWidth="md">
            <Typography variant="h5" component="h1" sx={{ mb: 3 }}>
                Создать комнату ({step}/2)
            </Typography>

            {step === 1 && (
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Название комнаты"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Режим комнаты</FormLabel>
                            <RadioGroup
                                row
                                value={formData.mode}
                                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                            >
                                <FormControlLabel
                                    value="personal"
                                    control={<Radio />}
                                    label="Личный режим"
                                />
                                <FormControlLabel
                                    value="professional"
                                    control={<Radio />}
                                    label="Профессиональный режим"
                                />
                            </RadioGroup>
                        </FormControl>
                    </Grid>

                    {formData.mode === 'personal' && (
                        <Grid item xs={12}>
                            <FormControl component="fieldset">
                                <FormLabel component="legend">Формат общения</FormLabel>
                                <RadioGroup
                                    row
                                    value={formData.subType}
                                    onChange={(e) => setFormData({ ...formData, subType: e.target.value })}
                                >
                                    <FormControlLabel
                                        value="blitz"
                                        control={<Radio />}
                                        label="⏱️ Блиц-дебаты"
                                    />
                                    <FormControlLabel
                                        value="free"
                                        control={<Radio />}
                                        label="💬 Свободное общение"
                                    />
                                </RadioGroup>
                            </FormControl>
                        </Grid>
                    )}

                    {formData.mode === 'personal' && (
                        <>
                            {formData.subType === 'blitz' ? (
                                <>
                                    <Grid item xs={6}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Тема"
                                            value={formData.topic}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    topic: parseInt(e.target.value, 10),
                                                    subtopic: subtopics[parseInt(e.target.value, 10)][0]?.id
                                                })
                                            }
                                        >
                                            {topics.map((topic) => (
                                                <MenuItem key={topic.id} value={topic.id}>
                                                    {topic.icon} {topic.title}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Субтопик"
                                            value={formData.subtopic}
                                            onChange={(e) => setFormData({ ...formData, subtopic: parseInt(e.target.value, 10) })}
                                        >
                                            {subtopics[formData.topic]?.map((sub) => (
                                                <MenuItem key={sub.id} value={sub.id}>
                                                    {sub.title}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>
                                </>
                            ) : (
                                <>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Тема"
                                            value={formData.customTopic}
                                            onChange={(e) => setFormData({ ...formData, customTopic: e.target.value })}
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Подтема"
                                            value={formData.customSubtopic}
                                            onChange={(e) => setFormData({ ...formData, customSubtopic: e.target.value })}
                                        />
                                    </Grid>
                                </>
                            )}
                        </>
                    )}

                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Длительность (минут)"
                            value={formData.timer}
                            onChange={(e) => setFormData({ ...formData, timer: e.target.value })}
                            required
                            inputProps={{ min: 1, max: 1500 }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Макс. участников"
                            value={formData.maxParticipants}
                            onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                            inputProps={{ min: 2, max: 20 }}
                        />
                    </Grid>
                </Grid>
            )}

            {step === 2 && (
                <Grid container spacing={2}>
                    {formData.mode === 'personal' ? (
                        <>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Краткое описание"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl component="fieldset">
                                    <FormLabel component="legend">Доступ</FormLabel>
                                    <RadioGroup
                                        row
                                        value={formData.password ? 'closed' : 'open'}
                                        onChange={(e) => {
                                            if (e.target.value === 'open') {
                                                setFormData({ ...formData, password: '' });
                                            }
                                        }}
                                    >
                                        <FormControlLabel
                                            value="open"
                                            control={<Radio />}
                                            label="Открытая"
                                        />
                                        <FormControlLabel
                                            value="closed"
                                            control={<Radio />}
                                            label="Закрытая"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </Grid>
                            {formData.password && (
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        type="password"
                                        label="Пароль"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </Grid>
                            )}
                        </>
                    ) : (
                        <>
                            <Grid item xs={12}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Цель обсуждения"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    required
                                >
                                    {professionalPurposes.map((purpose) => (
                                        <MenuItem key={purpose} value={purpose}>
                                            {purpose}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Ключевые вопросы (каждый с новой строки)"
                                    value={formData.keyQuestions}
                                    onChange={(e) => setFormData({ ...formData, keyQuestions: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Метки (через запятую)"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Пароль"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormGroup>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={formData.hidden}
                                                onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                                            />
                                        }
                                        label="Скрыть комнату из общего списка"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={formData.exportOptions.includes('csv')}
                                                onChange={(e) => {
                                                    const options = e.target.checked
                                                        ? [...formData.exportOptions, 'csv']
                                                        : formData.exportOptions.filter(o => o !== 'csv');
                                                    setFormData({ ...formData, exportOptions: options });
                                                }}
                                            />
                                        }
                                        label="Разрешить экспорт в CSV"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={formData.exportOptions.includes('graph')}
                                                onChange={(e) => {
                                                    const options = e.target.checked
                                                        ? [...formData.exportOptions, 'graph']
                                                        : formData.exportOptions.filter(o => o !== 'graph');
                                                    setFormData({ ...formData, exportOptions: options });
                                                }}
                                            />
                                        }
                                        label="Генерировать граф взаимодействий"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={formData.dontJoin}
                                                onChange={(e) => setFormData({ ...formData, dontJoin: e.target.checked })}
                                            />
                                        }
                                        label="Не присоединять меня в комнату"
                                    />
                                </FormGroup>
                            </Grid>
                        </>
                    )}
                </Grid>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                {step === 2 && (
                    <Button variant="outlined" onClick={() => setStep(1)}>
                        Назад
                    </Button>
                )}
                <Button
                    variant="contained"
                    onClick={handleNextStep}
                    disabled={
                        (step === 1 && !validateStep1()) ||
                        (step === 2 && !validateStep2())
                    }
                >
                    {step === 1 ? 'Далее' : 'Создать комнату'}
                </Button>
            </Box>
        </Container>
    );
};

export default RoomCreate;
