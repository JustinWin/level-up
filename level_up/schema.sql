DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS tasks;

CREATE TABLE user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  exp INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  total_seconds INTEGER NOT NULL,
  elasped_seconds INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user(id)
);
