# DigitalSignature-Auth

Identity and authentication server for the DigitalSignature project. This service acts as a centralized Identity Provider (IdP) built on Cloudflare Workers, utilizing the Hono framework and Cloudflare D1 database.

## Overview

This server provides a "Zero-Knowledge" authentication and key management system. It is designed to work in conjunction with a Tauri-based Windows application and a FastAPI logic backend. The core principle is that the server never possesses the user's plain-text private key; it only stores a version encrypted on the client side.

## Technology Stack

- **Framework:** Hono (Lightweight web framework for Cloudflare Workers)
- **Runtime:** Cloudflare Workers (Serverless Edge Computing)
- **Database:** Cloudflare D1 (Relational SQL/SQLite)
- **Language:** TypeScript
- **Security:** Password hashing and storage of client-side encrypted private key blobs.

## Database Schema (Cloudflare D1)

The database consists of two tables to support non-custodial key management and public key infrastructure (PKI):

### `users` table

- `id`: UUID (Primary Key)
- `login`: Unique username
- `password_hash`: Hashed password for authentication
- `public_key`: The current public key used for signature verification
- `encrypted_private_key`: A client-side encrypted private key blob (AES-encrypted)
- `key_module`: Client key module/provider identifier (required)

### `additional_keys` table

- `id`: UUID (Primary Key)
- `user_id`: Foreign key referencing the user
- `key_type`: Type of the additional key (e.g., "backup", "device")
- `public_key`: The public key for this additional key
- `encrypted_private_key`: A client-side encrypted private key blob
- `key_module`: Client key module/provider identifier for this key

## API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | /api/status | Returns the operational status of the API |
| POST | /api/register | Creates a new account with initial keys and required `key_module` |
| POST | /api/login | Authenticates user and returns keys + `key_module` + additional keys |
| POST | /api/add-key | Adds an additional key to the user account |
| POST | /api/update-keys | Updates main keys (and optionally `key_module`) |
| GET | /api/public-keys/:login | Retrieves `public_key` + `key_module` + additional keys for verification |

More information can be found at: [Api Integration](API_INTEGRATION_GUIDE.md)

### Endpoint payloads (current)

#### `POST /api/register`

**Request JSON**

```json
{
  "login": "alice",
  "password_hash": "<hash>",
  "public_key": "<pem-or-jwk>",
  "encrypted_private_key": "<base64-or-json>",
  "key_module": "windows-cng"
}
```

#### `POST /api/login`

**Request JSON**

```json
{
  "login": "alice",
  "password_hash": "<hash>"
}
```

**Response JSON (200)**

```json
{
  "message": "Login successful",
  "encrypted_private_key": "<base64-or-json>",
  "public_key": "<pem-or-jwk>",
  "key_module": "windows-cng",
  "additional_keys": [
    {
      "key_id": "<uuid>",
      "key_type": "<type>",
      "public_key": "<pem-or-jwk>",
      "encrypted_private_key": "<base64-or-json>",
      "key_module": "<module>"
    }
  ]
}
```

#### `POST /api/update-keys`

**Request JSON**

```json
{
  "login": "alice",
  "password_hash": "<hash>",
  "new_public_key": "<pem-or-jwk>",
  "new_encrypted_private_key": "<base64-or-json>",
  "new_key_module": "windows-cng"
}
```

Notes:
- `new_key_module` is optional. If omitted, only keys are updated.

#### `POST /api/add-key`

**Request JSON**

```json
{
  "login": "alice",
  "password_hash": "<hash>",
  "key_type": "backup",
  "public_key": "<pem-or-jwk>",
  "encrypted_private_key": "<base64-or-json>",
  "key_module": "windows-cng"
}
```

**Response JSON (201)**

```json
{
  "message": "Additional key added successfully",
  "key_id": "<uuid>"
}
```

#### `GET /api/public-keys/:login`

**Response JSON (200)**

```json
{
  "login": "alice",
  "public_key": "<pem-or-jwk>",
  "key_module": "windows-cng",
  "additional_keys": [
    {
      "key_type": "<type>",
      "public_key": "<pem-or-jwk>",
      "key_module": "<module>"
    }
  ]
}
```

## Security Model

The system implements a Zero-Knowledge Architecture. The Cloudflare Worker acts as a passive storage layer for identity metadata, while all sensitive cryptographic operations occur strictly on the user's local machine.

### 1. Key Generation & Protection
   - Local Generation: RSA or Ed25519 key pairs are generated within the Tauri application or the local FastAPI environment.

   - Client-Side Encryption: Before transmission, the private key is encrypted using AES with a user-defined "Key Passphrase".

   - No Plain-Text Storage: The server never receives, processes, or stores the user's plain-text private key.

### 2. Authentication & Verification Flow
   1. Registration: The client sends the login, password_hash, public_key, encrypted private key blob, and `key_module` to the server.

   2. Login: The server verifies the password_hash. Upon success, it sends back `encrypted_private_key`, `public_key`, `key_module`, and any additional keys.

   3. Add Additional Keys: Users can add additional keys (e.g., backup keys, device-specific keys) via the `/api/add-key` endpoint.

   4. Decryption: The user enters their passphrase locally in Tauri to decrypt the key for signing operations.

   5. Verification: When the local FastAPI backend needs to verify a signature, it fetches the user's public_key and additional keys from this server via the /api/public-keys/:login endpoint.

## Local Development

### Prerequisites

- Node.js (Latest LTS recommended)
- Cloudflare Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```
- Hono:
   ```bash
   npm install hono
   ```

### Setup and Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DigitalSignature-Project/DigitalSignature-Auth.git
   cd DigitalSignature-Auth

2. Install dependencies:
   ```bash
   npm install

3. Local Runtime:
   - Start the local development server with a local D1 instance:
   ```bash
   npm run dev

4. Database Initialization:
   - Execute the schema initialization:
   ```bash
   npx wrangler d1 execute <DATABASE_NAME> --local --file=./schema.sql

## Deployment

Continuous Deployment is managed through Cloudflare Pages. Merges to the main branch trigger an automatic build and deployment to the production edge environment.
