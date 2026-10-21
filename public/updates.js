// Scrolling updates bar and new-project alert, shared by every page.
// Each page ships with the current messages in its #ticker markup; this script
// refreshes them from /api/updates (the "Updates" tab of the owner's sheet),
// keeps the bar scrolling, and shows a one-time alert for a new project.
(function () {
  var ticker = document.getElementById('ticker');
  if (!ticker) return;
  var list = ticker.querySelector('.ticker-list');
  var WA = 'https://wa.me/919884836380?text=' +
    encodeURIComponent('Hi, please add me to your new project alerts.');

  function item(u) {
    var li = document.createElement('li');
    var el = document.createElement(u.link ? 'a' : 'span');
    if (u.link) el.href = u.link;
    if (u.type === 'new') {
      var badge = document.createElement('b');
      badge.className = 'ticker-new';
      badge.textContent = 'NEW';
      el.appendChild(badge);
    }
    // The NEW badge already says it, so a typed "New:" prefix is dropped.
    el.appendChild(document.createTextNode(u.type === 'new' ? u.message.replace(/^new\s*[:\-]\s*/i, '') : u.message));
    li.appendChild(el);
    return li;
  }

  // The list is doubled so the CSS animation (translateX to -50%) loops
  // without a gap; speed is kept constant whatever the message length.
  function startScroll() {
    var items = Array.prototype.slice.call(list.children).filter(function (li) {
      return !li.hasAttribute('aria-hidden');
    });
    list.querySelectorAll('[aria-hidden]').forEach(function (li) { li.remove(); });
    items.forEach(function (li) {
      var copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
      list.appendChild(copy);
    });
    var half = list.scrollWidth / 2;
    list.style.animationDuration = Math.max(half / 60, 12) + 's';
    ticker.classList.add('is-running');
  }

  function readUpdates() {
    return Array.prototype.map.call(list.querySelectorAll('li:not([aria-hidden])'), function (li) {
      var a = li.querySelector('a');
      return {
        type: li.querySelector('.ticker-new') ? 'new' : 'update',
        message: li.textContent.replace(/^NEW/, '').trim(),
        link: a ? a.getAttribute('href') : '',
        date: li.getAttribute('data-date') || ''
      };
    });
  }

  function showAlert(updates) {
    var here = location.pathname;
    var fresh = updates.filter(function (u) {
      if (u.type !== 'new' || u.link === here) return false;
      var age = (Date.now() - new Date(u.date).getTime()) / 864e5;
      return !u.date || age < 45;
    })[0];
    if (!fresh) return;
    var key = 'alert-seen:' + fresh.message;
    try { if (localStorage.getItem(key)) return; } catch (e) { /* show anyway */ }

    var box = document.createElement('aside');
    box.className = 'project-alert';
    box.setAttribute('aria-label', 'New project');
    box.innerHTML =
      '<button type="button" class="project-alert-close" aria-label="Close">×</button>' +
      '<p class="project-alert-label">New project</p><p class="project-alert-text"></p>' +
      '<div class="project-alert-actions"></div>';
    box.querySelector('.project-alert-text').textContent = fresh.message.replace(/^New:\s*/i, '');
    var actions = box.querySelector('.project-alert-actions');
    if (fresh.link) {
      var view = document.createElement('a');
      view.href = fresh.link;
      view.className = 'project-alert-view';
      view.textContent = 'View details';
      actions.appendChild(view);
    }
    var wa = document.createElement('a');
    wa.href = WA;
    wa.target = '_blank';
    wa.rel = 'noopener noreferrer';
    wa.className = 'project-alert-wa';
    wa.setAttribute('data-track', 'new project alert signup');
    wa.textContent = 'Get alerts on WhatsApp';
    actions.appendChild(wa);

    function close() {
      try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ }
      box.remove();
    }
    box.querySelector('.project-alert-close').addEventListener('click', close);
    actions.addEventListener('click', close);
    setTimeout(function () {
      document.body.appendChild(box);
    }, 2500);
  }

  startScroll();
  fetch('/api/updates')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var updates = data && data.updates;
      if (updates && updates.length) {
        list.textContent = '';
        updates.forEach(function (u) {
          var li = item(u);
          if (u.date) li.setAttribute('data-date', u.date);
          list.appendChild(li);
        });
        startScroll();
      }
      showAlert(updates && updates.length ? updates : readUpdates());
    })
    .catch(function () { showAlert(readUpdates()); });
})();
