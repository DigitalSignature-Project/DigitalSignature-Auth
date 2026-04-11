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

The `users` table is structured to support non-custodial key management and public key infrastructure (PKI):

- `id`: UUID (Primary Key)
- `login`: Unique username
- `email`: Unique email address
- `password_hash`: Hashed password for authentication
- `public_key`: The current public key used for signature verification
- `encrypted_private_key`: A client-side encrypted private key blob (AES-encrypted)
- `created_at`: Timestamp of account creation

## API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | /api/status | Returns the operational status of the API |
| POST | /api/register | Creates a new account with initial public key and encrypted private key |
| POST | /api/login | Authenticates user and returns the encrypted key for local decryption |
| POST | /api/update-keys | Updates both public and encrypted private keys (e.g., during key reset) |
| GET | /api/public-key/:login | Retrieves a public key for signature verification by the FastAPI backend |

## Security Model

The system follows a non-custodial security architecture:

1. **Key Generation:** Keys are generated locally within the Tauri application or via the secure FastAPI environment.
2. **Encryption:** The private key is encrypted with a user-defined "Key Passphrase" before being sent to this server.
3. **Verification:** The FastAPI backend retrieves the public_key from this server to verify file signatures. The plain-text private key is never transmitted or stored on any server.

## Local Development

### Prerequisites
- Node.js (Latest LTS recommended)
- Cloudflare Wrangler CLI (npm install -g wrangler)

### Setup and Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/DigitalSignature-Project/DigitalSignature-Auth.git](https://github.com/DigitalSignature-Project/DigitalSignature-Auth.git)
   cd DigitalSignature-Auth

2. Install dependencies:
   ```bash
   npm install

3. Local Runtime:
   Start the local development server with a local D1 instance:
   ```bash
   npm run dev

4. Database Initialization:
   Execute the schema initialization:
   ```bash
   npx wrangler d1 execute <DATABASE_NAME> --local --file=./schema.sql

## Deployment

Continuous Deployment is managed through Cloudflare Pages. Merges to the main branch trigger an automatic build and deployment to the production edge environment.