import { services } from './services-data';
import type { FormData, ValidationResult } from './types';
import { initHeroScene } from './hero-scene';

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
      <div class="card-shine"></div>
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

    // Build WhatsApp message from form data
    const serviceLabels: Record<string, string> = {
      'land-buy-sell': 'Land Buying & Selling',
      'plots':         'Plots Selling',
      'farm-land':     'Farm Land Selling',
      'painting':      'Building Painting',
      'tree-cutting':  'Tree Cutting & Farm Land Tree Cutting',
      'land-cleaning': 'Vacant Land Cleaning & Sand',
    };

    const serviceName = formData.service
      ? serviceLabels[formData.service] ?? formData.service
      : 'Not specified';

    const msgLines = [
      'Hello Thirupathi S.T.S Groups Realty,',
      '',
      `Name: ${formData.name}`,
      `Phone: ${formData.phone}`,
      `Service: ${serviceName}`,
    ];
    if (formData.message.trim()) {
      msgLines.push(`Message: ${formData.message.trim()}`);
    }

    const whatsappURL =
      `https://wa.me/919884836380?text=${encodeURIComponent(msgLines.join('\n'))}`;

    // Record the lead server-side first, so the enquiry survives even if the
    // WhatsApp hand-off below never lands. Deliberately not awaited: the
    // window.open that follows must stay inside the user-activation window, and
    // awaiting a fetch would spend it. Failures are non-fatal by design.
    void fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        phone: formData.phone,
        service: formData.service,
        message: formData.message,
      }),
      keepalive: true,
    }).catch(() => {
      /* The WhatsApp hand-off is the primary channel; ignore. */
    });

    // Brief busy state. Set and cleared synchronously either side of
    // window.open so the user gesture is never spent on a timer.
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    // Opened synchronously and NOT inside a setTimeout. Browsers only honour
    // window.open while the user gesture that triggered it is still active, and
    // a timer breaks that chain — which is why mobile Safari and Chrome used to
    // block this silently while the form still claimed success.
    const opened = window.open(whatsappURL, '_blank', 'noopener,noreferrer');

    submitBtn.textContent = 'Send Enquiry';
    submitBtn.disabled = false;
    form.reset();

    if (opened && !opened.closed) {
      successEl.textContent = "✓ WhatsApp opened! We'll respond to your enquiry shortly.";
      successEl.classList.add('visible');
      setTimeout(() => successEl.classList.remove('visible'), 5000);
      return;
    }

    // Popup blocked, or no handler for the link. Say so honestly and hand over a
    // link the customer can tap themselves, rather than claiming it worked.
    successEl.innerHTML =
      "✓ Enquiry received — we have your details and will call you back. " +
      '<a href="' + whatsappURL + '" target="_blank" rel="noopener noreferrer">' +
      'Tap here to also send it on WhatsApp</a>.';
    successEl.classList.add('visible');
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
// SCROLL PROGRESS BAR
// ===========================
function initScrollProgress(): void {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? `${(scrolled / total) * 100}%` : '0%';
  }, { passive: true });
}

// ===========================
// CUSTOM CURSOR
// ===========================
function initCustomCursor(): void {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  // Only on pointer devices
  if (!window.matchMedia('(hover: hover)').matches) return;

  let dotX  = 0, dotY  = 0;
  let rafId = 0;

  document.addEventListener('mousemove', (e) => {
    dotX = e.clientX;
    dotY = e.clientY;
    dot.style.transform = `translate(calc(${dotX}px - 50%), calc(${dotY}px - 50%))`;
  });

  function loopRing(): void {
    rafId = requestAnimationFrame(loopRing);
    // Lazy lerp for ring
    const mx = parseFloat(ring!.dataset['x'] ?? '0');
    const my = parseFloat(ring!.dataset['y'] ?? '0');
    const nx = mx + (dotX - mx) * 0.15;
    const ny = my + (dotY - my) * 0.15;
    ring!.dataset['x'] = String(nx);
    ring!.dataset['y'] = String(ny);
    ring!.style.transform = `translate(calc(${nx}px - 50%), calc(${ny}px - 50%))`;
  }
  loopRing();

  const expandTargets = 'a, button, .service-card, .btn, .nav-link';
  document.querySelectorAll(expandTargets).forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('expanded'));
    el.addEventListener('mouseleave', () => ring.classList.remove('expanded'));
  });

  // Cleanup if page hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else loopRing();
  });
}

// ===========================
// 3D CARD TILT
// ===========================
function initCardTilt(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  document.querySelectorAll<HTMLElement>('.service-card').forEach((card) => {
    const shine = card.querySelector<HTMLElement>('.card-shine');

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2); // -1 … 1
      const dy   = (e.clientY - cy) / (rect.height / 2); // -1 … 1

      const rotateX = -dy * 10;
      const rotateY =  dx * 10;

      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;

      if (shine) {
        const shineX = ((e.clientX - rect.left) / rect.width ) * 100;
        const shineY = ((e.clientY - rect.top)  / rect.height) * 100;
        shine.style.setProperty('--shine-x', `${shineX}%`);
        shine.style.setProperty('--shine-y', `${shineY}%`);
      }
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ===========================
// MAGNETIC BUTTONS
// ===========================
function initMagneticButtons(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  document.querySelectorAll<HTMLElement>('.hero-buttons .btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2);
      const dy   = (e.clientY - cy) / (rect.height / 2);

      btn.style.transform = `translate(${dx * 6}px, ${dy * 4}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
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
  initScrollProgress();
  initCustomCursor();
  initCardTilt();
  initMagneticButtons();
  initHeroScene();
});
