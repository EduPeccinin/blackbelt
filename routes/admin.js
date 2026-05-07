const express = require('express');
const router = express.Router();
const { scheduleQueries, adminQueries } = require('../database/db');
const { requireAuth, loginLimiter, sanitizeBody } = require('../middleware/auth');

// POST /api/admin/login
router.post('/login', loginLimiter, sanitizeBody, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
        }

        const admin = await adminQueries.findByUsername(username);
        if (!admin) {
            // Deliberate generic error to not reveal user existence
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const valid = adminQueries.verifyPassword(password, admin.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // Regenerate session on login for security
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regenerate error:', err);
                return res.status(500).json({ error: 'Erro interno.' });
            }
            req.session.isAdmin = true;
            req.session.username = admin.username;
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Erro interno.' });
                }
                res.json({ success: true, message: 'Login realizado com sucesso.' });
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao fazer logout.' });
        }
        res.clearCookie('blackbelt_session');
        res.json({ success: true, message: 'Logout realizado.' });
    });
});

// GET /api/admin/check - Check if session is valid
router.get('/check', requireAuth, (req, res) => {
    res.json({ authenticated: true, username: req.session.username });
});

// GET /api/admin/schedules - List schedules with filters
router.get('/schedules', requireAuth, async (req, res) => {
    try {
        const { status, date, category } = req.query;
        const schedules = await scheduleQueries.getAll({ status, date, category });
        res.json({ schedules });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ error: 'Erro ao carregar agendamentos.' });
    }
});

// GET /api/admin/schedules/stats - Dashboard stats
router.get('/schedules/stats', requireAuth, async (req, res) => {
    try {
        const stats = await scheduleQueries.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Erro ao carregar estatísticas.' });
    }
});

// PATCH /api/admin/schedules/:id/status - Update status
router.patch('/schedules/:id/status', requireAuth, sanitizeBody, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Status inválido.' });
        }

        const schedule = await scheduleQueries.getById(parseInt(id));
        if (!schedule) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        await scheduleQueries.updateStatus(parseInt(id), status, notes || '');
        res.json({ success: true, message: 'Status atualizado com sucesso.' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status.' });
    }
});

// PATCH /api/admin/schedules/:id/reschedule - Reschedule
router.patch('/schedules/:id/reschedule', requireAuth, sanitizeBody, async (req, res) => {
    try {
        const { id } = req.params;
        const { preferred_date, preferred_schedule, notes } = req.body;

        if (!preferred_date || !preferred_schedule) {
            return res.status(400).json({ error: 'Data e horário são obrigatórios.' });
        }

        const schedule = await scheduleQueries.getById(parseInt(id));
        if (!schedule) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        await scheduleQueries.reschedule(parseInt(id), preferred_date, preferred_schedule, notes || '');
        res.json({ success: true, message: 'Agendamento remarcado com sucesso.' });
    } catch (error) {
        console.error('Error rescheduling:', error);
        res.status(500).json({ error: 'Erro ao remarcar agendamento.' });
    }
});

// DELETE /api/admin/schedules/:id - Delete schedule
router.delete('/schedules/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await scheduleQueries.getById(parseInt(id));
        if (!schedule) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        await scheduleQueries.delete(parseInt(id));
        res.json({ success: true, message: 'Agendamento removido.' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Erro ao remover agendamento.' });
    }
});

module.exports = router;
