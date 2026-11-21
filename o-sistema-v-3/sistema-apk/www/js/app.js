const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORAGE = 'orbit-organizer-v1';

/* ---------- Configuração do sistema de ranks ---------- */
const LEVEL_XP = 100;            // XP por nível
const DAILY_GOAL = 3, DAILY_BONUS = 50;
const RANKS = [
  { k: 'E', min: 1,  name: 'Novato',     color: '#8f9bb3' },
  { k: 'D', min: 5,  name: 'Aprendiz',   color: '#3fc79a' },
  { k: 'C', min: 10, name: 'Combatente', color: '#4aa3ff' },
  { k: 'B', min: 15, name: 'Veterano',   color: '#9a7bff' },
  { k: 'A', min: 25, name: 'Elite',      color: '#ffb23f' },
  { k: 'S', min: 40, name: 'Monarca',    color: '#ff4d6d' }
];
const XP = { baixa: 10, normal: 25, alta: 50 };
const QUEST_RANK = { baixa: 'E', normal: 'C', alta: 'A' };
const POINTS = { baixa: 1, normal: 2, alta: 3 };
const ATTRS = { for: 'Força', agi: 'Agilidade', int: 'Inteligência', vit: 'Vigor', sen: 'Percepção' };

/* ---------- Utilidades ---------- */
const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
const sameDay = (a, b) => dateKey(a) === dateKey(b);
const monthName = d => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const longDate = d => d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function showToast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => el.classList.remove('show'), 2600); }

