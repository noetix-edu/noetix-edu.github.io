/* --- NOETIX COURSE PROGRESSION SYSTEM --- */

const COURSE_KEY = 'noetix_ai_course';
const PASS_MARK = 3; // out of 5

const MODULE_META = {
  1: { title:'What Is AI?', emoji:'AI', lessons:4, color:'var(--blue)', accent:'linear-gradient(90deg,var(--blue),var(--purple))' },
  2: { title:'How AI Learns', emoji:'ML', lessons:4, color:'var(--green-d)', accent:'linear-gradient(90deg,var(--green),var(--blue))' },
  3: { title:'AI Sees & Hears', emoji:'CV', lessons:4, color:'var(--purple)', accent:'linear-gradient(90deg,var(--purple),var(--neon))' },
  4: { title:'AI Talks Back', emoji:'NLP', lessons:4, color:'var(--orange)', accent:'linear-gradient(90deg,var(--orange),var(--red))' },
  5: { title:'AI Decisions', emoji:'SYS', lessons:4, color:'var(--neon)', accent:'linear-gradient(90deg,var(--neon),var(--blue))' },
  6: { title:'AI in the World', emoji:'ETH', lessons:4, color:'var(--red)', accent:'linear-gradient(90deg,var(--red),var(--orange))' }
};

let toastTimer = null;
let sharedUiReady = false;

function getFreshProgress() {
  const p = { modules: {}, last_visited: null };
  for (let i = 1; i <= 6; i++) {
    p.modules[i] = { unlocked: i === 1, content_done: false, quiz_score: null, quiz_passed: false };
  }
  return p;
}

function normalizeProgress(raw) {
  const safe = getFreshProgress();
  if (!raw || typeof raw !== 'object') return safe;

  if (typeof raw.last_visited === 'number') {
    safe.last_visited = raw.last_visited;
  }

  for (let i = 1; i <= 6; i++) {
    const mod = raw.modules && raw.modules[i] ? raw.modules[i] : {};
    safe.modules[i] = {
      unlocked: i === 1 ? true : Boolean(mod.unlocked),
      content_done: Boolean(mod.content_done),
      quiz_score: Number.isFinite(mod.quiz_score) ? mod.quiz_score : null,
      quiz_passed: Boolean(mod.quiz_passed)
    };
  }

  return safe;
}

function getProgress() {
  try {
    const raw = localStorage.getItem(COURSE_KEY);
    if (raw) return normalizeProgress(JSON.parse(raw));
  } catch(e) {}
  return initProgress();
}

function initProgress() {
  return getFreshProgress();
}

function saveProgress(p) {
  try {
    localStorage.setItem(COURSE_KEY, JSON.stringify(normalizeProgress(p)));
  } catch(e) {}
}

function markContentDone(modNum) {
  const p = getProgress();
  p.modules[modNum].content_done = true;
  p.last_visited = modNum;
  saveProgress(p);
}

function saveQuizScore(modNum, score) {
  const p = getProgress();
  p.modules[modNum].quiz_score = score;
  const passed = score >= PASS_MARK;
  p.modules[modNum].quiz_passed = passed;
  if (passed && modNum < 6) {
    p.modules[modNum + 1].unlocked = true;
  }
  saveProgress(p);
  return passed;
}

function isModuleUnlocked(modNum) {
  const p = getProgress();
  return p.modules[modNum] && p.modules[modNum].unlocked;
}

function isContentDone(modNum) {
  const p = getProgress();
  return p.modules[modNum] && p.modules[modNum].content_done;
}

function isQuizPassed(modNum) {
  const p = getProgress();
  return p.modules[modNum] && p.modules[modNum].quiz_passed;
}

function getQuizScore(modNum) {
  const p = getProgress();
  return p.modules[modNum] ? p.modules[modNum].quiz_score : null;
}

function getOverallProgress() {
  const p = getProgress();
  let done = 0;
  for (let i = 1; i <= 6; i++) {
    if (p.modules[i] && p.modules[i].quiz_passed) done++;
  }
  return { done, total: 6, pct: Math.round((done / 6) * 100) };
}

function guardPage(modNum, type) {
  // type: 'module' or 'quiz'
  if (!isModuleUnlocked(modNum)) {
    window.location.href = 'course.html';
    return false;
  }
  if (type === 'quiz' && !isContentDone(modNum)) {
    window.location.href = `module-${modNum}.html`;
    return false;
  }
  return true;
}

function resetCourse() {
  localStorage.removeItem(COURSE_KEY);
  window.location.href = 'course.html';
}

/* - SHARED UI HELPERS - */
function showToast(msg, icon = 'OK') {
  const t = document.getElementById('toast');
  if (!t) return;

  const iconEl = t.querySelector('.toast-ico');
  const msgEl = t.querySelector('.toast-msg');

  if (iconEl) iconEl.textContent = icon;
  if (msgEl) msgEl.textContent = msg;

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  t.classList.add('show');
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    toastTimer = null;
  }, 3200);
}

function flashSuccess() {
  const f = document.getElementById('sFlash') || document.createElement('div');
  if (!f.parentNode) {
    f.className = 'success-flash';
    document.body.appendChild(f);
  }
  requestAnimationFrame(() => {
    f.classList.add('show');
    setTimeout(() => {
      f.classList.remove('show');
      if (!f.id) {
        setTimeout(() => f.remove(), 400);
      }
    }, 300);
  });
}

function setupScrollProgress() {
  const bar = document.getElementById('top-progress');
  if (!bar) return;

  let ticking = false;
  const update = () => {
    const doc = document.documentElement;
    const scrollable = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    bar.style.width = Math.min(Math.max(pct, 0), 100) + '%';
    ticking = false;
  };

  update();
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener('resize', update, { passive: true });
}

function setupNavScroll() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const syncNav = () => {
    nav.classList.toggle('scrolled', window.scrollY > 12);
  };

  syncNav();
  window.addEventListener('scroll', syncNav, { passive: true });
}

function setupReveal() {
  const items = document.querySelectorAll('.fade-up');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('in'));
    return;
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.1 });
  items.forEach(el => obs.observe(el));
}

function setupRipple() {
  document.querySelectorAll('[data-ripple]').forEach(btn => {
    if (btn.dataset.rippleBound === 'true') return;
    btn.dataset.rippleBound = 'true';

    btn.addEventListener('click', function(e) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = this.getBoundingClientRect();
      const r = document.createElement('span');
      r.className = 'ripple-wave';
      r.style.cssText = `left:${e.clientX-rect.left}px;top:${e.clientY-rect.top}px;width:40px;height:40px;margin:-20px 0 0 -20px`;
      this.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  });
}

function initSharedUi() {
  if (sharedUiReady) return;
  sharedUiReady = true;
  setupScrollProgress();
  setupNavScroll();
  setupReveal();
  setupRipple();
  updateNavProgress();
}

document.addEventListener('DOMContentLoaded', initSharedUi);

function updateNavProgress() {
  const fill = document.getElementById('nav-prog-fill');
  const label = document.getElementById('nav-prog-label');
  if (!fill && !label) return;
  const { done, total, pct } = getOverallProgress();
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = `${done}/${total}`;
}
