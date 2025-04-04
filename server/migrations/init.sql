CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE discussions (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL,
    mode VARCHAR(20) NOT NULL,
    subtype VARCHAR(20),
    duration INTERVAL NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    messages JSONB NOT NULL,
    creator_username VARCHAR(64) NOT NULL,
    key_questions JSONB,
    tags JSONB,
    export_options JSONB NOT NULL,
    participants JSONB NOT NULL,
    topic_id INT,
    subtopic_id INT,
    custom_topic VARCHAR(64),
    custom_subtopic VARCHAR(64),
    description TEXT,
    purpose TEXT
);