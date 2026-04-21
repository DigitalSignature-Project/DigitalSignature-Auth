# Architecture and Responsibilities (Important!)

The Cloudflare server acts solely as a data store and validator. All cryptographic operations must be performed in the local backend before sending the API request.

Passwords: The backend must hash the user's password (e.g., Argon2, SHA-256) before sending it in the password_hash field. The external server should never receive the clear password.

Keys: The backend must generate a key pair (public and private). It must then encrypt the private key (e.g., with the AES algorithm using the user's "key passphrase") and send it in the encrypted_private_key field. The external server never sees the clear private key.

### Main API URL:
```bash
digital-signature-auth.digitalsignature-auth.workers.dev
```
# API Endpoints

## 1. Register a new user. Creates a new account and saves the generated keys.

    Endpoint: POST /api/register

Headers: Content-Type: application/json

Body (Request):

```JSON
{
"login": "johndoe",
"password_hash": "hashed_password_string",
"public_key": "public_key_string",
"encrypted_private_key": "aes_encrypted_private_key_blob",
"key_module": "windows-cng"
}
```
### Responses:

201 Created: Registration successful. Returns {"message": "User registered successfully", "userId": "uuid"}.

400 Bad Request: Required fields missing.

409 Conflict: A user with the specified login or email already exists.

500 Internal Server Error: Database error.

## 2. User Login Verifies credentials and retrieves keys from the server necessary for running the local application.

    Endpoint: POST /api/login

Headers: Content-Type: application/json

Body (Request):

```JSON
{
"login": "johndoe",
"password_hash": "hashed_password_string"
}
```
### Responses:

200 OK: Login successful. The response contains keys that the backend will pass to the frontend for local decryption:

```JSON
{
"message": "Login successful",
"encrypted_private_key": "aes_encrypted_private_key_blob",
"public_key": "public_key_string",
"key_module": "windows-cng"
}
```
400 Bad Request: No login or password.

401 Unauthorized: Incorrect credentials (bad password).

404 Not Found: User does not exist.

## 3. Retrieving a Public Key

Used by the local backend when it needs to verify the digital signature of a file/data belonging to another user.

    Endpoint: GET /api/public-key/:login

Path parameters: login - username of the user whose key we want to retrieve.

### Responses:

200 OK: Key successfully retrieved.

```JSON
{
"login": "johndoe",
"public_key": "public_key_string",
"key_module": "windows-cng"
}
```
404 Not Found: User does not exist.

## 4. Key Update (Reset / Change Key)

Endpoint allowing you to replace a key pair with a new one, after prior authorization.

    Endpoint: POST /api/update-keys

Headers: Content-Type: application/json

Body (Request):

```JSON
{
"login": "johndoe",
"password_hash": "hashed_password_string",
"new_public_key": "new_public_key_string",
"new_encrypted_private_key": "new_aes_encrypted_private_key_blob",
"new_key_module": "windows-cng"
}
```
### Responses:

Notes:
- `new_key_module` is optional. If omitted, only keys are updated.

200 OK: {"message": "Keys updated successfully"}.

401 Unauthorized: Incorrect credentials.

500 Internal Server Error: Database error.

## 5. Checking Server Status
Technical endpoint for checking if the authorization server is alive.

    Endpoint: GET /api/status

### Responses: 

200 OK: {"status": "ok", "message": "DigitalSignature Auth Server is running"}.