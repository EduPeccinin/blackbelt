const rateLimit = require('express-rate-limit');

// Middleware: require admin authentication
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(401).json({ error: 'Não autorizado. Faça login primeiro.' });
}

// Rate limiter for login attempts (anti brute-force)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for API endpoints (general)
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: { error: 'Muitas requisições. Tente novamente em alguns segundos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for schedule creation (prevent spam)
const scheduleLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 schedules per hour per IP
    message: { error: 'Limite de agendamentos atingido. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Input sanitization
function sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>]/g, '').trim();
}

function sanitizeBody(req, res, next) {
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        }
    }
    next();
}

module.exports = { requireAuth, loginLimiter, apiLimiter, scheduleLimiter, sanitizeBody };
