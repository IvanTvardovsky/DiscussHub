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
    styled,
    Tooltip,
    Popover,
    Collapse,
    IconButton,
    Box
} from '@mui/material';
import { QuestionAnswer, People, Public, Lock, ExpandMore, ExpandLess } from '@mui/icons-material';

const ArchiveCard = styled(Card)(({ theme }) => ({
    transition: 'transform 0.2s',
    cursor: 'pointer',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[4],
    },
    position: 'relative',
}));

const TruncatedText = ({ text, maxLength, variant = 'body2' }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const needsTruncation = text?.length > maxLength;

    const handleClick = (event) => {
        if (needsTruncation) {
            setAnchorEl(event.currentTarget);
        }
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <Tooltip title={needsTruncation ? 'Нажмите для полного текста' : ''}>
                <Typography
                    variant={variant}
                    color="text.secondary"
                    onClick={handleClick}
                    sx={{
                        cursor: needsTruncation ? 'pointer' : 'default',
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {needsTruncation ? `${text.slice(0, maxLength)}...` : text}
                </Typography>
            </Tooltip>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <Typography sx={{ p: 2, maxWidth: 400 }}>{text}</Typography>
            </Popover>
        </>
    );
};

const ExpandableCardContent = ({ item, onToggle, isExpanded }) => {
    const theme = useTheme();

    const renderContent = (item) => {
        if (item.mode === 'professional') {
            return (
                <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Ключевые вопросы:
                    </Typography>
                    {item.key_questions?.map((q, i) => (
                        <Tooltip key={i} title={q}>
                            <Chip
                                label={q.length > 25 ? `${q.slice(0, 25)}...` : q}
                                size="small"
                                sx={{ m: 0.5 }}
                                color="primary"
                            />
                        </Tooltip>
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
                    <TruncatedText
                        text={`Тема: ${item.topic}`}
                        maxLength={35}
                    />
                    <TruncatedText
                        text={`Подтема: ${item.subtopic}`}
                        maxLength={35}
                    />
                </>
            );
        }

        return (
            <>
                <TruncatedText
                    text={`Своя тема: ${item.custom_topic}`}
                    maxLength={35}
                />
                <TruncatedText
                    text={`Своя подтема: ${item.custom_subtopic}`}
                    maxLength={35}
                />
            </>
        );
    };

    return (
        <CardContent sx={{ pb: '40px!important' }}>
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
            </div>

            <Collapse in={isExpanded} collapsedSize={100}>
                {renderContent(item)}
            </Collapse>

            <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                textAlign: 'center',
                background: `linear-gradient(to top, ${theme.palette.background.paper} 30%, transparent)`,
                pt: 1,
                pb: 1
            }}>
                <IconButton
                    size="small"
                    onClick={onToggle}
                    sx={{
                        backgroundColor: theme.palette.background.paper,
                        boxShadow: 1,
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover
                        }
                    }}
                >
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
            </Box>
        </CardContent>
    );
};

const ExpandableArchiveCard = ({ item, onSelectDiscussion }) => {
    const theme = useTheme(); // Добавляем хук useTheme
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggle = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <ArchiveCard
            onClick={() => onSelectDiscussion(item.id)}
            sx={{
                borderLeft: `4px solid ${
                    item.mode === 'professional'
                        ? theme.palette.primary.main
                        : theme.palette.secondary.main
                }`
            }}
        >
            <ExpandableCardContent
                item={item}
                isExpanded={isExpanded}
                onToggle={handleToggle}
            />
        </ArchiveCard>
    );
};


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
                                    <ExpandableArchiveCard
                                        item={item}
                                        onSelectDiscussion={onSelectDiscussion}
                                    />
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