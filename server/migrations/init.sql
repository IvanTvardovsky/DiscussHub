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
    room_name VARCHAR(64) NOT NULL,
    public BOOLEAN NOT NULL DEFAULT false,
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

CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    discussion_id INT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    rater_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rated_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    professionalism INT NOT NULL CHECK (professionalism BETWEEN 1 AND 5),
    arguments_quality INT NOT NULL CHECK (arguments_quality BETWEEN 1 AND 5),
    politeness INT NOT NULL CHECK (politeness BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (discussion_id, rater_user_id, rated_user_id)
);