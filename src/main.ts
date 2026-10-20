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
  const sections = ['home', 'properties', 'services', 'about', 'contact'];
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
      <div class="service-icon-wrap" aria-hidden="true">${service.icon}</div>
      <span class="service-tag">${service.tag}</span>
      <h3 class="service-title">${service.title}</h3>
      <p class="service-desc">${service.description}</p>
      <div class="service-features">
        ${service.features
          .map(
            (f) => `
          <div class="service-feature">
            <span class="service-feature-dot"></span>
            <span>${f}</span>
          </div>`
          )
          .join('')}
      </div>
      <a href="#contact" class="service-cta">
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
      'listing':       'Enquiry about a listed property',
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

    trackContact('form', `form: ${serviceName}`);

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
// CONTACT TRACKING
// ===========================
type ContactType = 'whatsapp' | 'call' | 'form';

// Fire-and-forget beacon to /api/track. sendBeacon survives the page being
// left for WhatsApp or the dialer, which a plain fetch may not.
function trackContact(type: ContactType, source: string): void {
  const payload = JSON.stringify({
    type,
    source,
    page: location.pathname + location.hash,
    referrer: document.referrer,
  });
  try {
    const blob = new Blob([payload], { type: 'application/json' });
    if (navigator.sendBeacon?.('/api/track', blob)) return;
  } catch {
    /* fall back to fetch below */
  }
  void fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

// Name the button the visitor used: the listing it sits in, an explicit
// data-track label, or the nearest section.
function contactSource(link: Element): string {
  const labelled = link.closest<HTMLElement>('[data-track]');
  if (labelled) return labelled.dataset['track'] ?? '';
  const listing = link.closest('.listing-card')?.querySelector('.listing-title');
  if (listing?.textContent) return `listing: ${listing.textContent.trim()}`;
  return link.closest('[id]')?.id ?? 'page';
}

function initContactTracking(): void {
  // One delegated listener covers every tel: and wa.me link, including the
  // popup-blocked fallback link the form writes in later.
  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') ?? '';
    if (href.startsWith('tel:')) trackContact('call', contactSource(link));
    else if (href.includes('wa.me/')) trackContact('whatsapp', contactSource(link));
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
// INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  renderServices();
  initContactForm();
  initContactTracking();
  initScrollTop();
  setFooterYear();
  initSmoothScroll();
  initScrollProgress();
});
