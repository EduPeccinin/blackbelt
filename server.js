const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const hpp = require('hpp');
const path = require('path');
const crypto = require('crypto');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const { apiLimiter } = require('./middleware/auth');
const { initDb, closeDb } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// ========= SECURITY =========
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(hpp());

// ========= BODY PARSING =========
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ========= SESSION =========
app.set('trust proxy', 1); // Trust first proxy (Vercel) to allow secure cookies
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const sessionConfig = {
    name: 'blackbelt_session',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 2 * 60 * 60 * 1000,
    }
};

// Use Postgres for sessions if DATABASE_URL is available
if (process.env.DATABASE_URL) {
    const sessionPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    sessionConfig.store = new pgSession({
        pool: sessionPool,
        tableName: 'session',
        createTableIfMissing: true
    });
}

app.use(session(sessionConfig));

// ========= STATIC FILES =========
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
}));

// ========= ROUTES =========
app.use('/api', apiLimiter, apiRoutes);
app.use('/api/admin', adminRoutes);

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========= ERROR HANDLING =========
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ========= START =========
async function start() {
    await initDb();
    // Start listening only if not running inside Vercel
    if (!process.env.VERCEL) {
        app.listen(PORT, () => {
            console.log(`\n🥋 Academia Black Belt - Servidor rodando!`);
            console.log(`📍 http://localhost:${PORT}`);
            console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
            console.log(`\n`);
        });
    }
}

start().catch(err => {
    console.error('Failed to start server:', err);
});

process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

// Export the app for Vercel serverless
module.exports = app;
