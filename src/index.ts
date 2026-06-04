import { Hono } from 'hono'
import { cors } from 'hono/cors'

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
    const { login, password_hash, public_key, encrypted_private_key, key_module } = body

    if (!login || !password_hash || !public_key || !encrypted_private_key || !key_module) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const id = crypto.randomUUID()

    const { success } = await c.env.DB.prepare(
      `INSERT INTO users (id, login, password_hash, public_key, encrypted_private_key, key_module) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, login, password_hash, public_key, encrypted_private_key, key_module).run()

    if (success) {
      return c.json({ message: 'User registered successfully', userId: id }, 201)
    } else {
      return c.json({ error: 'Failed to register user' }, 500)
    }
  } catch (error: any) {
    return c.json({ 
      error: 'Internal Server Error', 
      details: error.message 
    }, 500)
  }
})

app.post('/api/login', async (c) => {
  try {
    const body = await c.req.json()
    const { login, password_hash } = body

    if (typeof login !== 'string' || typeof password_hash !== 'string') {
      return c.json({ error: 'Missing login or password_hash' }, 400)
    }

    const normalizedLogin = login.trim()

    if (!normalizedLogin || !password_hash) {
      return c.json({ error: 'Missing login or password_hash' }, 400)
    }

    const user = await c.env.DB.prepare(
      `SELECT id, password_hash, encrypted_private_key, public_key, key_module FROM users WHERE login = ?`
    ).bind(normalizedLogin).first<{ id: string, password_hash: string, encrypted_private_key: string, public_key: string, key_module: string }>()

    if (!user || user.password_hash == null) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (user.password_hash !== password_hash) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const { results: additionalKeys } = await c.env.DB.prepare(
      `SELECT id as key_id, key_type, public_key, encrypted_private_key, key_module FROM additional_keys WHERE user_id = ?`
    ).bind(user.id).all()

    return c.json({
      message: 'Login successful',
      encrypted_private_key: user.encrypted_private_key,
      public_key: user.public_key,
      key_module: user.key_module,
      additional_keys: additionalKeys || []
    }, 200)

  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

app.post('/api/add-key', async (c) => {
  try {
    const body = await c.req.json()
    const { login, password_hash, key_type, public_key, encrypted_private_key, key_module } = body

    if (!login || !password_hash || !key_type || !public_key || !encrypted_private_key || !key_module) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const user = await c.env.DB.prepare(
      `SELECT id, password_hash FROM users WHERE login = ?`
    ).bind(login).first<{ id: string, password_hash: string }>()

    if (!user || user.password_hash !== password_hash) {
      return c.json({ error: 'Unauthorized or invalid credentials' }, 401)
    }

    const keyId = crypto.randomUUID()

    const { success } = await c.env.DB.prepare(
      `INSERT INTO additional_keys (id, user_id, key_type, public_key, encrypted_private_key, key_module) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(keyId, user.id, key_type, public_key, encrypted_private_key, key_module).run()

    if (success) {
      return c.json({ message: 'Additional key added successfully', key_id: keyId }, 201)
    } else {
      return c.json({ error: 'Failed to add key' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

app.get('/api/public-keys/:login', async (c) => {
  try {
    const login = c.req.param('login')

    const user = await c.env.DB.prepare(
      `SELECT id, public_key, key_module, encrypted_private_key FROM users WHERE login = ?`
    ).bind(login).first<{ id: string, public_key: string, key_module: string, encrypted_private_key: string }>()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const { results: additionalKeys } = await c.env.DB.prepare(
      `SELECT key_type, public_key, key_module, encrypted_private_key FROM additional_keys WHERE user_id = ?`
    ).bind(user.id).all()

    return c.json({
      login: login,
      public_key: user.public_key,
      key_module: user.key_module,
      encrypted_private_key: user.encrypted_private_key,
      additional_keys: additionalKeys || []
    }, 200)

  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

app.post('/api/update-keys', async (c) => {
  try {
    const body = await c.req.json()
    const { login, password_hash, new_public_key, new_encrypted_private_key, new_key_module } = body

    const user = await c.env.DB.prepare(
      `SELECT password_hash FROM users WHERE login = ?`
    ).bind(login).first<{ password_hash: string }>()

    if (!user || user.password_hash !== password_hash) {
      return c.json({ error: 'Unauthorized or invalid credentials' }, 401)
    }

    const statement = new_key_module
      ? `UPDATE users SET public_key = ?, encrypted_private_key = ?, key_module = ? WHERE login = ?`
      : `UPDATE users SET public_key = ?, encrypted_private_key = ? WHERE login = ?`

    const binder = c.env.DB.prepare(statement)

    const { success } = new_key_module
      ? await binder.bind(new_public_key, new_encrypted_private_key, new_key_module, login).run()
      : await binder.bind(new_public_key, new_encrypted_private_key, login).run()

    if (success) {
      return c.json({ message: 'Main keys updated successfully' }, 200)
    } else {
      return c.json({ error: 'Failed to update keys' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

export default app