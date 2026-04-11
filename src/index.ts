import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Definiujemy powiązanie (binding) z bazą D1 skonfigurowaną w wrangler.toml
type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

app.get('/api/status', (c) => {
  return c.json({ status: 'ok', message: 'DigitalSignature Auth Server is running' })
})

app.post('/api/register', async (c) => {
  try {
    const body = await c.req.json()
    const { login, email, password_hash, public_key, encrypted_private_key } = body

    if (!login || !email || !password_hash || !public_key || !encrypted_private_key) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const id = crypto.randomUUID()

    const { success } = await c.env.DB.prepare(
      `INSERT INTO users (id, login, email, password_hash, public_key, encrypted_private_key) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, login, email, password_hash, public_key, encrypted_private_key).run()

    if (success) {
      return c.json({ message: 'User registered successfully', userId: id }, 201)
    } else {
      return c.json({ error: 'Failed to register user' }, 500)
    }
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Login or email already exists' }, 409)
    }
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

app.post('/api/login', async (c) => {
  try {
    const body = await c.req.json()
    const { login, password_hash } = body

    if (!login || !password_hash) {
      return c.json({ error: 'Missing login or password_hash' }, 400)
    }

    const user = await c.env.DB.prepare(
      `SELECT password_hash, encrypted_private_key, public_key FROM users WHERE login = ?`
    ).bind(login).first()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (user.password_hash !== password_hash) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    return c.json({
      message: 'Login successful',
      encrypted_private_key: user.encrypted_private_key,
      public_key: user.public_key
    }, 200)

  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})


app.post('/api/update-keys', async (c) => {
  try {
    const body = await c.req.json()
    const { login, password_hash, new_public_key, new_encrypted_private_key } = body

    const user = await c.env.DB.prepare(
      `SELECT password_hash FROM users WHERE login = ?`
    ).bind(login).first()

    if (!user || user.password_hash !== password_hash) {
      return c.json({ error: 'Unauthorized or invalid credentials' }, 401)
    }

    const { success } = await c.env.DB.prepare(
      `UPDATE users SET public_key = ?, encrypted_private_key = ? WHERE login = ?`
    ).bind(new_public_key, new_encrypted_private_key, login).run()

    if (success) {
      return c.json({ message: 'Keys updated successfully' }, 200)
    } else {
      return c.json({ error: 'Failed to update keys' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})


app.get('/api/public-key/:login', async (c) => {
  try {
    const login = c.req.param('login')

    const user = await c.env.DB.prepare(
      `SELECT public_key FROM users WHERE login = ?`
    ).bind(login).first()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      login: login,
      public_key: user.public_key
    }, 200)

  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

export default app