/* ---------- Dados (com migração do formato antigo) ---------- */
function load() { try { return JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch { return {}; } }
let data = load();
data.tasks = data.tasks || [];
data.events = data.events || [];
if (!data.hunter) {
  data.hunter = { name: '', xp: 0, stats: { for: 0, agi: 0, int: 0, vit: 0, sen: 0 }, daily: { date: '', claimed: false } };
  data.tasks.forEach(t => {
    t.attr = t.attr || 'int';
    if (t.done) {
      data.hunter.xp += XP[t.priority] || 25;
      data.hunter.stats[t.attr] += POINTS[t.priority] || 2;
    }
  });
}
let view = 'inicio', filter = 'todas', modalType = 'task';
let cursor = new Date(); cursor.setDate(1);
let selectedDate = new Date(); selectedDate.setHours(0, 0, 0, 0);

function save() { localStorage.setItem(STORAGE, JSON.stringify(data)); renderAll(); }

/* ---------- Lógica de rank ---------- */
const levelOf = xp => Math.floor(xp / LEVEL_XP) + 1;
const rankIndex = level => { let i = 0; RANKS.forEach((r, n) => { if (level >= r.min) i = n; }); return i; };
function state() {
  const xp = data.hunter.xp, level = levelOf(xp), idx = rankIndex(level);
  return { xp, level, idx, rank: RANKS[idx], next: RANKS[idx + 1] || null };
}
function paintRank(el, rank) {
  if (!el) return;
  el.textContent = rank.k;
  el.style.setProperty('--rc', rank.color);
  el.style.setProperty('--rg', rank.color + '66');
}
const hunterName = () => data.hunter.name || 'Caçador';

function streak() {
  const days = new Set(data.tasks.filter(t => t.done && t.doneAt).map(t => t.doneAt));
  let d = new Date(); d.setHours(0, 0, 0, 0);
  if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const doneToday = () => data.tasks.filter(t => t.done && t.doneAt === dateKey(new Date())).length;

/* ---------- Ganho / perda de XP ---------- */
function applyXp(delta) {
  const before = state();
  data.hunter.xp = Math.max(0, data.hunter.xp + delta);
  return { before, after: state() };
}
function announce(before, after, gained) {
  if (after.idx > before.idx) {
    showRankUp(after.rank, after.level);
  } else if (after.level > before.level) {
    showToast(`[ SISTEMA ] LEVEL UP! Você alcançou o Nv ${after.level}.`);
  } else if (gained) {
    showToast(`[ SISTEMA ] +${gained} XP`);
  }
}
function showRankUp(rank, level) {
  paintRank($('#ruEmblem'), rank);
  $('#ruTag').textContent = '[ NOTIFICAÇÃO ]';
  $('#ruTitle').textContent = `RANK UP! RANK ${rank.k}`;
  $('#ruText').textContent = `Parabéns, ${hunterName()}. Você agora é um caçador Rank ${rank.k} — ${rank.name} (Nv ${level}).`;
  $('#rankModal').classList.remove('hidden');
}
function toggleTask(id, done) {
  const t = data.tasks.find(x => x.id === id); if (!t) return;
  const gain = XP[t.priority] || 25, pts = POINTS[t.priority] || 2, attr = t.attr || 'int';
  t.done = done; t.doneAt = done ? dateKey(new Date()) : null;
  data.hunter.stats[attr] = Math.max(0, (data.hunter.stats[attr] || 0) + (done ? pts : -pts));
  const { before, after } = applyXp(done ? gain : -gain);
  let total = done ? gain : 0, bonus = false;
  // missão diária
  const today = dateKey(new Date());
  if (data.hunter.daily.date !== today) data.hunter.daily = { date: today, claimed: false };
  if (done && !data.hunter.daily.claimed && doneToday() >= DAILY_GOAL) {
    data.hunter.daily.claimed = true; bonus = true;
    applyXp(DAILY_BONUS); total += DAILY_BONUS;
  }
  const final = state();
  save();
  if (done) {
    announce(before, final, total);
    if (bonus && final.idx === before.idx && final.level === before.level) showToast(`[ SISTEMA ] Missão diária concluída! +${DAILY_BONUS} XP`);
  } else {
    showToast(`[ SISTEMA ] −${gain} XP`);
  }
}

/* ---------- Renderização ---------- */
function eventMarkup(e) { const d = parseDate(e.date); return `<div class="event-line"><div class="event-date">${pad(d.getDate())}<br>${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</div><div><strong>${escapeHTML(e.title)}</strong><small>${e.time ? e.time + ' · ' : ''}${longDate(d)}</small></div></div>`; }
function taskMarkup(t) {
  const qr = RANKS.find(r => r.k === QUEST_RANK[t.priority]) || RANKS[2];
  return `<div class="task-row ${t.done ? 'completed' : ''}"><input class="task-check" type="checkbox" data-task="${t.id}" ${t.done ? 'checked' : ''} aria-label="Concluir missão"><div class="task-info"><strong>${escapeHTML(t.title)}</strong><small>${t.done ? 'Concluída' : 'Missão ativa'} · ${ATTRS[t.attr] || 'Inteligência'}</small></div><span class="quest-rank" style="--rc:${qr.color}">${qr.k}</span><span class="priority ${t.priority}">+${XP[t.priority] || 25} XP</span><button class="delete-item" data-delete-task="${t.id}" title="Excluir">×</button></div>`;
}
function renderStats() {
  $('#pendingCount').textContent = data.tasks.filter(t => !t.done).length;
  $('#doneCount').textContent = data.tasks.filter(t => t.done).length;
  $('#eventCount').textContent = data.events.filter(e => e.date.slice(0, 7) === dateKey(new Date()).slice(0, 7)).length;
}
function renderHunter() {
  const s = state(), name = hunterName();
  const inLevel = s.xp % LEVEL_XP;
  const toNext = s.next ? (s.next.min - 1) * LEVEL_XP - s.xp : 0;
  const nextTxt = s.next ? `Próximo rank: ${s.next.k} (faltam ${toNext} XP)` : 'Rank máximo alcançado';
  const rankTxt = `Rank ${s.rank.k} · ${s.rank.name}`;

  // barra lateral / topo
  paintRank($('#sideRank'), s.rank); paintRank($('#topRank'), s.rank);
  $('#sideName').textContent = name;
  $('#sideMeta').textContent = `Rank ${s.rank.k} · Nv ${s.level}`;
  $('#greetName').textContent = name;

  // cartão da home
  paintRank($('#homeRank'), s.rank);
  $('#homeHunterName').textContent = name;
  $('#homeRankName').textContent = rankTxt;
  $('#homeLevel').textContent = `Nv ${s.level}`;
  $('#homeXpBar').style.width = (inLevel / LEVEL_XP * 100) + '%';
  $('#homeXpText').textContent = `${inLevel} / ${LEVEL_XP} XP`;
  $('#homeNextRank').textContent = nextTxt;

  // página de status
  paintRank($('#stRank'), s.rank);
  $('#stRankName').textContent = rankTxt;
  $('#stLevel').textContent = `Nv ${s.level}`;
  $('#stXpBar').style.width = (inLevel / LEVEL_XP * 100) + '%';
  $('#stXpText').textContent = `${inLevel} / ${LEVEL_XP} XP para o Nv ${s.level + 1}`;
  $('#stNextRank').textContent = nextTxt;
  $('#stXpTotal').textContent = s.xp;
  $('#stDone').textContent = data.tasks.filter(t => t.done).length;
  $('#stStreak').textContent = streak() + ' d';
  if (document.activeElement !== $('#hunterNameInput')) $('#hunterNameInput').value = data.hunter.name;

  const max = Math.max(10, ...Object.values(data.hunter.stats));
  $('#attrList').innerHTML = Object.entries(ATTRS).map(([k, label]) => {
    const v = data.hunter.stats[k] || 0;
    return `<div class="attr"><span>${label}</span><div class="attr-bar"><i style="width:${v / max * 100}%"></i></div><strong>${v}</strong></div>`;
  }).join('');

  $('#rankLadder').innerHTML = RANKS.map((r, i) => {
    const st = i < s.idx ? 'done' : i === s.idx ? 'current' : 'locked';
    const label = st === 'done' ? 'Conquistado' : st === 'current' ? 'Rank atual' : 'Bloqueado';
    return `<div class="ladder-row ${st}" style="--rc:${r.color};--rg:${r.color}66"><span class="ladder-badge">${r.k}</span><div><strong>${r.name}</strong><small>A partir do Nv ${r.min} · ${(r.min - 1) * LEVEL_XP} XP</small></div><em>${label}</em></div>`;
  }).join('');

  // missão diária
  const n = Math.min(doneToday(), DAILY_GOAL);
  const claimed = data.hunter.daily.date === dateKey(new Date()) && data.hunter.daily.claimed;
  $('#dailyCount').textContent = `${n}/${DAILY_GOAL}`;
  $('#dailyBar').style.width = (n / DAILY_GOAL * 100) + '%';
  $('#dailyState').textContent = claimed ? 'Recompensa recebida hoje.' : 'Recompensa disponível ao concluir.';
  $('#dailyQuest').classList.toggle('complete', claimed);
}
function renderTasks() {
  const recent = data.tasks.slice().reverse().slice(0, 5);
  $('#homeTasks').innerHTML = recent.map(taskMarkup).join('');
  $('#homeEmpty').classList.toggle('hidden', recent.length > 0);
  let list = data.tasks.filter(t => filter === 'todas' || (filter === 'pendentes' && !t.done) || (filter === 'concluidas' && t.done)).slice().reverse();
  $('#allTasks').innerHTML = list.map(taskMarkup).join('');
  $('#tasksEmpty').classList.toggle('hidden', list.length > 0);
  $('#taskSummary').textContent = `${data.tasks.length} missão(ões) no total`;
}
function renderMini() {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  $('#miniMonth').textContent = monthName(cursor);
  const first = new Date(year, month, 1), start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].forEach(x => cells.push(`<span>${x}</span>`));
  for (let i = 0; i < 42; i++) {
    let day, dt, out = false;
    if (i < start) { day = prevDays - start + i + 1; dt = new Date(year, month - 1, day); out = true; }
    else if (i >= start + days) { day = i - start - days + 1; dt = new Date(year, month + 1, day); out = true; }
    else { day = i - start + 1; dt = new Date(year, month, day); }
    const has = data.events.some(e => e.date === dateKey(dt));
    cells.push(`<button class="${sameDay(dt, new Date()) ? 'selected' : ''} ${has ? 'has-event' : ''}" data-mini-date="${dateKey(dt)}" ${out ? 'style="opacity:.35"' : ''}>${day}</button>`);
  }
  $('#miniCalendar').innerHTML = cells.join('');
  const upcoming = data.events.filter(e => e.date >= dateKey(new Date())).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3);
  $('#upcomingEvents').innerHTML = upcoming.length ? upcoming.map(eventMarkup).join('') : '<div class="muted">Nenhum evento próximo.</div>';
}
function renderCalendar() {
  $('#calendarTitle').textContent = monthName(cursor);
  $('#selectedDateLabel').textContent = longDate(selectedDate);
  const year = cursor.getFullYear(), month = cursor.getMonth(), first = new Date(year, month, 1), start = (first.getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate(), prevDays = new Date(year, month, 0).getDate();
  let html = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(x => `<div class="weekday">${x}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    let day, dt, out = false;
    if (i < start) { day = prevDays - start + i + 1; dt = new Date(year, month - 1, day); out = true; }
    else if (i >= start + days) { day = i - start - days + 1; dt = new Date(year, month + 1, day); out = true; }
    else { day = i - start + 1; dt = new Date(year, month, day); }
    const has = data.events.some(e => e.date === dateKey(dt));
    html += `<button class="calendar-day ${out ? 'outside' : ''} ${sameDay(dt, new Date()) ? 'today' : ''} ${sameDay(dt, selectedDate) ? 'selected' : ''}" data-calendar-date="${dateKey(dt)}"><span class="day-number">${day}</span>${has ? '<span class="day-dots"><i></i><i></i></span>' : ''}</button>`;
  }
  $('#calendarGrid').innerHTML = html;
  const events = data.events.filter(e => e.date === dateKey(selectedDate)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  $('#dayEvents').innerHTML = events.length ? events.map(e => `<div class="event-line"><div class="event-date">${e.time || 'DIA'}</div><div style="flex:1"><strong>${escapeHTML(e.title)}</strong></div><button class="delete-item" data-delete-event="${e.id}" title="Excluir evento">×</button></div>`).join('') : '<div class="empty-day">Nenhum compromisso nesta data.</div>';
}
function renderAll() { renderStats(); renderHunter(); renderTasks(); renderMini(); renderCalendar(); }

const TITLES = { inicio: 'Visão geral', cacador: 'Status', tarefas: 'Missões', calendario: 'Calendário' };
function setView(name) {
  view = name; $$('.page').forEach(p => p.classList.add('hidden')); $('#view-' + name).classList.remove('hidden');
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $('#crumb').textContent = TITLES[name];
  window.scrollTo(0, 0);
}

/* ---------- Modais ---------- */
function openModal(type) {
  modalType = type; $('#modal').classList.remove('hidden'); $('#itemForm').reset();
  $('#taskFields').classList.toggle('hidden', type !== 'task'); $('#eventFields').classList.toggle('hidden', type !== 'event');
  $('#modalEyebrow').textContent = type === 'task' ? 'QUADRO DE MISSÕES' : 'PLANEJE SEU DIA';
  $('#modalTitle').textContent = type === 'task' ? 'Nova missão' : 'Novo evento';
  $('#itemName').placeholder = type === 'task' ? 'Ex.: Estudar matemática' : 'Ex.: Consulta, reunião...';
  if (type === 'event') $('#itemDate').value = dateKey(selectedDate);
  setTimeout(() => $('#itemName').focus(), 50);
}
function closeModal() { $('#modal').classList.add('hidden'); }
$('#itemForm').addEventListener('submit', e => {
  e.preventDefault(); const title = $('#itemName').value.trim(); if (!title) return;
  if (modalType === 'task') data.tasks.push({ id: crypto.randomUUID(), title, priority: $('#itemPriority').value, attr: $('#itemAttr').value, done: false });
  else { const date = $('#itemDate').value; if (!date) { showToast('Escolha uma data para o evento.'); return; } data.events.push({ id: crypto.randomUUID(), title, date, time: $('#itemTime').value }); selectedDate = parseDate(date); cursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1); }
  closeModal(); save(); showToast(modalType === 'task' ? '[ SISTEMA ] Nova missão registrada.' : 'Evento adicionado.');
});
$('#closeModal').onclick = closeModal; $('#cancelModal').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
$('#ruClose').onclick = () => $('#rankModal').classList.add('hidden');
$('#rankModal').addEventListener('click', e => { if (e.target.id === 'rankModal') $('#rankModal').classList.add('hidden'); });

function setName(raw) {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2) { showToast('O nome precisa ter ao menos 2 letras.'); return false; }
  data.hunter.name = name.slice(0, 20); save(); return true;
}
$('#welcomeForm').addEventListener('submit', e => {
  e.preventDefault();
  if (setName($('#welcomeName').value)) {
    $('#nameModal').classList.add('hidden');
    showToast(`[ SISTEMA ] Bem-vindo, ${hunterName()}. Rank E atribuído.`);
  }
});
$('#nameForm').addEventListener('submit', e => {
  e.preventDefault();
  if (setName($('#hunterNameInput').value)) showToast(`[ SISTEMA ] Nome atualizado: ${hunterName()}.`);
});
if (!data.hunter.name) { $('#nameModal').classList.remove('hidden'); setTimeout(() => $('#welcomeName').focus(), 50); }

/* ---------- Eventos gerais ---------- */
$('#addTask').onclick = $('#quickAdd').onclick = () => openModal('task');
$('#addEvent').onclick = () => openModal('event');
$$('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
$$('[data-go]').forEach(b => b.onclick = () => setView(b.dataset.go));
$$('.filter').forEach(b => b.onclick = () => { filter = b.dataset.filter; $$('.filter').forEach(x => x.classList.toggle('active', x === b)); renderTasks(); });
document.addEventListener('change', e => { if (e.target.matches('[data-task]')) toggleTask(e.target.dataset.task, e.target.checked); });
document.addEventListener('click', e => {
  const delTask = e.target.closest('[data-delete-task]'); if (delTask) { data.tasks = data.tasks.filter(t => t.id !== delTask.dataset.deleteTask); save(); showToast('Missão excluída.'); }
  const delEvent = e.target.closest('[data-delete-event]'); if (delEvent) { data.events = data.events.filter(x => x.id !== delEvent.dataset.deleteEvent); save(); showToast('Evento excluído.'); }
  const mini = e.target.closest('[data-mini-date]'); if (mini) { selectedDate = parseDate(mini.dataset.miniDate); cursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1); setView('calendario'); renderAll(); }
  const day = e.target.closest('[data-calendar-date]'); if (day) { selectedDate = parseDate(day.dataset.calendarDate); renderCalendar(); }
});
$('#prevMonth').onclick = () => { cursor.setMonth(cursor.getMonth() - 1); renderCalendar(); };
$('#nextMonth').onclick = () => { cursor.setMonth(cursor.getMonth() + 1); renderCalendar(); };
$('#goToday').onclick = () => { selectedDate = new Date(); selectedDate.setHours(0, 0, 0, 0); cursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1); renderCalendar(); };
$('#themeToggle').onclick = () => { document.body.classList.toggle('dark'); localStorage.setItem('orbit-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); };
/* ---------- Backup: exportar / importar / reiniciar ---------- */
const freshHunter = () => ({ name: '', xp: 0, stats: { for: 0, agi: 0, int: 0, vit: 0, sen: 0 }, daily: { date: '', claimed: false } });
$('#exportBtn').onclick = async () => {
  const text = JSON.stringify({ app: 'sistema', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
  const filename = `sistema-${hunterName().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}-${dateKey(new Date())}.json`;
  const cap = window.Capacitor;
  // Dentro do app Android: salva o arquivo e abre a janela de compartilhar (Drive, WhatsApp, e-mail...).
  if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
    try {
      const { Filesystem, Share } = cap.Plugins;
      const saved = await Filesystem.writeFile({ path: filename, data: text, directory: 'CACHE', encoding: 'utf8' });
      await Share.share({ title: 'Backup do SISTEMA', text: 'Backup do SISTEMA — guarde este arquivo.', url: saved.uri, dialogTitle: 'Salvar backup' });
      showToast('[ SISTEMA ] Backup pronto para guardar.');
    } catch (err) {
      if (!/cancel/i.test(String(err && err.message))) showToast('Não foi possível exportar o backup.');
    }
    return;
  }
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('[ SISTEMA ] Backup exportado.');
};
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').addEventListener('change', e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = JSON.parse(reader.result), d = raw.data || raw;
      if (!Array.isArray(d.tasks) || !Array.isArray(d.events) || !d.hunter || typeof d.hunter.xp !== 'number') throw new Error('formato');
      const h = d.hunter;
      const clean = {
        tasks: d.tasks.filter(t => t && typeof t.title === 'string').map(t => ({ id: String(t.id || crypto.randomUUID()), title: String(t.title).slice(0, 90), priority: XP[t.priority] ? t.priority : 'normal', attr: ATTRS[t.attr] ? t.attr : 'int', done: !!t.done, doneAt: t.doneAt || null })),
        events: d.events.filter(x => x && typeof x.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date)).map(x => ({ id: String(x.id || crypto.randomUUID()), title: String(x.title).slice(0, 90), date: x.date, time: x.time || '' })),
        hunter: { name: String(h.name || '').slice(0, 20), xp: Math.max(0, Math.floor(h.xp)), stats: { ...freshHunter().stats, ...(h.stats || {}) }, daily: h.daily && typeof h.daily === 'object' ? { date: h.daily.date || '', claimed: !!h.daily.claimed } : { date: '', claimed: false } }
      };
      if (!confirm(`Importar o progresso de "${clean.hunter.name || 'Caçador'}" (${clean.hunter.xp} XP, ${clean.tasks.length} missões)?\nIsso substitui o progresso atual deste aparelho.`)) return;
      data = clean; save();
      if (!data.hunter.name) $('#nameModal').classList.remove('hidden');
      showToast('[ SISTEMA ] Progresso importado.');
    } catch { showToast('Arquivo inválido. Use um backup exportado pelo Sistema.'); }
  };
  reader.readAsText(file);
});
$('#resetBtn').onclick = () => {
  if (!confirm('Reiniciar o caçador? Todo o XP, missões e eventos serão apagados deste aparelho.\n\nDica: exporte um backup antes.')) return;
  data = { tasks: [], events: [], hunter: freshHunter() }; save();
  $('#welcomeName').value = ''; $('#nameModal').classList.remove('hidden'); setTimeout(() => $('#welcomeName').focus(), 50);
  setView('inicio');
};

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

if (localStorage.getItem('orbit-theme') !== 'light') document.body.classList.add('dark');
$('#todayLabel').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');
renderAll();
