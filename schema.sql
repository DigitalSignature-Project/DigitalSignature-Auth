CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  login TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  key_module TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS elgamal_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  p_value TEXT NOT NULL,
  q_value TEXT NOT NULL,
  g_value TEXT NOT NULL,
  y_value TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ecdsa_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  x_value TEXT NOT NULL,
  y_value TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);