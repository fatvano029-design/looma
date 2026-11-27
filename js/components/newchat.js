/* ================= components/newchat.js — Group & Channel Creator (With Avatar & Description) ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};
App.components.newchat = (() => {
const { $, esc, icon, initials } = App.utils;
let createType = 'group';
let picked = [];
let groupAva = null;
function isEn() { return localStorage.getItem('looma_lang') === 'en'; }
function open() {
createType = 'group';
picked = [];
groupAva = null;
const en = isEn();
const back = $('modalback');
back.classList.add('open');
back.innerHTML =
'' +
'' +
'' +
'' + (en ? 'Create Group or Channel' : 'Создать группу или канал') + '' +
'' + icon('close') + '' +
'' +
'' +
'' + (en ? 'Group' : 'Группа') + '' +
'' + (en ? 'Channel' : 'Канал') + '' +
'' +
'' +
'' +
'' +
'' + icon('image') + '' +
'' +
'' +
'' +
'' +
'' +
'' +
'' + (en ? 'You can create alone or add people' : 'Можно создать одному или выбрать участников') + '' +
'' +
'' + (en ? 'Optional' : 'Можно создать одному') + '' +
'' + (en ? 'Create group' : 'Создать группу') + '' +
'' +
'';
$('ncCloseBtn').onclick = close;
$('ncAvaPick').onclick = () => $('ncAvaFile').click();
$('ncAvaFile').onchange = e => {
const f = e.target.files && e.target.files;
if (!f) return;
const r = new FileReader();
r.onload = () => {
groupAva = r.result;
$('ncAvaPick').innerHTML = '';
};
r.readAsDataURL(f);
};
back.querySelectorAll('.nc-type-btn').forEach(btn => {
btn.addEventListener('click', () => {
createType = btn.dataset.t;
back.querySelectorAll('.nc-type-btn').forEach(b => {
const active = b.dataset.t === createType;
b.style.background = active ? 'var(--accent,#7c4dff)' : 'transparent';
b.style.color = active ? '#fff' : 'var(--grey)';
});
$('ncName').placeholder = createType === 'channel'
? (en ? 'Channel name' : 'Название канала')
: (en ? 'Group name' : 'Название группы');
$('ncCreate').textContent = createType === 'channel'
? (en ? 'Create channel' : 'Создать канал')
: (en ? 'Create group' : 'Создать группу');
$('ncName').focus();
});
});
$('ncSearch').addEventListener('input', e => search(e.target.value.trim()));
$('ncCreate').addEventListener('click', createMulti);
back.onclick = ev => { if (ev.target === back) close(); };
setTimeout(() => $('ncName').focus(), 50);
}
function close() {
const back = $('modalback');
back.classList.remove('open');
back.innerHTML = '';
}
let searchTimer = null;
function search(q) {
clearTimeout(searchTimer);
if (!q) { renderResults([]); return; }
searchTimer = setTimeout(async () => {
try {
const d = await App.api.userSearch(q);
renderResults(d.users || []);
} catch (e) {}
}, 220);
}
function renderResults(users) {
const list = $('ncResults');
const en = isEn();
if (!list) return;
if (!users.length) {
list.innerHTML = '' + (en ? 'No users found' : 'Пользователи не найдены') + '';
return;
}
list.innerHTML = '';
users.forEach(u => {
const row = App.utils.el(
'' +
'' + initials(u.name) + '' +
'' + esc(u.name) + '' +
'@' + esc(u.username) + '' +
'' + icon('check', 'sm') + '' +
'');
row.addEventListener('click', () => {
const i = picked.indexOf(u.username);
if (i >= 0) picked.splice(i, 1); else picked.push(u.username);
$('ncCount').textContent = en ? (picked.length + ' selected') : ('Выбрано: ' + picked.length);
renderResults(users);
});
list.appendChild(row);
});
}
async function createMulti() {
const en = isEn();
const name = $('ncName').value.trim();
const bio = $('ncBio').value.trim();
const isChan = createType === 'channel';
if (!name) {
App.utils.toast(isChan ? (en ? 'Enter channel name' : 'Введите название канала') : (en ? 'Enter group name' : 'Введите название группы'));
return;
}
try {
const d = await App.api.createChat({ type: createType, name, bio, avatar: groupAva, memberUsernames: picked });
await App.store.loadChats();
App.components.chatlist.render(App.store.state.filter);
close();
App.components.chatview.open(d.chat.id);
App.utils.toast(isChan ? (en ? 'Channel created' : 'Канал создан') : (en ? 'Group created' : 'Группа создана'));
} catch (e) {
App.utils.toast(e.message);
}
}
return { open, close };
})();
```
