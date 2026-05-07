const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool;

async function initDb() {
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️ DATABASE_URL não configurada. O banco de dados não conectará.');
        return;
    }

    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS schedules (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                whatsapp TEXT NOT NULL,
                student_age INTEGER NOT NULL,
                category TEXT NOT NULL,
                preferred_schedule TEXT NOT NULL,
                preferred_date TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                notes TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create indexes if not exist (Postgres syntax)
        await pool.query("CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status)");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(preferred_date)");

        // Create default admin
        const adminCheck = await pool.query("SELECT id FROM admin_users WHERE username = 'admin'");
        if (adminCheck.rows.length === 0) {
            const hash = bcrypt.hashSync('blackbelt2024', 12);
            await pool.query("INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)", ['admin', hash]);
            console.log('✅ Admin user created (admin / blackbelt2024)');
        }

        console.log('✅ Conectado ao PostgreSQL com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao inicializar o banco de dados:', err);
    }
}

function getDb() {
    return pool;
}

// Schedule queries
const scheduleQueries = {
    create: async (data) => {
        const result = await pool.query(
            "INSERT INTO schedules (name, whatsapp, student_age, category, preferred_schedule, preferred_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [data.name, data.whatsapp, data.student_age, data.category, data.preferred_schedule, data.preferred_date]
        );
        return { lastInsertRowid: result.rows[0].id };
    },

    getAll: async (filters = {}) => {
        let sql = 'SELECT * FROM schedules WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (filters.status && filters.status !== 'all') {
            sql += ` AND status = $${paramCount}`;
            params.push(filters.status);
            paramCount++;
        }
        if (filters.date) {
            sql += ` AND preferred_date = $${paramCount}`;
            params.push(filters.date);
            paramCount++;
        }
        if (filters.category && filters.category !== 'all') {
            sql += ` AND category = $${paramCount}`;
            params.push(filters.category);
            paramCount++;
        }

        sql += ' ORDER BY created_at DESC';
        const result = await pool.query(sql, params);
        return result.rows;
    },

    getById: async (id) => {
        const result = await pool.query('SELECT * FROM schedules WHERE id = $1', [id]);
        return result.rows[0];
    },

    updateStatus: async (id, status, notes = '') => {
        await pool.query("UPDATE schedules SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3", [status, notes, id]);
    },

    reschedule: async (id, newDate, newSchedule, notes = '') => {
        await pool.query("UPDATE schedules SET preferred_date = $1, preferred_schedule = $2, status = 'rescheduled', notes = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4", [newDate, newSchedule, notes, id]);
    },

    delete: async (id) => {
        await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
    },

    getStats: async () => {
        const total = await pool.query('SELECT COUNT(*) as count FROM schedules');
        const pending = await pool.query("SELECT COUNT(*) as count FROM schedules WHERE status = 'pending'");
        const confirmed = await pool.query("SELECT COUNT(*) as count FROM schedules WHERE status = 'confirmed'");
        const completed = await pool.query("SELECT COUNT(*) as count FROM schedules WHERE status = 'completed'");
        const cancelled = await pool.query("SELECT COUNT(*) as count FROM schedules WHERE status = 'cancelled'");
        const rescheduled = await pool.query("SELECT COUNT(*) as count FROM schedules WHERE status = 'rescheduled'");
        
        // Postgres date comparison
        const today = await pool.query("SELECT COUNT(*) as count FROM schedules WHERE preferred_date = CURRENT_DATE::text");

        return { 
            total: parseInt(total.rows[0].count), 
            pending: parseInt(pending.rows[0].count), 
            confirmed: parseInt(confirmed.rows[0].count), 
            completed: parseInt(completed.rows[0].count), 
            cancelled: parseInt(cancelled.rows[0].count), 
            rescheduled: parseInt(rescheduled.rows[0].count), 
            today: parseInt(today.rows[0].count)
        };
    }
};

const adminQueries = {
    findByUsername: async (username) => {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
        return result.rows[0];
    },
    verifyPassword: (password, hash) => {
        return bcrypt.compareSync(password, hash);
    }
};

function closeDb() {
    if (pool) {
        pool.end();
    }
}

module.exports = { initDb, getDb, scheduleQueries, adminQueries, closeDb };
