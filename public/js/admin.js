// ===== AUTH CHECK =====
async function checkAuth() {
    try {
        const res = await fetch('/api/admin/check');
        if (!res.ok) window.location.href = '/admin';
    } catch { window.location.href = '/admin'; }
}
checkAuth();

// ===== GLOBALS =====
const categoryLabels = { kids: 'Kids', infantil: 'Infantil', adulto: 'Adulto' };
const statusLabels = { pending: 'Pendente', confirmed: 'Confirmado', completed: 'Concluído', rescheduled: 'Remarcado', cancelled: 'Cancelado' };

// ===== DATE DISPLAY =====
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ===== TOAST =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = (type === 'success' ? '✅ ' : '❌ ') + message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== LOAD STATS =====
async function loadStats() {
    try {
        const res = await fetch('/api/admin/schedules/stats');
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('statToday').textContent = data.today;
        document.getElementById('statPending').textContent = data.pending;
        document.getElementById('statCompleted').textContent = data.completed;
        document.getElementById('statTotal').textContent = data.total;
    } catch (err) { console.error('Stats error:', err); }
}

// ===== LOAD SCHEDULES =====
async function loadSchedules() {
    const status = document.getElementById('filterStatus').value;
    const category = document.getElementById('filterCategory').value;
    const date = document.getElementById('filterDate').value;

    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (category !== 'all') params.set('category', category);
    if (date) params.set('date', date);

    try {
        const res = await fetch('/api/admin/schedules?' + params.toString());
        if (!res.ok) return;
        const data = await res.json();
        renderSchedules(data.schedules);
    } catch (err) { console.error('Load error:', err); }
}

function renderSchedules(schedules) {
    const tbody = document.getElementById('schedulesBody');
    const empty = document.getElementById('emptyState');

    if (!schedules || !schedules.length) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = schedules.map(function(s) {
        const dateFormatted = s.preferred_date.split('-').reverse().join('/');
        const whatsappLink = 'https://wa.me/55' + s.whatsapp;

        var completeBtnHtml = '';
        if (s.status !== 'completed') {
            completeBtnHtml = '<button class="action-btn" data-action="completed" data-id="' + s.id + '" title="Concluir">✅</button>';
        }

        var confirmBtnHtml = '';
        if (s.status !== 'confirmed' && s.status !== 'completed') {
            confirmBtnHtml = '<button class="action-btn" data-action="confirmed" data-id="' + s.id + '" title="Confirmar">👍</button>';
        }

        var cancelBtnHtml = '';
        if (s.status !== 'cancelled') {
            cancelBtnHtml = '<button class="action-btn danger" data-action="cancelled" data-id="' + s.id + '" title="Cancelar">❌</button>';
        }

        var notesHtml = '';
        if (s.notes) {
            notesHtml = '<br><small style="color:var(--text-dim)">' + escapeHtml(s.notes) + '</small>';
        }

        return '<tr>' +
            '<td><strong>' + escapeHtml(s.name) + '</strong>' + notesHtml + '</td>' +
            '<td><a href="' + whatsappLink + '" target="_blank" class="whatsapp-badge" title="Abrir WhatsApp">💬</a> ' + formatPhone(s.whatsapp) + '</td>' +
            '<td>' + s.student_age + '</td>' +
            '<td>' + (categoryLabels[s.category] || s.category) + '</td>' +
            '<td>' + dateFormatted + '</td>' +
            '<td>' + escapeHtml(s.preferred_schedule) + '</td>' +
            '<td><span class="status-badge status-' + s.status + '">' + (statusLabels[s.status] || s.status) + '</span></td>' +
            '<td><div class="action-btns">' +
                completeBtnHtml +
                confirmBtnHtml +
                '<button class="action-btn" data-action="reschedule" data-id="' + s.id + '" title="Remarcar">📅</button>' +
                cancelBtnHtml +
            '</div></td>' +
        '</tr>';
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatPhone(phone) {
    if (!phone) return '';
    if (phone.length === 11) return '(' + phone.slice(0,2) + ') ' + phone.slice(2,7) + '-' + phone.slice(7);
    if (phone.length === 10) return '(' + phone.slice(0,2) + ') ' + phone.slice(2,6) + '-' + phone.slice(6);
    return phone;
}

// ===== EVENT DELEGATION for action buttons =====
document.getElementById('schedulesBody').addEventListener('click', function(e) {
    var btn = e.target.closest('.action-btn');
    if (!btn) return;

    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');

    if (!action || !id) return;

    if (action === 'reschedule') {
        openRescheduleModal(parseInt(id));
    } else {
        handleStatusUpdate(parseInt(id), action);
    }
});

// ===== CUSTOM CONFIRM MODAL =====
function showConfirmModal(title, text, onConfirm) {
    var modal = document.getElementById('confirmModal');
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalText').textContent = text;
    
    var acceptBtn = document.getElementById('acceptConfirmBtn');
    var cancelBtn = document.getElementById('cancelConfirmBtn');
    
    // Remove old event listeners by cloning the button
    var newAcceptBtn = acceptBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
    
    newAcceptBtn.addEventListener('click', function() {
        modal.classList.remove('open');
        onConfirm();
    });
    
    cancelBtn.onclick = function() {
        modal.classList.remove('open');
    };
    
    modal.classList.add('open');
}

// Close generic modal clicking outside
document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('open');
    }
});

