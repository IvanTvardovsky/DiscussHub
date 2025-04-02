import React from 'react';
import { Grid, Typography, TextField, Button, Box, Link } from '@mui/material';

const LoginComponent = ({
                            identifier,
                            password,
                            error,
                            onIdentifierChange,
                            onPasswordChange,
                            onLogin,
                            onGoToRegistration
                        }) => {
    return (
        <Grid container sx={{ minHeight: '100vh', padding: 4 }}>
            <Grid item xs={12} md={6} sx={{ pr: { md: 4 } }}>
                <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                        С возвращением
                    </Typography>

                    {error && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}

                    <TextField
                        fullWidth
                        label="Email или имя пользователя"
                        variant="outlined"
                        margin="normal"
                        value={identifier}
                        onChange={onIdentifierChange}
                    />

                    <TextField
                        fullWidth
                        label="Пароль"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        value={password}
                        onChange={onPasswordChange}
                    />

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={onLogin}
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Войти
                    </Button>

                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Link href="#" variant="body2" onClick={onGoToRegistration}>
                            Забыли пароль?
                        </Link>
                    </Box>

                    <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        onClick={onGoToRegistration}
                    >
                        Создать новый аккаунт
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
                        Присоединяйтесь к нашему сообществу
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Участвуйте в содержательных дискуссиях, получайте вознаграждение за свой вклад
                        и общайтесь с единомышленниками. Начните свое путешествие уже сегодня!
                    </Typography>
                    <ul style={{ paddingLeft: 20 }}>
                        <li><Typography>Участвуйте в дискуссиях</Typography></li>
                        <li><Typography>Зарабатывайте значки достижений</Typography></li>
                        <li><Typography>Попробуйте взглянуть с другой точки зрения</Typography></li>
                    </ul>
                </Box>
            </Grid>
        </Grid>
    );
};

export default LoginComponent;