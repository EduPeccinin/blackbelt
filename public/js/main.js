// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== MOBILE MENU =====
const mobileToggle = document.getElementById('mobileToggle');
const mobileMenu = document.getElementById('mobileMenu');
const closeMenu = document.getElementById('closeMenu');

mobileToggle?.addEventListener('click', () => mobileMenu.classList.add('open'));
closeMenu?.addEventListener('click', () => mobileMenu.classList.remove('open'));
document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ===== SCROLL REVEAL =====
const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 100);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

// ===== COUNTER ANIMATION =====
const counters = document.querySelectorAll('[data-count]');
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.count);
            let current = 0;
            const increment = target / 60;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) { current = target; clearInterval(timer); }
                el.textContent = Math.floor(current) + (target >= 100 ? '+' : '+');
            }, 30);
            counterObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });

counters.forEach(c => counterObserver.observe(c));

// ===== SCHEDULE TABS =====
document.querySelectorAll('.schedule-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.schedule-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.schedule-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// ===== TESTIMONIAL SLIDER =====
let currentSlide = 0;
const track = document.getElementById('testimonialsTrack');
const dots = document.querySelectorAll('.slider-dot');
const totalSlides = dots.length;

function goToSlide(index) {
    currentSlide = index;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
}

dots.forEach(dot => dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.slide))));

// Auto-play
setInterval(() => goToSlide((currentSlide + 1) % totalSlides), 5000);

// Touch support for slider
let touchStartX = 0;
track?.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
track?.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
        if (diff > 0) goToSlide(Math.min(currentSlide + 1, totalSlides - 1));
        else goToSlide(Math.max(currentSlide - 1, 0));
    }
});

// ===== PARTICLES CANVAS =====
const canvas = document.getElementById('particlesCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 230, 118, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < 50; i++) particles.push(new Particle());

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// ===== GALLERY RESPONSIVE =====
const galleryGrid = document.querySelector('[style*="grid-template-columns:repeat(4"]');
if (galleryGrid && window.innerWidth < 640) {
    galleryGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
}
window.addEventListener('resize', () => {
    if (galleryGrid) {
        galleryGrid.style.gridTemplateColumns = window.innerWidth < 640 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
    }
});