// ===== UPDATE STATUS =====
function handleStatusUpdate(id, status) {
    var confirmTitles = {
        completed: 'Concluir Aula',
        confirmed: 'Confirmar Agendamento',
        cancelled: 'Cancelar Agendamento'
    };
    var confirmTexts = {
        completed: 'Deseja marcar esta aula experimental como concluída?',
        confirmed: 'Deseja confirmar a presença deste aluno?',
        cancelled: 'Tem certeza que deseja cancelar este agendamento?'
    };
    
    var title = confirmTitles[status] || 'Alterar status';
    var text = confirmTexts[status] || 'Deseja realmente alterar o status deste agendamento?';

    showConfirmModal(title, text, async function() {
        try {
            var res = await fetch('/api/admin/schedules/' + id + '/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status })
            });
            var data = await res.json();
            if (res.ok && data.success) {
                showToast('Status atualizado com sucesso!');
                loadSchedules();
                loadStats();
            } else {
                showToast(data.error || 'Erro ao atualizar.', 'error');
            }
        } catch (err) {
            console.error('Update error:', err);
            showToast('Erro de conexão. Tente novamente.', 'error');
        }
    });
}

// ===== RESCHEDULE MODAL =====
function openRescheduleModal(id) {
    document.getElementById('rescheduleId').value = id;
    document.getElementById('newDate').value = '';
    document.getElementById('rescheduleNotes').value = '';
    document.getElementById('rescheduleModal').classList.add('open');
}

document.getElementById('cancelReschedule').addEventListener('click', function() {
    document.getElementById('rescheduleModal').classList.remove('open');
});

document.getElementById('confirmReschedule').addEventListener('click', async function() {
    var id = document.getElementById('rescheduleId').value;
    var date = document.getElementById('newDate').value;
    var schedule = document.getElementById('newSchedule').value;
    var notes = document.getElementById('rescheduleNotes').value;

    if (!date || !schedule) {
        showToast('Preencha data e horário.', 'error');
        return;
    }

    try {
        var res = await fetch('/api/admin/schedules/' + id + '/reschedule', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferred_date: date, preferred_schedule: schedule, notes: notes })
        });
        var data = await res.json();
        if (res.ok && data.success) {
            showToast('Agendamento remarcado com sucesso!');
            document.getElementById('rescheduleModal').classList.remove('open');
            loadSchedules();
            loadStats();
        } else {
            showToast(data.error || 'Erro ao remarcar.', 'error');
        }
    } catch (err) {
        console.error('Reschedule error:', err);
        showToast('Erro de conexão.', 'error');
    }
});

// Close modal clicking outside
document.getElementById('rescheduleModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('open');
    }
});

// ===== LOGOUT =====
document.getElementById('logoutBtn').addEventListener('click', async function() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin';
});

// ===== FILTERS =====
document.getElementById('applyFilters').addEventListener('click', loadSchedules);
document.getElementById('refreshBtn').addEventListener('click', function() {
    loadSchedules();
    loadStats();
});

// ===== SIDEBAR MOBILE =====
var sidebarToggle = document.getElementById('sidebarToggle');
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('open');
    });
}

// ===== INIT =====
loadStats();
loadSchedules();

// Auto-refresh every 30s
setInterval(function() {
    loadSchedules();
    loadStats();
}, 30000);
