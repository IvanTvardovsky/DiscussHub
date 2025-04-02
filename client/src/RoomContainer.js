import React, { useState } from 'react';
import { Tabs, Tab, Box, Container, Typography } from '@mui/material';
import RoomList from './RoomList';
import RoomCreate from './RoomCreate';

const RoomContainer = ({ onJoinRoom, onCreateRoom }) => {
    const [tabIndex, setTabIndex] = useState(0);

    const handleCreateRoom = (roomData) => {
        const baseRoom = {
            name: roomData.name,
            password: roomData.password,
            open: roomData.open,
            maxUsers: roomData.maxParticipants,
            mode: roomData.mode,
            subType: roomData.subType,
            timer: roomData.timer,
            purpose: roomData.purpose,
            tags: roomData.tags,
            hidden: roomData.hidden,

            topic: roomData.topic,
            subtopic: roomData.subtopic,
            customTopic: roomData.customTopic,
            customSubtopic: roomData.customSubtopic,
            description: roomData.description,
            keyQuestions: roomData.keyQuestions,
            exportOptions: roomData.exportOptions,
            dontJoin: roomData.dontJoin
        };

        const cleanedData = Object.fromEntries(
            Object.entries(baseRoom).filter(([_, v]) => v !== undefined)
        );

        onCreateRoom(cleanedData);
    };

    return (
        <Container component="main" maxWidth="md">
            <Typography component="h1" variant="h5" sx={{ mt: 2 }}>
                Комнаты
            </Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
                <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
                    <Tab label="Список комнат" />
                    <Tab label="Создать комнату" />
                </Tabs>
            </Box>
            <Box sx={{ mt: 2 }}>
                {tabIndex === 0 && <RoomList onJoinRoom={onJoinRoom} />}
                {tabIndex === 1 && <RoomCreate onCreateRoom={handleCreateRoom} />}
            </Box>
        </Container>
    );
};

export default RoomContainer;