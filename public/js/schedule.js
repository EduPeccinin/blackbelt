// ===== SCHEDULE FORM LOGIC =====
const schedules = {
    kids: [
        'Seg/Qua 18h30-19h20',
        'Ter/Qui 18h30-19h20'
    ],
    infantil: [
        'Seg/Qua 18h30-19h20',
        'Seg/Qua 19h20-20h10',
        'Ter/Qui 17h00-17h50',
        'Ter/Qui 19h20-20h10'
    ],
    adulto: [
        'Seg/Qua 07h30-08h20',
        'Seg/Qua 20h10-21h00',
        'Ter/Qui 20h10-21h00'
    ]
};

const categorySelect = document.getElementById('category');
const scheduleSelect = document.getElementById('preferred_schedule');
const ageInput = document.getElementById('student_age');
const dateInput = document.getElementById('preferred_date');
const bookingForm = document.getElementById('bookingForm');
const formSuccess = document.getElementById('formSuccess');
const submitBtn = document.getElementById('submitBtn');
const whatsappInput = document.getElementById('whatsapp');

// Auto-select category based on age
ageInput?.addEventListener('input', () => {
    const age = parseInt(ageInput.value);
    if (age >= 4 && age <= 6) categorySelect.value = 'kids';
    else if (age >= 7 && age <= 11) categorySelect.value = 'infantil';
    else if (age >= 12) categorySelect.value = 'adulto';
    categorySelect.dispatchEvent(new Event('change'));
});

// Update schedule options when category changes
categorySelect?.addEventListener('change', () => {
    const cat = categorySelect.value;
    scheduleSelect.innerHTML = '<option value="">Selecione o horário...</option>';
    if (cat && schedules[cat]) {
        schedules[cat].forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            scheduleSelect.appendChild(opt);
        });
    }
});

// Set min date to today
if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
}

// WhatsApp mask
whatsappInput?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 7) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    e.target.value = v;
});

// Form submit
bookingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Agendando...';

    const data = {
        name: document.getElementById('name').value.trim(),
        whatsapp: whatsappInput.value,
        student_age: parseInt(ageInput.value),
        category: categorySelect.value,
        preferred_schedule: scheduleSelect.value,
        preferred_date: dateInput.value
    };

    try {
        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok && result.success) {
            bookingForm.style.display = 'none';
            formSuccess.classList.add('show');

            // Update WhatsApp link with notification
            if (result.whatsappLink) {
                const whatsappNotify = document.getElementById('whatsappNotify');
                if (whatsappNotify) whatsappNotify.href = result.whatsappLink;
            }
        } else {
            alert(result.error || 'Erro ao agendar. Tente novamente.');
            submitBtn.disabled = false;
            submitBtn.textContent = '🥋 Agendar Aula Experimental';
        }
    } catch (err) {
        alert('Erro de conexão. Verifique sua internet e tente novamente.');
        submitBtn.disabled = false;
        submitBtn.textContent = '🥋 Agendar Aula Experimental';
    }
});
