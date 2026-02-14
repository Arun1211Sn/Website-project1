import { services } from './services-data';
import type { FormData, ValidationResult } from './types';

// ===========================
// NAVBAR
// ===========================
function initNavbar(): void {
  const navbar = document.getElementById('navbar') as HTMLElement;
  const hamburger = document.getElementById('hamburger') as HTMLButtonElement;
  const navLinks = document.getElementById('navLinks') as HTMLElement;

  // Scroll behavior
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    updateActiveNavLink();
  });

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  // Close menu on link click
  navLinks.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target as Node)) {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    }
  });
}

function updateActiveNavLink(): void {
  const sections = ['home', 'services', 'about', 'contact'];
  const navLinks = document.querySelectorAll('.nav-link');

  let current = '';
  sections.forEach((id) => {
    const section = document.getElementById(id);
    if (section && window.scrollY >= section.offsetTop - 120) {
      current = id;
    }
  });

  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

// ===========================
// SERVICES GRID
// ===========================
function renderServices(): void {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  grid.innerHTML = services
    .map(
      (service) => `
    <div class="service-card" data-id="${service.id}">
      <div class="service-icon-wrap" style="background:${service.bgColor}">
        ${service.icon}
      </div>
      <span class="service-tag" style="color:${service.tagColor};background:${service.tagBg}">
        ${service.tag}
      </span>
      <h3 class="service-title">${service.title}</h3>
      <p class="service-desc">${service.description}</p>
      <div class="service-features">
        ${service.features
          .map(
            (f) => `
          <div class="service-feature">
            <span class="service-feature-dot" style="background:${service.color}"></span>
            <span>${f}</span>
          </div>`
          )
          .join('')}
      </div>
      <a href="#contact" class="service-cta" style="color:${service.ctaColor}">
        Enquire Now <span>→</span>
      </a>
    </div>`
    )
    .join('');

  // Observe cards for fade-in animation
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );

  document.querySelectorAll('.service-card').forEach((card) => observer.observe(card));
}

// ===========================
// COUNTER ANIMATION
// ===========================
function animateCounters(): void {
  const counters = document.querySelectorAll<HTMLElement>('.stat-number[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset['target'] ?? '0', 10);
          const duration = 1800;
          const start = performance.now();

          function update(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
          }

          requestAnimationFrame(update);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((c) => observer.observe(c));
}

// ===========================
// CONTACT FORM
// ===========================
function validateForm(data: FormData): ValidationResult {
  const errors: Partial<Record<keyof FormData, string>> = {};

  if (!data.name.trim()) {
    errors.name = 'Please enter your full name.';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  const phoneClean = data.phone.replace(/\D/g, '');
  if (!data.phone.trim()) {
    errors.phone = 'Please enter your phone number.';
  } else if (phoneClean.length < 10 || phoneClean.length > 12) {
    errors.phone = 'Please enter a valid 10-digit phone number.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function setFieldError(fieldId: string, message: string): void {
  const field = document.getElementById(fieldId) as HTMLInputElement | null;
  const errorEl = document.getElementById(`${fieldId}Error`) as HTMLElement | null;
  if (field) field.classList.toggle('error', !!message);
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldId: string): void {
  setFieldError(fieldId, '');
}

function initContactForm(): void {
  const form = document.getElementById('contactForm') as HTMLFormElement;
  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
  const successEl = document.getElementById('formSuccess') as HTMLElement;

  if (!form) return;

  // Real-time validation on blur
  ['name', 'phone'].forEach((fieldId) => {
    const el = document.getElementById(fieldId);
    el?.addEventListener('input', () => clearFieldError(fieldId));
  });

  form.addEventListener('submit', (e: Event) => {
    e.preventDefault();

    const formData: FormData = {
      name: (document.getElementById('name') as HTMLInputElement).value,
      phone: (document.getElementById('phone') as HTMLInputElement).value,
      service: (document.getElementById('service') as HTMLSelectElement).value,
      message: (document.getElementById('message') as HTMLTextAreaElement).value,
    };

    const { valid, errors } = validateForm(formData);

    // Clear old errors
    setFieldError('name', errors.name ?? '');
    setFieldError('phone', errors.phone ?? '');

    if (!valid) return;

    // Simulate form submission
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    setTimeout(() => {
      submitBtn.textContent = 'Send Enquiry';
      submitBtn.disabled = false;
      form.reset();
      successEl.classList.add('visible');

      setTimeout(() => successEl.classList.remove('visible'), 5000);
    }, 1200);
  });
}

// ===========================
// SCROLL TO TOP
// ===========================
function initScrollTop(): void {
  const btn = document.getElementById('scrollTop') as HTMLButtonElement;
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===========================
// FOOTER YEAR
// ===========================
function setFooterYear(): void {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear().toString();
}

// ===========================
// SMOOTH ANCHOR SCROLL
// ===========================
function initSmoothScroll(): void {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ===========================
// INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  renderServices();
  animateCounters();
  initContactForm();
  initScrollTop();
  setFooterYear();
  initSmoothScroll();
});
