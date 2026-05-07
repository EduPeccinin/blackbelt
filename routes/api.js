const express = require('express');
const router = express.Router();
const { scheduleQueries } = require('../database/db');
const { scheduleLimiter, sanitizeBody } = require('../middleware/auth');

// POST /api/schedule - Create new schedule (public)
router.post('/schedule', scheduleLimiter, sanitizeBody, async (req, res) => {
    try {
        const { name, whatsapp, student_age, category, preferred_schedule, preferred_date } = req.body;

        // Validation
        if (!name || !whatsapp || !student_age || !category || !preferred_schedule || !preferred_date) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        if (name.length < 3 || name.length > 100) {
            return res.status(400).json({ error: 'Nome deve ter entre 3 e 100 caracteres.' });
        }

        const whatsappClean = whatsapp.replace(/\D/g, '');
        if (whatsappClean.length < 10 || whatsappClean.length > 13) {
            return res.status(400).json({ error: 'Número de WhatsApp inválido.' });
        }

        const age = parseInt(student_age);
        if (isNaN(age) || age < 3 || age > 99) {
            return res.status(400).json({ error: 'Idade deve ser entre 3 e 99 anos.' });
        }

        const validCategories = ['kids', 'infantil', 'adulto'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Categoria inválida.' });
        }

        // Validate date is not in the past
        const selectedDate = new Date(preferred_date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            return res.status(400).json({ error: 'A data não pode ser no passado.' });
        }

        const result = await scheduleQueries.create({
            name,
            whatsapp: whatsappClean,
            student_age: age,
            category,
            preferred_schedule,
            preferred_date
        });

        // Build WhatsApp notification message
        const categoryLabels = { kids: 'Kids (4-6 anos)', infantil: 'Infantil (7-11 anos)', adulto: 'Adulto (12+)' };
        const whatsappMessage = encodeURIComponent(
            `🥋 *Novo Agendamento - Aula Experimental*\n\n` +
            `👤 *Nome:* ${name}\n` +
            `📱 *WhatsApp:* ${whatsapp}\n` +
            `🎂 *Idade:* ${age} anos\n` +
            `📋 *Categoria:* ${categoryLabels[category]}\n` +
            `📅 *Data:* ${preferred_date.split('-').reverse().join('/')}\n` +
            `🕐 *Horário:* ${preferred_schedule}\n\n` +
            `_Agendamento realizado pelo site._`
        );

        res.status(201).json({
            success: true,
            message: 'Aula experimental agendada com sucesso!',
            scheduleId: result.lastInsertRowid,
            whatsappLink: `https://wa.me/5516997048080?text=${whatsappMessage}`
        });
    } catch (error) {
        console.error('Error creating schedule:', error);
        res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
});

module.exports = router;
