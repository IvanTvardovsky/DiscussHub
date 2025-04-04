import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Typography,
    CircularProgress,
    useTheme,
    Paper,
    Grid
} from '@mui/material';
import { ArrowBack, Download, AccountTree } from '@mui/icons-material';
import moment from 'moment';

const DiscussionDetails = ({ discussionId, onBack }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();

    useEffect(() => {
        const fetchDiscussion = async () => {
            try {
                const response = await fetch(`http://localhost:8080/discussion/${discussionId}`);
                if (!response.ok) throw new Error('Ошибка загрузки данных');
                const data = await response.json();
                setData(data);
            } catch (error) {
                console.error('Ошибка:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDiscussion();
    }, [discussionId]);

    const handleExport = (type) => {
        window.open(`http://localhost:8080/discussion/${discussionId}/export/${type}`, '_blank');
    };

    if (loading) {
        return (
            <Box sx={{
                height: 'calc(100vh - 64px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!data) {
        return (
            <Box sx={{
                height: 'calc(100vh - 64px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Typography color="error">Не удалось загрузить данные</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            height: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            gap: 2
        }}>
            <IconButton onClick={onBack} sx={{ alignSelf: 'flex-start' }}>
                <ArrowBack />
            </IconButton>

            <Grid container spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
                <Grid item xs={12} md={4} sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    overflowY: 'auto'
                }}>
                    <Paper sx={{ p: 2, flexShrink: 0 }}>
                        <Typography variant="h5" gutterBottom>
                            {data.room_name}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                            <Chip
                                label={data.public ? 'Публичная' : 'Приватная'}
                                color={data.public ? 'success' : 'default'}
                                size="small"
                            />
                            <Chip
                                label={`Режим: ${data.mode === 'professional' ? 'Проф.' : 'Личный'}`}
                                color="primary"
                                size="small"
                            />
                            <Chip
                                label={`Участников: ${data.participants.length}`}
                                variant="outlined"
                                size="small"
                            />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {data.export_options?.includes('csv') && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Download />}
                                    onClick={() => handleExport('csv')}
                                    size="small"
                                >
                                    CSV
                                </Button>
                            )}
                            {data.export_options?.includes('graph') && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<AccountTree />}
                                    onClick={() => handleExport('graph')}
                                    size="small"
                                >
                                    Граф
                                </Button>
                            )}
                        </Box>
                    </Paper>

                    <Paper sx={{ p: 2, flexShrink: 0 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Детали
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="body2">
                                <strong>Начало:</strong> {moment(data.start_time).format('DD.MM.YYYY HH:mm')}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Длительность:</strong> {data.duration}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Цель:</strong> {data.purpose}
                            </Typography>
                        </Box>

                        {data.key_questions?.length > 0 && (
                            <>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle1" gutterBottom>
                                    Ключевые вопросы
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {data.key_questions.map((q, i) => (
                                        <Chip key={i} label={q} size="small" />
                                    ))}
                                </Box>
                            </>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={8} sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    <Paper sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        p: 2,
                        '& > div': {
                            height: '100%',
                            overflow: 'hidden'
                        }
                    }}>
                        <Typography variant="h6" gutterBottom>
                            История сообщений ({data.messages.length})
                        </Typography>

                        <Box sx={{
                            flex: 1,
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <List sx={{
                                height: '100%',
                                overflowY: 'auto',
                                overscrollBehaviorY: 'contain',
                                WebkitOverflowScrolling: 'touch',
                                '&::-webkit-scrollbar': {
                                    width: '8px',
                                },
                                '&::-webkit-scrollbar-track': {
                                    background: theme.palette.mode === 'dark' ? '#424242' : '#f5f5f5',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    backgroundColor: theme.palette.mode === 'dark' ? '#686868' : '#bdbdbd',
                                    borderRadius: '4px',
                                },
                                bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50',
                                borderRadius: 1,
                                p: 1
                            }}>
                                {data.messages.map((msg, i) => (
                                    <ListItem key={i} alignItems="flex-start" sx={{ py: 1 }}>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" component="span">
                                                    <strong>{msg.username}</strong>
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        sx={{ ml: 1, color: 'text.secondary' }}
                                                    >
                                                        ({moment(msg.timestamp).format('HH:mm:ss')})
                                                    </Typography>
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant="body2" color="text.secondary">
                                                    {msg.content || <em>(системное сообщение)</em>}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DiscussionDetails;