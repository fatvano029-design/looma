/* ================= components/chatview.js — Looma Conversation Pane ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};
App.components.chatview = (() => {
const { $, esc, icon, avatar } = App.utils;
let searchState = null;
let pollTimer = null;
let pollCount = 0;
function pane() { return $('chatpane'); }
function isEn() { return localStorage.getItem('looma_lang') === 'en'; }
function stopPoll() {
if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
async function open(id) {
const chat = App.store.getChat(id);
if (!chat) return;
const en = isEn();
stopPoll();
App.store.setActive(id);
if (App.components.infopanel && App.components.infopanel.close) App.components.infopanel.close();
if (App.components.settings && App.components.settings.close) App.components.settings.close();
searchState = null;
pollCount = 0;
const avaHtml = chat.avatar
? '' + App.utils.initials(chat.name) + ''
: '' + App.utils.initials(chat.name) + '';
const isSaved = chat.id.startsWith('c_saved_');
pane().innerHTML =
'' +
'' + icon('back') + '' +
avaHtml +
'' + esc(chat.name) + '' +
'' + esc(chat.status || chat.subtitle || '') + '' +
'' + icon('search') + '' +
'' + icon('more') + '' +
'' +
'' +
'' +
'' + icon('close') + '' +
'' + (en ? 'Loading…' : 'Загрузка…') + '' +
'' +
'' +
'' + icon('close') + '' +
'';
pane().classList.add('open');
$('mobileBackBtn').addEventListener('click', () => {
stopPoll();
App.store.setActive(null);
pane().classList.remove('open');
});
document.querySelectorAll('[data-info]').forEach(el =>
el.addEventListener('click', () => App.components.infopanel.open(chat.id)));
$('hSearch').addEventListener('click', toggleSearch);
$('csClose').addEventListener('click', toggleSearch);
$('csInput').addEventListener('input', e => runSearch(chat, e.target.value));
$('csInput').addEventListener('keydown', e => { if (e.key === 'Enter') nextMatch(1); });
$('hMore').addEventListener('click', e => headerMenu(e, chat, isSaved));
$('rsClose').addEventListener('click', () => App.components.inputbar.clearReply());
try {
await App.store.loadMessages(chat.id);
} catch (e) {
$('msgsInner').innerHTML = '' + (en ? 'Could not load messages' : 'Не удалось загрузить сообщения') + '';
}
renderMessages(chat);
App.components.inputbar.mount($('inputbar'), chat);
App.store.clearUnread(chat.id);
chat.unread = 0;
App.components.chatlist.render(App.store.state.filter);
startPoll(chat);
}
function startPoll(chat) {
stopPoll();
let lastTs = 0;
for (const m of App.store.getMessages(chat.id))
if (m.ts > lastTs) lastTs = m.ts;
const tick = async () => {
if (App.store.state.activeId !== chat.id) { stopPoll(); return; }
try {
const d = await App.api.messages(chat.id, lastTs);
const fresh = App.store.mergeMessages(chat.id, d.messages);
for (const m of fresh) {
appendMessage(chat, m);
if (m.ts > lastTs) lastTs = m.ts;
}
if (fresh.length) {
App.store.clearUnread(chat.id);
chat.unread = 0;
App.components.chatlist.render(App.store.state.filter);
}
const ty = await App.api.getTyping(chat.id);
renderTyping(chat, (ty && ty.typing) || []);
pollCount++;
if (pollCount % 3 === 0) {
try {
const keepFilter = App.store.state.filter;
await App.store.loadChats();
const updatedChat = App.store.getChat(chat.id);
if (updatedChat) Object.assign(chat, updatedChat);
const ae = document.activeElement;
if (!ae || ae.id !== 'search') App.components.chatlist.render(keepFilter);
} catch (e) {}
}
} catch (e) {}
};
pollTimer = setInterval(tick, 1800);
tick();
}
function renderTyping(chat, typing) {
const s = $('cstatus');
const en = isEn();
if (!s || App.store.state.activeId !== chat.id) return;
if (typing.length) {
const names = typing.map(t => (t.name || '').split(' '));
s.textContent = en ? (names + ' is typing...') : (names + ' печатает...');
s.classList.add('typing');
} else {
s.textContent = chat.status || chat.subtitle || '';
s.classList.remove('typing');
}
}
function headerMenu(e, chat, isSaved) {
e.stopPropagation();
closeMenu();
const en = isEn();
const menu = App.utils.el(
'' +
'' + icon('search') + (en ? 'Info & Settings' : 'Инфо и управление') + '' +
'' + icon('mute') + (chat.muted ? (en ? 'Unmute' : 'Включить звук') : (en ? 'Mute' : 'Без звука')) + '' +
(!isSaved ? '' + icon('close') + (en ? 'Delete chat' : 'Удалить чат') + '' : '') +
'');
const r = e.currentTarget.getBoundingClientRect();
menu.style.top = (r.bottom + 6) + 'px';
menu.style.right = (window.innerWidth - r.right) + 'px';
$('overlay').appendChild(menu);
menu.addEventListener('click', async ev => {
const a = ev.target.closest('button') && ev.target.closest('button').dataset.a;
closeMenu();
if (a === 'info') App.components.infopanel.open(chat.id);
if (a === 'mute') {
App.store.toggleMute(chat.id).then(() => {
open(chat.id);
App.components.chatlist.render(App.store.state.filter);
});
}
if (a === 'delchat') {
if (!confirm(en ? 'Delete this chat?' : 'Удалить этот чат?')) return;
await App.api.deleteChat(chat.id);
await App.store.loadChats();
stopPoll();
App.store.setActive(null);
pane().classList.remove('open');
App.components.chatlist.render(App.store.state.filter);
App.utils.toast(en ? 'Chat deleted' : 'Чат удалён');
}
});
}
function renderMessages(chat) {
const inner = $('msgsInner');
const en = isEn();
if (!inner) return;
inner.innerHTML = '' + (en ? 'Today' : 'Сегодня') + '';
for (const m of App.store.getMessages(chat.id)) {
const b = App.components.bubbles.render(chat, m);
wireBubble(b, chat, m);
inner.appendChild(b);
}
scrollBottom();
}
function appendMessage(chat, m) {
const inner = $('msgsInner');
if (!inner || App.store.state.activeId !== chat.id) return;
const mid = m.mid || m.id;
if (mid && inner.querySelector('.msg[data-mid="' + mid + '"]')) return;
const b = App.components.bubbles.render(chat, m);
wireBubble(b, chat, m);
inner.appendChild(b);
App.components.bubbles.animateTicks(b);
scrollBottom();
}
function wireBubble(bubbleEl, chat, m) {
bubbleEl.addEventListener('contextmenu', e => {
e.preventDefault();
msgMenu(e, chat, m);
});
}
function openDeleteChoice(chat, m, canDeleteForAll) {
const en = isEn();
const back = $('modalback');
back.classList.add('open');
back.innerHTML =
'' +
'' + (en ? 'Delete message?' : 'Удалить сообщение?') + '' +
'' + (en ? 'Choose how to delete this message' : 'Выберите способ удаления сообщения') + '' +
'' +
(canDeleteForAll
? '' + (en ? 'Delete for everyone' : 'Удалить у всех') + ''
: '') +
'' + (en ? 'Delete for me' : 'Удалить у себя') + '' +
'' + (en ? 'Cancel' : 'Отмена') + '' +
'' +
'';
const closeDel = () => { back.classList.remove('open'); back.innerHTML = ''; };
const mid = m.mid || m.id;
$('delCancelBtn').onclick = closeDel;
back.onclick = ev => { if (ev.target === back) closeDel(); };
$('delForMeBtn').onclick = async () => {
closeDel();
await App.api.deleteMessage(mid, { forMeOnly: true });
await App.store.loadMessages(chat.id);
renderMessages(chat);
App.components.chatlist.render(App.store.state.filter);
};
if ($('delForAllBtn')) {
$('delForAllBtn').onclick = async () => {
closeDel();
await App.api.deleteMessage(mid, { forMeOnly: false });
await App.store.loadMessages(chat.id);
renderMessages(chat);
App.components.chatlist.render(App.store.state.filter);
};
}
}
function msgMenu(e, chat, m) {
closeMenu();
const en = isEn();
const canCopy = m.kind === 'text' && m.text;
const own = (m.from === (App.me && App.me.username)) || !!m.out;
const isChanAdmin = chat.type === 'channel' && !!chat.canPost;
const canDeleteForAll = own || isChanAdmin;
const menu = App.utils.el(
'' +
'' + icon('back') + (en ? 'Reply' : 'Ответить') + '' +
'' + icon('send') + (en ? 'Forward' : 'Переслать') + '' +
(canCopy ? '' + icon('check') + (en ? 'Copy text' : 'Копировать') + '' : '') +
'' + icon('close') + (en ? 'Delete' : 'Удалить') + '' +
'');
menu.style.left = Math.min(e.clientX, window.innerWidth - 210) + 'px';
menu.style.top = Math.min(e.clientY, window.innerHeight - 220) + 'px';
$('overlay').appendChild(menu);
menu.addEventListener('click', ev => {
const btn = ev.target.closest('button');
closeMenu();
if (!btn) return;
const a = btn.dataset.a;
if (a === 'reply') {
const sender = own ? (en ? 'You' : 'Вы') : (m.sender || chat.name);
App.components.inputbar.setReply({ mid: m.mid || m.id, sender, text: m.text || kindText(m) });
}
if (a === 'forward') openForwardPicker(m);
if (a === 'copy') {
try { navigator.clipboard.writeText(m.text); App.utils.toast(en ? 'Copied' : 'Скопировано'); }
catch (err) {}
}
if (a === 'delete') {
openDeleteChoice(chat, m, canDeleteForAll);
}
});
}
function kindText(m) {
return { image: '📷 Фото', video: '🎬 Видео', file: '📎 ' + (m.fileName || 'Файл'),
voice: '🎤 Голосовое сообщение', sticker: m.text || 'Стикер' }[m.kind] || '';
}
function openForwardPicker(m) {
const back = $('modalback');
const en = isEn();
back.classList.add('open');
back.innerHTML =
'' + (en ? 'Forward to…' : 'Переслать…') + '' +
App.store.sortedChats().map(c =>
'' + avatar(c, 'a44') +
'' + esc(c.name) + '').join('') +
'';
back.querySelectorAll('.frow').forEach(row =>
row.addEventListener('click', async () => {
const to = App.store.getChat(row.dataset.id);
const payload = {
kind: m.kind, text: m.text || '',
forwardedFrom: (m.from === (App.me && App.me.username)) ? (App.me.name || 'Вы') : (m.sender || 'Пользователь')
};
if (m.data) payload.data = m.data;
if (m.fileName) payload.fileName = m.fileName;
if (m.fileSize != null) payload.fileSize = m.fileSize;
if (m.duration != null) payload.duration = m.duration;
try {
const saved = await App.store.sendMessage(to.id, payload);
App.utils.toast((en ? 'Forwarded to ' : 'Переслано в ') + to.name);
if (App.store.state.activeId === to.id) appendMessage(to, saved);
App.components.chatlist.render(App.store.state.filter);
} catch (err) {
App.utils.toast(err.message);
}
back.classList.remove('open');
}));
back.onclick = ev => { if (ev.target === back) back.classList.remove('open'); };
}
function showTyping(on, realStatus) {
const s = $('cstatus');
if (!s) return;
if (on) { s.textContent = isEn() ? 'typing...' : 'печатает...'; s.classList.add('typing'); }
else { s.textContent = realStatus || ''; s.classList.remove('typing'); }
}
function toggleSearch() {
const bar = $('chatsearch');
if (!bar) return;
bar.classList.toggle('open');
if (bar.classList.contains('open')) $('csInput').focus();
else { searchState = null; clearHighlights(); }
}
function clearHighlights() {
App.utils.$$('.msg.hl').forEach(x => x.classList.remove('hl'));
const c = $('csCount');
if (c) c.textContent = '';
}
function runSearch(chat, q) {
clearHighlights();
q = q.trim().toLowerCase();
if (!q) { searchState = null; return; }
const matches = [];
App.utils.$$('#msgsInner .msg').forEach(el => {
const m = App.store.findMessage(chat.id, el.dataset.mid);
if (m && (m.text || '').toLowerCase().includes(q)) matches.push(el.dataset.mid);
});
searchState = { matches, idx: -1 };
$('csCount').textContent = matches.length ? '0 / ' + matches.length : (isEn() ? 'no results' : 'нет совпадений');
if (matches.length) nextMatch(1);
}
function nextMatch(dir) {
if (!searchState || !searchState.matches.length) return;
searchState.idx = (searchState.idx + dir + searchState.matches.length) % searchState.matches.length;
App.utils.$$('.msg.hl').forEach(x => x.classList.remove('hl'));
const mid = searchState.matches[searchState.idx];
const el = document.querySelector('#msgsInner .msg[data-mid="' + mid + '"]');
if (el) {
el.classList.add('hl');
el.scrollIntoView({ block: 'center', behavior: 'smooth' });
$('csCount').textContent = (searchState.idx + 1) + ' / ' + searchState.matches.length;
}
}
function scrollBottom() {
const box = $('messages');
if (box) box.scrollTop = box.scrollHeight;
}
function closeMenu() {
App.utils.$$('.ctxmenu').forEach(x => x.remove());
}
document.addEventListener('click', e => {
if (!e.target.closest('.ctxmenu')) closeMenu();
});
return {
open, renderMessages, appendMessage, showTyping,
closeMenu, scrollBottom, toggleSearch, stopPoll
};
})();
