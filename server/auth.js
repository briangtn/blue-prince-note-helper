const { AUTH_RO_USER, AUTH_RO_PASS, AUTH_RW_USER, AUTH_RW_PASS } = process.env

const authEnabled = AUTH_RO_USER && AUTH_RO_PASS && AUTH_RW_USER && AUTH_RW_PASS

function parseBasic(header) {
  if (!header || !header.startsWith('Basic ')) return null
  const decoded = Buffer.from(header.slice(6), 'base64').toString()
  const sep = decoded.indexOf(':')
  if (sep === -1) return null
  return { user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) }
}

export default function auth(req, res, next) {
  if (!authEnabled) return next()

  const creds = parseBasic(req.headers.authorization)
  if (!creds) {
    res.set('WWW-Authenticate', 'Basic realm="Blue Prince Helper"')
    return res.status(401).json({ error: 'Authentication required' })
  }

  if (creds.user === AUTH_RW_USER && creds.pass === AUTH_RW_PASS) {
    req.role = 'rw'
  } else if (creds.user === AUTH_RO_USER && creds.pass === AUTH_RO_PASS) {
    req.role = 'ro'
  } else {
    res.set('WWW-Authenticate', 'Basic realm="Blue Prince Helper"')
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  req.user = creds.user

  if (req.role === 'ro' && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(403).json({ error: 'Read-only access' })
  }

  next()
}
