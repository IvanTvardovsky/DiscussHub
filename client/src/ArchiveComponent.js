import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    Pagination,
    Skeleton,
    useTheme,
    styled
} from '@mui/material';
import { QuestionAnswer, People, Public, Lock } from '@mui/icons-material';

const ArchiveCard = styled(Card)(({ theme }) => ({
    transition: 'transform 0.2s',
    cursor: 'pointer',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[4],
    },
}));


const ArchiveComponent = ({ onSelectDiscussion }) => {
    const [archiveData, setArchiveData] = useState({ data: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(9);
    const theme = useTheme();

    useEffect(() => {
        const fetchArchive = async () => {
            try {
                const username = localStorage.getItem('username');
                if (!username) {
                    console.error('Имя пользователя не найдено');
                    setLoading(false);
                    return;
                }

                const response = await fetch(
                    `http://localhost:8080/archive?username=${encodeURIComponent(username)}&page=${page}&limit=${limit}`
                );

                if (!response.ok) throw new Error('Ошибка запроса');

                const data = await response.json();
                setArchiveData(data);
            } catch (error) {
                console.error('Ошибка загрузки архива:', error);
                setArchiveData({ data: [], total: 0 });
            } finally {
                setLoading(false);
            }
        };

        fetchArchive();
    }, [page, limit]);

    const renderContent = (item) => {
        if (item.mode === 'professional') {
            return (
                <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Ключевые вопросы:
                    </Typography>
                    {item.key_questions?.map((q, i) => (
                        <Chip
                            key={i}
                            label={q}
                            size="small"
                            sx={{ m: 0.5 }}
                            color="primary"
                        />
                    ))}
                    <div style={{ marginTop: 8 }}>
                        {item.tags?.map((tag, i) => (
                            <Chip
                                key={i}
                                label={tag}
                                size="small"
                                sx={{ m: 0.5 }}
                                variant="outlined"
                            />
                        ))}
                    </div>
                </>
            );
        }

        if (item.subtype === 'blitz') {
            return (
                <>
                    <Typography variant="body2" color="text.secondary">
                        Тема: {item.topic}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Подтема: {item.subtopic}
                    </Typography>
                </>
            );
        }

        return (
            <>
                <Typography variant="body2" color="text.secondary">
                    Своя тема: {item.custom_topic}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Своя подтема: {item.custom_subtopic}
                </Typography>
            </>
        );
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 4
            }}>
                <QuestionAnswer fontSize="large" />
                Архив дискуссий
            </Typography>

            {loading ? (
                <Grid container spacing={3}>
                    {[...Array(9)].map((_, i) => (
                        <Grid item xs={12} sm={6} md={4} key={i}>
                            <Skeleton variant="rectangular" height={180} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <>
                    {archiveData.data.length > 0 ? (
                        <>
                            <Grid container spacing={3}>
                                {archiveData.data.map((item) => (
                                    <Grid item xs={12} sm={6} md={4} key={item.id}>
                                        <ArchiveCard
                                            sx={{
                                                borderLeft: `4px solid ${
                                                    item.mode === 'professional'
                                                        ? theme.palette.primary.main
                                                        : theme.palette.secondary.main
                                                }`
                                            }}
                                            onClick={() => onSelectDiscussion(item.id)}
                                        >
                                            <CardContent>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 12
                                                }}>
                                                    <Typography variant="h6" component="div">
                                                        {item.name}
                                                    </Typography>
                                                    {item.public ? (
                                                        <Public fontSize="small" color="success" />
                                                    ) : (
                                                        <Lock fontSize="small" color="action" />
                                                    )}
                                                </div>

                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    marginBottom: 12
                                                }}>
                                                    <Chip
                                                        label={item.mode === 'professional' ? 'Проф.' : 'Личная'}
                                                        color={item.mode === 'professional' ? 'primary' : 'secondary'}
                                                        size="small"
                                                    />
                                                    {item.mode === 'personal' && (
                                                        <Chip
                                                            label={item.subtype === 'blitz' ? 'Блиц' : 'Свободная'}
                                                            variant="outlined"
                                                            size="small"
                                                        />
                                                    )}
                                                    <People fontSize="small" sx={{ ml: 'auto' }} />
                                                    <Typography variant="caption">
                                                        {item.participants?.length || 0}
                                                    </Typography>
                                                </div>

                                                {renderContent(item)}
                                            </CardContent>
                                        </ArchiveCard>
                                    </Grid>
                                ))}
                            </Grid>

                            <Pagination
                                count={Math.ceil(archiveData.total / limit)}
                                page={page}
                                onChange={(_, value) => setPage(value)}
                                sx={{
                                    mt: 4,
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}
                                color="primary"
                            />
                        </>
                    ) : (
                        <Typography variant="body1" textAlign="center" sx={{ mt: 4 }}>
                            Нет дискуссий в архиве
                        </Typography>
                    )}
                </>
            )}
        </Container>
    );
};

export default ArchiveComponent;