/* ================= components/chatlist.js — Looma Left Panel (Global User Search + Avatars + Delete Chat) ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};
App.components.chatlist = (() => {
const { $, esc, icon, initials } = App.utils;
let foundPeople = [];
let searchTimer = null;
function isEn() { return localStorage.getItem('looma_lang') === 'en'; }
function avaHtml(item, cls) {
if (item && item.avatar) {
return '' + initials(item.name || 'U') + '';
}
return '' + esc(item.initials || initials(item.name || 'U')) + '';
}
function snippetHtml(chat, lm) {
if (!lm) return '' + esc(chat.subtitle || '') + '';
let s = esc(lm.kind === 'text' ? lm.text : kindLabel(lm));
if ((lm.from === (App.me && App.me.username) || lm.out) && chat.type !== 'channel')
s = '✓✓ ' + s;
if (chat.type === 'group' && lm.from !== (App.me && App.me.username) && lm.sender)
s = '' + esc(lm.sender.split(' ')) + ': ' + s;
if (chat.type === 'channel') s = 'Канал · ' + s;
return '' + s + '';
}
function kindLabel(m) {
return { image: '📷 Фото', video: '🎬 Видео', file: '📎 ' + (m.fileName || 'Файл'),
voice: '🎤 Голосовое сообщение', sticker: m.text || 'Стикер' }[m.kind] || '';
}
function rowHtml(chat) {
const lm = App.store.lastMessage(chat);
const active = App.store.state.activeId === chat.id ? ' active' : '';
const muted = chat.muted ? ' muted' : '';
const badge = chat.unread
? '' + chat.unread + '' : '';
const pin = chat.pinned ? '' + icon('pin', 'sm') + '' : '';
return (
'' +
avaHtml(chat, 'a50') +
'' +
'' + esc(chat.name) + '' +
'' + (lm ? esc(lm.time || '') : '') + '' +
'' +
snippetHtml(chat, lm) +
'' + pin + badge +
(chat.muted && !chat.unread ? '' + icon('mute', 'sm') + '' : '') +
'' +
'' +
''
);
}
function rowMenu(e, chat) {
e.preventDefault();
App.components.chatview.closeMenu();
const en = isEn();
const isSaved = chat.id.startsWith('c_saved_');
const menu = App.utils.el(
'' +
'' + icon('pin') + (chat.pinned ? (en ? 'Unpin' : 'Открепить') : (en ? 'Pin to top' : 'Закрепить')) + '' +
'' + icon('mute') + (chat.muted ? (en ? 'Unmute' : 'Включить звук') : (en ? 'Mute' : 'Без звука')) + '' +
'' + icon('check-double') + (en ? 'Mark as read' : 'Прочитано') + '' +
(!isSaved ? '' + icon('close') + (en ? 'Delete chat' : 'Удалить чат') + '' : '') +
'');
menu.style.left = Math.min(e.clientX, window.innerWidth - 210) + 'px';
menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
$('overlay').appendChild(menu);
menu.addEventListener('click', async ev => {
const a = ev.target.closest('button') && ev.target.closest('button').dataset.a;
App.components.chatview.closeMenu();
const done = () => render(App.store.state.filter);
if (a === 'pin') App.store.togglePin(chat.id).then(done);
else if (a === 'mute') App.store.toggleMute(chat.id).then(done);
else if (a === 'read') App.store.clearUnread(chat.id).then(done);
else if (a === 'delete') {
if (!confirm(en ? 'Delete this chat?' : 'Удалить этот чат?')) return;
await App.api.deleteChat(chat.id);
await App.store.loadChats();
if (App.store.state.activeId === chat.id) {
App.store.setActive(null);
$('chatpane').classList.remove('open');
}
done();
App.utils.toast(en ? 'Chat deleted' : 'Чат удалён');
}
});
}
function render(filter) {
App.store.state.filter = filter == null ? App.store.state.filter : filter;
const q = App.store.state.filter.trim().toLowerCase();
const list = $('chatlist');
const en = isEn();
if (!list) return;
list.innerHTML = '';
const chats = App.store.sortedChats().filter(c =>
!q || c.name.toLowerCase().includes(q) ||
App.store.getMessages(c.id).some(m => (m.text || '').toLowerCase().includes(q)));
if (chats.length) {
const pinned = chats.filter(c => c.pinned), rest = chats.filter(c => !c.pinned);
if (pinned.length) {
list.appendChild(App.utils.el('' + (en ? 'Pinned' : 'Закреплённые') + ''));
pinned.forEach(c => list.appendChild(mountRow(c)));
}
rest.forEach(c => list.appendChild(mountRow(c)));
}
// Глобальный поиск пользователей по @username и номеру телефона прямо из верхней строки
if (q && foundPeople.length) {
list.appendChild(App.utils.el('' + (en ? 'People in Looma' : 'Люди в Looma') + ''));
foundPeople.forEach(u => {
const uRow = App.utils.el(
'' +
avaHtml(u, 'a50') +
'' + esc(u.name) + '' +
'@' + esc(u.username) + '' +
''
);
uRow.addEventListener('click', async () => {
try {
const d = await App.api.createChat({ type: 'dm', username: u.username });
$('search').value = '';
foundPeople = [];
await App.store.loadChats();
render('');
App.components.chatview.open(d.chat.id);
} catch (err) {
App.utils.toast(err.message);
}
});
list.appendChild(uRow);
});
}
if (!chats.length && (!q || !foundPeople.length)) {
list.innerHTML = '' + (en ? 'Nothing found' : 'Ничего не найдено') + '';
}
}
function mountRow(chat) {
const row = App.utils.el(rowHtml(chat));
row.addEventListener('click', () => App.components.chatview.open(chat.id));
row.addEventListener('contextmenu', e => rowMenu(e, chat));
return row;
}
function bindSearch() {
$('search').addEventListener('input', e => {
const val = e.target.value;
render(val);
clearTimeout(searchTimer);
const q = val.trim();
if (!q) {
foundPeople = [];
return;
}
searchTimer = setTimeout(async () => {
try {
const d = await App.api.userSearch(q);
foundPeople = d.users || [];
render($('search').value);
} catch (err) {}
}, 220);
});
}
return { render, bindSearch };
})();
