# DigitalSignature-Auth

Identity and authentication server for the DigitalSignature project. This is a serverless application built on Cloudflare Workers using the Hono framework and Cloudflare D1 database.

## Technology Stack

- **Framework:** Hono (Lightweight web framework for Cloudflare Workers)
- **Runtime:** Cloudflare Workers (Edge Computing)
- **Database:** Cloudflare D1 (SQL/SQLite based)
- **Language:** TypeScript
- **Security:** Password hashing (using bcrypt-edge) and public key management

## Database Schema (Cloudflare D1)

The server manages user data in a `users` table with the following structure:
- `id`: UUID (Primary Key)
- `login`: Unique username
- `email`: Unique email address
- `password_hash`: Hashed password string
- `public_key`: User's public key for digital signature verification
- `created_at`: Timestamp of account creation

## Local Development

### Prerequisites
- Node.js installed
- Cloudflare Wrangler CLI (installed via npm)

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/DigitalSignature-Project/DigitalSignature-Auth.git](https://github.com/DigitalSignature-Project/DigitalSignature-Auth.git)
   cd DigitalSignature-Auth