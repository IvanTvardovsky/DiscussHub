import React from 'react';
import { Grid, Typography, TextField, Button, Box, Link } from '@mui/material';

const RegistrationComponent = ({
                                   formData,
                                   error,
                                   onChange,
                                   onRegister,
                                   onGoToLogin
                               }) => {
    return (
        <Grid container sx={{ minHeight: '100vh', padding: 4 }}>
            <Grid item xs={12} md={6} sx={{ pr: { md: 4 } }}>
                <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Создать аккаунт
                    </Typography>

                    {error && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}

                    <TextField
                        fullWidth
                        label="Имя пользователя"
                        variant="outlined"
                        margin="normal"
                        value={formData.username}
                        onChange={onChange('username')}
                    />

                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        variant="outlined"
                        margin="normal"
                        value={formData.email}
                        onChange={onChange('email')}
                    />

                    <TextField
                        fullWidth
                        label="Пароль"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        value={formData.password}
                        onChange={onChange('password')}
                    />

                    <TextField
                        fullWidth
                        label="Подтвердите пароль"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        value={formData.confirmPassword}
                        onChange={onChange('confirmPassword')}
                    />

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={onRegister}
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Создать аккаунт
                    </Button>

                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Регистрируясь, вы соглашаетесь с нашими{' '}
                        <Link href="/terms">условиями обслуживания</Link> и{' '}
                        <Link href="/privacy">политикой конфиденциальности</Link>
                    </Typography>

                    <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        onClick={onGoToLogin}
                    >
                        Уже есть аккаунт? Войдите
                    </Button>
                </Box>
            </Grid>

            <Grid item xs={12} md={6} sx={{
                display: { xs: 'none', md: 'block' },
                bgcolor: 'background.paper',
                borderRadius: 2,
                p: 4
            }}>
                <Box sx={{ maxWidth: 500, mt: 8 }}>
                    <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Зачем присоединяться к нам?
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Станьте частью растущего сообщества, где ваш голос имеет значение.
                        Воспользуйтесь этими эксклюзивными преимуществами:
                    </Typography>
                    <ul style={{ paddingLeft: 20 }}>
                        <li><Typography>Уникальная площадка для дискуссий</Typography></li>
                        <li><Typography>Интересное коммьюнити</Typography></li>
                        <li><Typography>Эксклюзивная система достижений</Typography></li>
                    </ul>
                </Box>
            </Grid>
        </Grid>
    );
};

export default RegistrationComponent;