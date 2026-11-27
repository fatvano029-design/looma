/* ================= js/api.js — Looma Full Backend (Chunked Media + Proper msg.from/mid) ================= */
'use strict';
window.App = window.App || {};

App.api = (() => {
  const PB_URL = 'https://' + '45.15.126.220.sslip.io';
  const COL_URL = PB_URL + '/api/collections/looma_kv/records';
  const KEY = 'tg_token';
  let token = null;
  try { token = localStorage.getItem(KEY); } catch (e) {}

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const pad = n => String(n).padStart(2, '0');
  const COLORS = ['#7c4dff', '#00e5ff', '#00e676', '#ff5252', '#ffd740', '#e040fb', '#448aff'];
  const getColor = s => COLORS[Math.abs(String(s).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];

  function normPhone(p) {
    const digits = String(p || '').split('').filter(ch => ch >= '0' && ch <= '9').join('');
    if (!digits) return '';
    if (digits.length === 10 && digits.startsWith('9')) return '+7' + digits;
    if (digits.length === 11 && digits.startsWith('8')) return '+7' + digits.slice(1);
    return '+' + digits;
  }

  function cleanUsername(u) {
    let s = String(u || '').trim().toLowerCase();
    while (s.startsWith('@')) s = s.slice(1);
    return s;
  }

  function enrichUser(u) {
    if (!u) return u;
    const displayName = u.name || u.fullName || u.username || 'Пользователь';
    const uname = cleanUsername(u.username || 'user');
    return Object.assign({}, u, {
      name: displayName,
      fullName: displayName,
      displayName: displayName,
      username: uname,
      handle: '@' + uname,
      initials: displayName.slice(0, 2).toUpperCase(),
      color: u.color || getColor(uname)
    });
  }

  function normMsg(m, myId, myUsername) {
    if (!m) return m;
    if (m.ts != null && !m.time) {
      const d = new Date(m.ts);
      m.time = pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    m.mid = m.mid || m.id;
    m.id = m.id || m.mid;
    if (!m.from) {
      m.from = (m.senderId === myId && myUsername) ? myUsername : (m.senderUsername || m.senderId || '');
    }
    m.sender = m.sender || m.senderName || m.from;
    m.out = (m.senderId === myId) || (myUsername && m.from === myUsername);
    return m;
  }

  function normChat(c) {
    if (c && c.lastMessage) normMsg(c.lastMessage, token, App.me && App.me.username);
    return c;
  }

  function setToken(t) {
    token = t || null;
    try {
      if (token) localStorage.setItem(KEY, token);
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  let _cache = null, _cacheTs = 0, _inFlight = null;

  async function pullAll(force) {
    if (!force && _cache && Date.now() - _cacheTs < 500) return _cache;
    if (_inFlight) return _inFlight;
    _inFlight = (async () => {
      try {
        const res = await fetch(COL_URL + '?perPage=500&_t=' + Date.now());
        if (!res.ok) throw new Error('Сервер отвечает кодом: ' + res.status);
        const json = await res.json();
        const rawItems = json.items || [];
        const chunksMap = {};
        rawItems.forEach(item => {
          if (item.k && item.k.startsWith('chunk__')) {
            const parts = item.k.split('__');
            const baseKey = parts.slice(1, -1).join('__');
            const idx = Number(parts.at(-1));
            chunksMap[baseKey] = chunksMap[baseKey] || [];
            chunksMap[baseKey][idx] = item.v || '';
          }
        });

        const map = {};
        rawItems.forEach(item => {
          if (!item.k || item.k.startsWith('chunk__')) return;
          if (item.v) {
            try {
              const parsed = JSON.parse(item.v);
              if (parsed && parsed._chunked && chunksMap[item.k]) {
                parsed.data = chunksMap[item.k].join('');
                delete parsed._chunked;
              }
              map[item.k] = { recId: item.id, data: parsed };
            } catch (e) {}
          }
        });
        _cache = map;
        _cacheTs = Date.now();
        return map;
      } finally {
        _inFlight = null;
      }
    })();
    return _inFlight;
  }

  async function putDoc(docKey, obj) {
    if (!_cache) _cache = {};
    const copy = Object.assign({}, obj);

    // Если файл/фото/голосовое больше 4200 символов — режем на безопасные чанки для обхода лимита PocketBase 400
    if (copy.data && typeof copy.data === 'string' && copy.data.length > 4200) {
      const fullData = copy.data;
      const step = 4200;
      const total = Math.ceil(fullData.length / step);
      for (let i = 0; i < total; i++) {
        const partStr = fullData.slice(i * step, (i + 1) * step);
        const cRes = await fetch(COL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ k: 'chunk__' + docKey + '__' + i, v: partStr })
        });
        if (!cRes.ok) throw new Error('Ошибка загрузки части файла: ' + cRes.status);
      }
      copy.data = '';
      copy._chunked = total;
    }

    const existing = _cache[docKey];
    const payload = JSON.stringify({ k: docKey, v: JSON.stringify(copy) });
    if (existing && existing.recId) {
      const res = await fetch(COL_URL + '/' + existing.recId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      if (!res.ok) throw new Error('Ошибка обновления: ' + res.status);
      const saved = await res.json();
      _cache[docKey] = { recId: saved.id, data: obj };
    } else {
      const res = await fetch(COL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      if (!res.ok) throw new Error('Ошибка сохранения: ' + res.status);
      const saved = await res.json();
      _cache[docKey] = { recId: saved.id, data: obj };
    }
    return obj;
  }

  async function delDoc(docKey) {
    const map = await pullAll(true);
    const existing = map[docKey];
    if (existing && existing.recId) {
      await fetch(COL_URL + '/' + existing.recId, { method: 'DELETE' }).catch(() => {});
      delete map[docKey];
    }
  }

  async function getUsers() {
    const map = await pullAll(false);
    return Object.entries(map).filter(([k]) => k.startsWith('user__')).map(([, v]) => enrichUser(v.data));
  }

  async function getChats() {
    const map = await pullAll(false);
    return Object.entries(map).filter(([k]) => k.startsWith('chat__')).map(([, v]) => v.data);
  }

  async function getChatMsgs(chatId, myId, myUsername) {
    const map = await pullAll(false);
    return Object.entries(map)
      .filter(([k]) => k.startsWith('msg__' + chatId + '__'))
      .map(([, v]) => normMsg(Object.assign({}, v.data), myId, myUsername))
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }

  function requireMe(users) {
    const me = users.find(u => u.id === token);
    if (!me) {
      setToken(null);
      if (App.auth) App.auth.show('Войдите в аккаунт Looma');
      throw new Error('Unauthorized');
    }
    return enrichUser(me);
  }

  function formatChatForUser(chat, me, users, msgs) {
    const meId = me.id;
    const uState = (chat.userState && chat.userState[meId]) || {};
    const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
    const lastRead = uState.lastRead || 0;
    const unreadCount = msgs.filter(m => m.senderId !== meId && (m.ts || 0) > lastRead).length;
    const isSaved = chat.id.startsWith('c_saved_');

    let title = isSaved ? 'Избранное' : (chat.name || chat.title || 'Чат');
    let initials = isSaved ? '★' : title.slice(0, 2).toUpperCase();
    let color = isSaved ? '#448aff' : getColor(chat.id);
    let online = false;
    let subtitle = isSaved
      ? 'Личные заметки и файлы'
      : (chat.type === 'channel'
        ? ((chat.members || []).length + ' подписч.')
        : ((chat.members || []).length + ' участн.'));

    if (chat.type === 'dm') {
      const otherId = (chat.members || []).find(id => id !== meId) || meId;
      const other = users.find(u => u.id === otherId) || { name: 'Пользователь', username: 'user' };
      title = other.name || other.username;
      initials = title.slice(0, 2).toUpperCase();
      color = other.color || getColor(other.id);
      online = Date.now() - (other.lastSeen || 0) < 45000;
      subtitle = online ? 'в сети' : '@' + other.username;
    }

    return normChat({
      id: chat.id,
      type: chat.type,
      name: title,
      title,
      initials,
      color,
      online,
      subtitle,
      status: subtitle,
      pinned: isSaved ? true : !!uState.pinned,
      muted: !!uState.muted,
      unreadCount,
      unread: unreadCount,
      lastMessage: lastMsg ? Object.assign({}, lastMsg) : null
    });
  }

  async function req(method, path, body) {
    await pullAll(method !== 'GET');
    const users = await getUsers();

    if (method === 'POST' && path === '/auth/signup') {
      const data = typeof body === 'object' ? body : {};
      const name = String(data.name || '').trim();
      const username = cleanUsername(data.username);
      const contactRaw = String(data.contact || '').trim();
      const password = String(data.password || '').trim();
      const avatar = data.avatar || null;

      if (!name) throw new Error('Введите ваше имя или ник');
      if (!username || username.length < 3) throw new Error('Придумайте @username (от 3 символов)');
      if (!contactRaw) throw new Error('Укажите номер телефона или почту');
      if (!password || password.length < 4) throw new Error('Пароль должен быть от 4 символов');

      const isEmail = contactRaw.includes('@');
      const email = isEmail ? contactRaw.toLowerCase() : '';
      const phone = !isEmail ? normPhone(contactRaw) : '';

if (!email && (!phone || phone.length < 10)) throw new Error('Введите корректный номер телефона или почту');
if (users.some(u => u.username === username)) throw new Error('Этот @username уже занят');
if (email && users.some(u => u.email === email)) throw new Error('Эта почта уже зарегистрирована');
if (phone && users.some(u => u.phone === phone)) throw new Error('Этот номер телефона уже зарегистрирован');
const user = enrichUser({
id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 999),
username,
name,
email,
phone,
passwordHash: await sha256(password),
bio: '',
avatar,
lastSeen: Date.now()
});
await putDoc('user__' + user.id, user);
setToken(user.id);
const savedChat = {
id: 'c_saved_' + user.id,
type: 'group',
name: 'Избранное',
members: [user.id],
userState: { [user.id]: { pinned: true, muted: false, lastRead: Date.now() } }
};
await putDoc('chat__' + savedChat.id, savedChat);
return { token: user.id, user };
}
if (method === 'POST' && path === '/auth/login') {
const rawLogin = String(body.username || '').trim();
const password = String(body.password || '').trim();
const qLower = cleanUsername(rawLogin);
const qPhone = normPhone(rawLogin);
const passHash = await sha256(password);
const found = users.find(u =>
u.passwordHash === passHash && (
u.username === qLower ||
(u.email && u.email === qLower) ||
(u.phone && qPhone && u.phone === qPhone)
)
);
if (!found) throw new Error('Аккаунт не найден или неверный пароль');
const user = enrichUser(found);
user.lastSeen = Date.now();
await putDoc('user__' + user.id, user);
setToken(user.id);
const allChats = await getChats();
if (!allChats.some(c => c.id === 'c_saved_' + user.id)) {
const savedChat = {
id: 'c_saved_' + user.id,
type: 'group',
name: 'Избранное',
members: [user.id],
userState: { [user.id]: { pinned: true, muted: false, lastRead: Date.now() } }
};
await putDoc('chat__' + savedChat.id, savedChat);
}
return { token: user.id, user };
}
const me = requireMe(users);
if (Date.now() - (me.lastSeen || 0) > 20000) {
me.lastSeen = Date.now();
putDoc('user__' + me.id, me).catch(() => {});
}
if (method === 'GET' && path === '/me') return { user: me, me };
if (method === 'POST' && path === '/me/delete') {
await delDoc('user__' + me.id);
await delDoc('chat__c_saved_' + me.id);
setToken(null);
return { ok: true };
}
if (method === 'POST' && path === '/me/update') {
if (body.name) me.name = String(body.name).trim();
if (body.username) {
const cleanU = cleanUsername(body.username);
if (cleanU && !users.some(u => u.id !== me.id && u.username === cleanU)) me.username = cleanU;
}
if (body.bio !== undefined) me.bio = String(body.bio).trim();
if (body.avatar !== undefined) me.avatar = body.avatar;
const updated = enrichUser(me);
await putDoc('user__' + updated.id, updated);
return { user: updated };
}
if (method === 'GET' && path.startsWith('/users/search')) {
const rawQ = decodeURIComponent(path.split('q=').at(1) || '').trim();
const qLower = cleanUsername(rawQ);
const qPhone = normPhone(rawQ);
const list = users
.filter(u => u.id !== me.id && (
!qLower ||
u.username.includes(qLower) ||
(u.name || '').toLowerCase().includes(qLower) ||
(u.phone && qPhone && u.phone === qPhone)
))
.map(u => ({
id: u.id,
username: u.username,
name: u.name,
initials: u.initials,
color: u.color,
online: Date.now() - (u.lastSeen || 0) < 45000
}));
return { users: list };
}
const allChats = await getChats();
if (method === 'GET' && path === '/chats') {
const myChats = allChats.filter(c => (c.members || []).includes(me.id));
const formatted = await Promise.all(myChats.map(async c => {
const msgs = await getChatMsgs(c.id, me.id, me.username);
return formatChatForUser(c, me, users, msgs);
}));
formatted.sort((a, b) => {
if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
const ta = a.lastMessage ? a.lastMessage.ts : 0;
const tb = b.lastMessage ? b.lastMessage.ts : 0;
return tb - ta;
});
return { chats: formatted };
}
if (method === 'POST' && path === '/chats') {
if (body.type === 'dm') {
const target = users.find(u => u.username === cleanUsername(body.username) || u.id === body.userId);
if (!target) throw new Error('Пользователь не найден');
const existing = allChats.find(c => c.type === 'dm' && c.members.includes(me.id) && c.members.includes(target.id));
if (existing) {
const msgs = await getChatMsgs(existing.id, me.id, me.username);
return { chat: formatChatForUser(existing, me, users, msgs) };
}
const dm = {
id: 'c_dm_' + [me.id, target.id].sort().join('_'),
type: 'dm',
name: '',
members: [me.id, target.id],
userState: { [me.id]: { lastRead: Date.now() }, [target.id]: { lastRead: 0 } }
};
await putDoc('chat__' + dm.id, dm);
return { chat: formatChatForUser(dm, me, users, []) };
}
if (body.type === 'group' || body.type === 'channel') {
const isChan = body.type === 'channel';
const gName = String(body.name || (isChan ? 'Новый канал' : 'Новая группа')).trim();
const picked = (body.memberUsernames || [])
.map(un => users.find(u => u.username === cleanUsername(un)))
.filter(Boolean)
.map(u => u.id);
const members = Array.from(new Set([me.id, ...picked]));
const grp = {
id: (isChan ? 'c_chn_' : 'c_grp_') + Date.now(),
type: isChan ? 'channel' : 'group',
name: gName,
ownerId: me.id,
members,
userState: { [me.id]: { lastRead: Date.now() } }
};
await putDoc('chat__' + grp.id, grp);
return { chat: formatChatForUser(grp, me, users, []) };
}
}
if (method === 'POST' && path.startsWith('/messages/') && path.endsWith('/delete')) {
const mid = path.split('/').at(2);
const map = await pullAll(false);
const entry = Object.entries(map).find(([k, v]) => k.startsWith('msg__') && v && v.data && (v.data.id === mid || v.data.mid === mid));
if (entry) {
const [docKey, wrap] = entry;
wrap.data.deleted = true;
wrap.data.text = 'Сообщение удалено';
wrap.data.kind = 'text';
delete wrap.data.data;
await putDoc(docKey, wrap.data);
}
return { ok: true };
}
if (path.startsWith('/chats/')) {
const parts = path.split('/');
const chatId = parts.at(2);
const rest = parts.slice(3).join('/');
const sub = rest ? '/' + rest : '';
const chat = allChats.find(c => c.id === chatId);
if (!chat) throw new Error('Чат не найден');
if (method === 'POST' && sub === '/members') {
const target = users.find(u => u.username === cleanUsername(body.username) || u.id === body.userId);
if (!target) throw new Error('Пользователь не найден');
if (!chat.members.includes(target.id)) {
chat.members.push(target.id);
await putDoc('chat__' + chatId, chat);
}
return { ok: true };
}
if (method === 'GET' && sub.startsWith('/messages')) {
const after = Number(sub.split('after=').at(1) || 0);
const msgs = (await getChatMsgs(chatId, me.id, me.username)).filter(m => !m.deleted && (m.ts || 0) > after);
return { messages: msgs, now: Date.now() };
}
if (method === 'POST' && sub === '/messages') {
const ts = Date.now();
const mid = 'm_' + ts + '_' + Math.floor(Math.random() * 9999);
const msg = normMsg({
id: mid,
mid: mid,
chatId,
from: me.username,
sender: me.name,
senderId: me.id,
senderUsername: me.username,
senderName: me.name,
color: me.color,
out: true,
ts,
kind: body.kind || 'text',
text: body.text || '',
data: body.data || null,
fileName: body.fileName || null,
fileSize: body.fileSize || null,
duration: body.duration || null,
replyTo: body.replyTo || null,
forwardedFrom: body.forwardedFrom || null,
status: 'read'
}, me.id, me.username);
await putDoc('msg__' + chatId + '__' + mid, msg);
return { message: msg };
}
if (method === 'POST' && sub === '/read') {
chat.userState = chat.userState || {};
chat.userState[me.id] = Object.assign({}, chat.userState[me.id], { lastRead: Date.now() });
await putDoc('chat__' + chatId, chat);
return { ok: true };
}
if (method === 'POST' && sub === '/typing') {
await putDoc('typing__' + chatId + '__' + me.id, { userId: me.id, name: me.name, ts: Date.now() });
return { ok: true };
}
if (method === 'GET' && sub === '/typing') {
const map = await pullAll(false);
const activeTypers = Object.entries(map)
.filter(([k, v]) => k.startsWith('typing__' + chatId + '__') && v && v.data && v.data.userId !== me.id && Date.now() - (v.data.ts || 0) < 4000)
.map(([, v]) => ({ name: v.data.name }));
return { typing: activeTypers };
}
if (method === 'GET' && sub === '/info') {
const members = (chat.members || [])
.map(id => users.find(u => u.id === id))
.filter(Boolean)
.map(u => ({
id: u.id,
name: u.name,
username: u.username,
initials: u.initials,
color: u.color,
online: Date.now() - (u.lastSeen || 0) < 45000
}));
const msgs = await getChatMsgs(chatId, me.id, me.username);
const media = msgs.filter(m => !m.deleted && (m.kind === 'image' || m.kind === 'video') && m.data).map(m => ({ id: m.id, kind: m.kind, data: m.data }));
const files = msgs.filter(m => !m.deleted && m.kind === 'file').map(m => ({ id: m.id, fileName: m.fileName, fileSize: m.fileSize }));
return { chat, members, media, files };
}
if (method === 'POST' && (sub === '/pin' || sub === '/mute')) {
const field = sub === '/pin' ? 'pinned' : 'muted';
chat.userState = chat.userState || {};
const cur = chat.userState[me.id] || {};
cur[field] = !cur[field];
chat.userState[me.id] = cur;
await putDoc('chat__' + chatId, chat);
return { [field]: cur[field] };
}
}
return {};
}
return {
get token() { return token; },
setToken,
signup: (payload) => req('POST', '/auth/signup', payload),
login: (username, password) => req('POST', '/auth/login', { username, password }),
me: () => req('GET', '/me'),
deleteAccount: () => req('POST', '/me/delete'),
updateProfile: (patch) => req('POST', '/me/update', patch),
chats: async () => ({ chats: (await req('GET', '/chats')).chats.map(normChat) }),
createChat: async (payload) => ({ chat: normChat((await req('POST', '/chats', payload)).chat) }),
addMember: (chatId, username) => req('POST', '/chats/' + chatId + '/members', { username }),
messages: async (id, after) => {
const d = await req('GET', '/chats/' + id + '/messages' + (after ? '?after=' + after : ''));
const myId = token;
const myUn = App.me && App.me.username;
const list = (d.messages || []).map(m => normMsg(m, myId, myUn));
return { messages: list, now: d.now };
},
send: async (id, msg) => ({ message: normMsg((await req('POST', '/chats/' + id + '/messages', msg)).message, token, App.me && App.me.username) }),
markRead: (id) => req('POST', '/chats/' + id + '/read'),
typing: (id) => req('POST', '/chats/' + id + '/typing'),
getTyping: (id) => req('GET', '/chats/' + id + '/typing'),
deleteMessage: (mid) => req('POST', '/messages/' + mid + '/delete'),
userSearch: (q) => req('GET', '/users/search?q=' + encodeURIComponent(q)),
chatInfo: (id) => req('GET', '/chats/' + id + '/info'),
pin: (id) => req('POST', '/chats/' + id + '/pin'),
mute: (id) => req('POST', '/chats/' + id + '/mute')
};
})();
