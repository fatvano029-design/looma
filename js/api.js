/* ================= js/api.js — Looma Cloud Firestore Backend ================= */
'use strict';
window.App = window.App || {};

App.api = (() => {
  const FS_DOC_BASE = 'projects/looma-14497/databases/(default)/documents/looma_v2';
  const FS_URL = 'https://googleapis.com' + FS_DOC_BASE;
  const FS_COMMIT = 'https://googleapis.comprojects/looma-14497/databases/(default)/documents:commit';
  const KEY = 'tg_token';
  let token = null;
  try { token = localStorage.getItem(KEY); } catch (e) {}

  const pad = n => String(n).padStart(2, '0');
  const COLORS = ['#7c4dff', '#00e5ff', '#00e676', '#ff5252', '#ffd740', '#e040fb', '#448aff'];
  const getColor = s => COLORS[Math.abs(String(s).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];

  function normPhone(p) {
    let digits = String(p || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
    return '+' + digits;
  }

  function stampTime(m) {
    if (m && m.ts != null && !m.time) {
      const d = new Date(m.ts);
      m.time = pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    return m;
  }

  function normChat(c) {
    if (c && c.lastMessage) stampTime(c.lastMessage);
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
    if (!force && _cache && Date.now() - _cacheTs < 900) return _cache;
    if (_inFlight) return _inFlight;
    _inFlight = (async () => {
      try {
        const res = await fetch(FS_URL + '?pageSize=500&_t=' + Date.now());
        if (!res.ok) throw new Error('Ошибка сервера: ' + res.status);
        const json = await res.json();
        const map = {};
        (json.documents || []).forEach(doc => {
          const id = decodeURIComponent(doc.name.split('/').pop());
          const raw = doc.fields && doc.fields.v && doc.fields.v.stringValue;
          if (raw) { try { map[id] = JSON.parse(raw); } catch (e) {} }
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

  async function putDoc(docId, obj) {
    if (!_cache) _cache = {};
    _cache[docId] = obj;
    const res = await fetch(FS_COMMIT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        writes: [{
          update: {
            name: FS_DOC_BASE + '/' + docId,
            fields: { v: { stringValue: JSON.stringify(obj) } }
          }
        }]
      })
    });
    if (!res.ok) throw new Error('Ошибка сохранения: ' + res.status);
    return obj;
  }

  async function getUsers() {
    const map = await pullAll(false);
    return Object.entries(map).filter(([k]) => k.startsWith('user__')).map(([, v]) => v);
  }

  async function getChats() {
    const map = await pullAll(false);
    return Object.entries(map).filter(([k]) => k.startsWith('chat__')).map(([, v]) => v);
  }

  async function getChatMsgs(chatId) {
    const map = await pullAll(false);
    return Object.entries(map)
      .filter(([k]) => k.startsWith('msg__' + chatId + '__'))
      .map(([, v]) => v)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }

  function requireMe(users) {
    const me = users.find(u => u.id === token);
    if (!me) {
      setToken(null);
      if (App.auth) App.auth.show('Войдите в аккаунт Looma');
      throw new Error('Unauthorized');
    }
    return me;
  }

  function formatChatForUser(chat, meId, users, msgs) {
    const uState = (chat.userState && chat.userState[meId]) || {};
    const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
    const lastRead = uState.lastRead || 0;
    const unreadCount = msgs.filter(m => m.senderId !== meId && (m.ts || 0) > lastRead).length;

    let title = chat.name || 'Чат';
    let initials = title.slice(0, 2).toUpperCase();
    let color = getColor(chat.id);
    let online = false;
    let subtitle = (chat.members || []).length + ' участн.';

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
      title,
      initials,
      color,
      online,
      subtitle,
      pinned: !!uState.pinned,
      muted: !!uState.muted,
      unreadCount,
      lastMessage: lastMsg ? Object.assign({}, lastMsg) : null
    });
  }

  async function req(method, path, body) {
    await pullAll(method !== 'GET');
    const users = await getUsers();

    // 1. Регистрация
    if (method === 'POST' && path === '/auth/signup') {
      const data = typeof body === 'object' ? body : {};
      const name = String(data.name || '').trim();
      const username = String(data.username || '').trim().replace(/^@+/, '').toLowerCase();
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

      if (!email && (!phone || phone.length < 8)) throw new Error('Введите корректный телефон или почту');
      if (users.some(u => u.username === username)) throw new Error('Этот @username уже занят');
      if (email && users.some(u => u.email === email)) throw new Error('Эта почта уже зарегистрирована');
      if (phone && users.some(u => u.phone === phone)) throw new Error('Этот номер телефона уже зарегистрирован');

      const isOwner = username === 'loomaadmin' || email === 'fatvano029@gmail.com';
      const user = {
        id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 999),
        username,
        name,
        email,
        phone,
        password,
        bio: '',
        avatar,
        initials: name.slice(0, 2).toUpperCase(),
        color: isOwner ? '#ffd740' : getColor(username),
        isAdmin: isOwner,
        lastSeen: Date.now()
      };
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

    // 2. Вход (по @username, почте или телефону)
    if (method === 'POST' && path === '/auth/login') {
      const rawLogin = String(body.username || '').trim();
      const password = String(body.password || '').trim();
      const qLower = rawLogin.replace(/^@+/, '').toLowerCase();
      const qPhone = normPhone(rawLogin);

      let user = users.find(u =>
        u.password === password && (
          u.username === qLower ||
          (u.email && u.email === qLower) ||
          (u.phone && qPhone && u.phone === qPhone)
        )
      );

      if (!user && (qLower === 'loomaadmin' || qLower === 'fatvano029@gmail.com' || qPhone === '+79910443406') && password === '&!LoOmaAdMin!&') {
        user = {
          id: 'admin_looma',
          username: 'loomaadmin',
          name: 'LoomaAdmin',
          email: 'fatvano029@gmail.com',
          phone: '+79910443406',
          password: '&!LoOmaAdMin!&',
          bio: 'Создатель Looma',
          avatar: null,
          initials: 'LA',
          color: '#ffd740',
          isAdmin: true,
          lastSeen: Date.now()
        };
        await putDoc('user__' + user.id, user);
      }

      if (!user) throw new Error('Аккаунт не найден или неверный пароль');
      user.lastSeen = Date.now();
      await putDoc('user__' + user.id, user);
      setToken(user.id);

      const allChats = await getChats();
      if (!allChats.some(c => (c.members || []).includes(user.id))) {
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

    // 3. Профиль и его обновление
    if (method === 'GET' && path === '/me') {
      return { user: me };
    }

    if (method === 'POST' && path === '/me/update') {
      if (body.name) {
        me.name = String(body.name).trim();
        me.initials = me.name.slice(0, 2).toUpperCase();
      }
      if (body.username) {
        const cleanU = String(body.username).trim().replace(/^@+/, '').toLowerCase();
        if (cleanU && !users.some(u => u.id !== me.id && u.username === cleanU)) {
          me.username = cleanU;
        }
      }
      if (body.bio !== undefined) me.bio = String(body.bio).trim();
if (body.avatar !== undefined) me.avatar = body.avatar;
await putDoc('user__' + me.id, me);
return { user: me };
}
// 4. Поиск людей (по @username, имени или телефону)
if (method === 'GET' && path.startsWith('/users/search')) {
const rawQ = decodeURIComponent(path.split('q=').at(1) || '').trim();
const qLower = rawQ.replace(/^@+/, '').toLowerCase();
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
const msgs = await getChatMsgs(c.id);
return formatChatForUser(c, me.id, users, msgs);
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
const target = users.find(u => u.username === String(body.username || '').toLowerCase() || u.id === body.userId);
if (!target) throw new Error('Пользователь не найден');
const existing = allChats.find(c => c.type === 'dm' && c.members.includes(me.id) && c.members.includes(target.id));
if (existing) {
const msgs = await getChatMsgs(existing.id);
return { chat: formatChatForUser(existing, me.id, users, msgs) };
}
const dm = {
id: 'c_dm_' + [me.id, target.id].sort().join('_'),
type: 'dm',
name: '',
members: [me.id, target.id],
userState: { [me.id]: { lastRead: Date.now() }, [target.id]: { lastRead: 0 } }
};
await putDoc('chat__' + dm.id, dm);
return { chat: formatChatForUser(dm, me.id, users, []) };
}
if (body.type === 'group') {
const gName = String(body.name || 'Новая группа').trim();
const picked = (body.memberUsernames || [])
.map(un => users.find(u => u.username === String(un).toLowerCase()))
.filter(Boolean)
.map(u => u.id);
const members = Array.from(new Set([me.id, ...picked]));
const grp = {
id: 'c_grp_' + Date.now(),
type: 'group',
name: gName,
members,
userState: { [me.id]: { lastRead: Date.now() } }
};
await putDoc('chat__' + grp.id, grp);
return { chat: formatChatForUser(grp, me.id, users, []) };
}
}
if (method === 'POST' && path.startsWith('/messages/') && path.endsWith('/delete')) {
const mid = path.split('/').at(2);
const map = await pullAll(false);
const entry = Object.entries(map).find(([k, v]) => k.startsWith('msg__') && v && v.id === mid);
if (entry) {
const [docKey, msgObj] = entry;
msgObj.deleted = true;
msgObj.text = 'Сообщение удалено';
msgObj.kind = 'text';
delete msgObj.data;
await putDoc(docKey, msgObj);
}
return { ok: true };
}
const mChat = path.match(/^/chats/([^/]+)(/.*)?$/);
if (mChat) {
const chatId = mChat.at(1);
const sub = mChat.at(2) || '';
const chat = allChats.find(c => c.id === chatId);
if (!chat) throw new Error('Чат не найден');
if (method === 'GET' && sub.startsWith('/messages')) {
const after = Number(sub.split('after=').at(1) || 0);
const msgs = (await getChatMsgs(chatId)).filter(m => !m.deleted && (m.ts || 0) > after);
return { messages: msgs, now: Date.now() };
}
if (method === 'POST' && sub === '/messages') {
const ts = Date.now();
const msg = {
id: 'm_' + ts + '_' + Math.floor(Math.random() * 9999),
chatId,
senderId: me.id,
senderName: me.name,
senderColor: me.color,
out: true,
ts,
kind: body.kind || 'text',
text: body.text || '',
data: body.data || null,
fileName: body.fileName || null,
fileSize: body.fileSize || null,
duration: body.duration || null,
replyTo: body.replyTo || null,
status: 'read'
};
await putDoc('msg__' + chatId + '__' + msg.id, msg);
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
.filter(([k, v]) => k.startsWith('typing__' + chatId + '__') && v && v.userId !== me.id && Date.now() - (v.ts || 0) < 4000)
.map(([, v]) => v.name);
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
const msgs = await getChatMsgs(chatId);
const media = msgs.filter(m => !m.deleted && m.kind === 'image' && m.data).map(m => ({ id: m.id, data: m.data }));
return { members, media };
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
updateProfile: (patch) => req('POST', '/me/update', patch),
chats: async () => ({ chats: (await req('GET', '/chats')).chats.map(normChat) }),
createChat: async (payload) => ({ chat: normChat((await req('POST', '/chats', payload)).chat) }),
messages: async (id, after) => {
const d = await req('GET', '/chats/' + id + '/messages' + (after ? '?after=' + after : ''));
const myId = token;
const list = (d.messages || []).map(m => {
m.out = m.senderId === myId;
return stampTime(m);
});
return { messages: list, now: d.now };
},
send: async (id, msg) => ({ message: stampTime((await req('POST', '/chats/' + id + '/messages', msg)).message) }),
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
