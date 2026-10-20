// Contact tracking for the static pages (about, contact, guides, legal).
// Mirrors initContactTracking in src/main.ts, which covers the home page.
document.addEventListener('click', function (e) {
  var link = e.target && e.target.closest && e.target.closest('a[href]');
  if (!link) return;
  var href = link.getAttribute('href') || '';
  var type = href.indexOf('tel:') === 0 ? 'call' : href.indexOf('wa.me/') !== -1 ? 'whatsapp' : '';
  if (!type) return;
  var section = link.closest('[id]');
  var payload = JSON.stringify({
    type: type,
    source: link.getAttribute('data-track') || (section ? section.id : 'page'),
    page: location.pathname,
    referrer: document.referrer
  });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))) return;
  } catch (err) { /* fall back to fetch */ }
  fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function () {});
});
