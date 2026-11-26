/* ================= js/api.js — Looma Decentralized Gun.js Backend ================= */
'use strict';
window.App = window.App || {};

App.api = (() => {
  const ROOM_NS = 'looma_net_v3_prod';
  const PEERS = [
    'https://herokuapp.com',
    'https://wallie.io',
    'https://ondigitalocean.app'
  ];

  const gun = window.Gun ? window.Gun({ peers: PEERS, localStorage: true }) : null;
  const root = gun ? gun.get(ROOM_NS) : null;

  const KEY = 'tg_token';
  let token = null;
  try { token = localStorage.getItem(KEY); } catch (e) {}

  const pad = n => String(n).padStart(2, '0');
  const COLORS = ['#7c4dff', '#00e5ff', '#00e676', '#ff5252', '#ffd740', '#e040fb', '#448aff'];
  const getColor = s => COLORS[Math.abs(String(s).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];

  const memUsers = {};
  const memChats = {};
  const memMsgs = {};
  const memTyping = {};

  function loadMirror() {
    try {
      const m = JSON.parse(localStorage.getItem('looma_gun_mirror') || '{}');
      Object.assign(memUsers, m.users || {});
      Object.assign(memChats, m.chats || {});
      Object.assign(memMsgs, m.msgs || {});
    } catch (e) {}
  }

  function saveMirror() {
    try {
      localStorage.setItem('looma_gun_mirror', JSON.stringify({
        users: memUsers,
        chats: memChats,
        msgs: memMsgs
      }));
    } catch (e) {}
  }

  loadMirror();

  if (root) {
    root.get('users').map().on((val, key) => {
      if (typeof val === 'string' && key) {
        try { memUsers[key] = JSON.parse(val); saveMirror(); } catch (e) {}
      }
    });
    root.get('chats').map().on((val, key) => {
      if (typeof val === 'string' && key) {
        try { memChats[key] = JSON.parse(val); saveMirror(); } catch (e) {}
      }
    });
    root.get('msgs').map().on((val, key) => {
      if (typeof val === 'string' && key) {
        try { memMsgs[key] = JSON.parse(val); saveMirror(); } catch (e) {}
      }
    });
    root.get('typing').map().on((val, key) => {
      if (typeof val === 'string' && key) {
        try { memTyping[key] = JSON.parse(val); } catch (e) {}
      }
    });
  }

  function putNode(branch, id, obj) {
    if (branch === 'users') memUsers[id] = obj;
    if (branch === 'chats') memChats[id] = obj;
    if (branch === 'msgs') memMsgs[id] = obj;
    if (branch === 'typing') memTyping[id] = obj;
    if (branch !== 'typing') saveMirror();
    if (root) root.get(branch).get(id).put(JSON.stringify(obj));
  }

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
    const users = Object.values(memUsers);

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
        id: isOwner ? 'admin_looma' : ('u_' + Date.now() + '_' + Math.floor(Math.random() * 999)),
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
      putNode('users', user.id, user);
      setToken(user.id);

      const savedChat = {
        id: 'c_saved_' + user.id,
        type: 'group',
        name: 'Избранное',
        members: [user.id],
        userState: { [user.id]: { pinned: true, muted: false, lastRead: Date.now() } }
      };
      putNode('chats', savedChat.id, savedChat);
      return { token: user.id, user };
    }

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
        putNode('users', user.id, user);
      }

      if (!user) throw new Error('Аккаунт не найден или неверный пароль');
      user.lastSeen = Date.now();
      putNode('users', user.id, user);
      setToken(user.id);

      const allChats = Object.values(memChats);
      if (!allChats.some(c => (c.members || []).includes(user.id))) {
        const savedChat = {
          id: 'c_saved_' + user.id,
          type: 'group',
          name: 'Избранное',
          members: [user.id],
          userState: { [user.id]: { pinned: true, muted: false, lastRead: Date.now() } }
        };
        putNode('chats', savedChat.id, savedChat);
      }

      return { token: user.id, user };
    }

    const me = users.find(u => u.id === token);
    if (!me) {
      setToken(null);
      if (App.auth) App.auth.show('Войдите в аккаунт Looma');
      throw new Error('Unauthorized');
    }

    if (Date.now() - (me.lastSeen || 0) > 20000) {
      me.lastSeen = Date.now();
      putNode('users', me.id, me);
    }

    if (method === 'GET' && path === '/me') return { user: me };

    if (method === 'POST' && path === '/me/update') {
      if (body.name) {
        me.name = String(body.name).trim();
        me.initials = me.name.slice(0, 2).toUpperCase();
      }
      if (body.username) {
        const cleanU = String(body.username).trim().replace(/^@+/, '').toLowerCase();
        if (cleanU && !users.some(u => u.id !== me.id && u.username === cleanU)) me.username = cleanU;
      }
      if (body.bio !== undefined) me.bio = String(body.bio).trim();
      if (body.avatar !== undefined) me.avatar = body.avatar;
      putNode('users', me.id, me);
      return { user: me };
    }

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
const allChats = Object.values(memChats);
const allMsgs = Object.values(memMsgs);
if (method === 'GET' && path === '/chats') {
const myChats = allChats.filter(c => (c.members || []).includes(me.id));
const formatted = myChats.map(c => {
const msgs = allMsgs.filter(m => m.chatId === c.id && !m.deleted).sort((a, b) => (a.ts || 0) - (b.ts || 0));
return formatChatForUser(c, me.id, users, msgs);
});
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
const msgs = allMsgs.filter(m => m.chatId === existing.id && !m.deleted).sort((a, b) => (a.ts || 0) - (b.ts || 0));
return { chat: formatChatForUser(existing, me.id, users, msgs) };
}
const dm = {
id: 'c_dm_' + [me.id, target.id].sort().join('_'),
type: 'dm',
name: '',
members: [me.id, target.id],
userState: { [me.id]: { lastRead: Date.now() }, [target.id]: { lastRead: 0 } }
};
putNode('chats', dm.id, dm);
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
putNode('chats', grp.id, grp);
return { chat: formatChatForUser(grp, me.id, users, []) };
}
}
if (method === 'POST' && path.startsWith('/messages/') && path.endsWith('/delete')) {
const mid = path.split('/').at(2);
const msgObj = memMsgs[mid];
if (msgObj) {
msgObj.deleted = true;
msgObj.text = 'Сообщение удалено';
msgObj.kind = 'text';
delete msgObj.data;
putNode('msgs', mid, msgObj);
}
return { ok: true };
}
const mChat = path.match(/^/chats/([^/]+)(/.*)?$/);
if (mChat) {
const chatId = mChat.at(1);
const sub = mChat.at(2) || '';
const chat = memChats[chatId];
if (!chat) throw new Error('Чат не найден');
if (method === 'GET' && sub.startsWith('/messages')) {
const after = Number(sub.split('after=').at(1) || 0);
const msgs = allMsgs
.filter(m => m.chatId === chatId && !m.deleted && (m.ts || 0) > after)
.sort((a, b) => (a.ts || 0) - (b.ts || 0));
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
putNode('msgs', msg.id, msg);
return { message: msg };
}
if (method === 'POST' && sub === '/read') {
chat.userState = chat.userState || {};
chat.userState[me.id] = Object.assign({}, chat.userState[me.id], { lastRead: Date.now() });
putNode('chats', chatId, chat);
return { ok: true };
}
if (method === 'POST' && sub === '/typing') {
putNode('typing', chatId + '_' + me.id, { chatId, userId: me.id, name: me.name, ts: Date.now() });
return { ok: true };
}
if (method === 'GET' && sub === '/typing') {
const activeTypers = Object.values(memTyping)
.filter(v => v && v.chatId === chatId && v.userId !== me.id && Date.now() - (v.ts || 0) < 4000)
.map(v => v.name);
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
const media = allMsgs
.filter(m => m.chatId === chatId && !m.deleted && m.kind === 'image' && m.data)
.map(m => ({ id: m.id, data: m.data }));
return { members, media };
}
if (method === 'POST' && (sub === '/pin' || sub === '/mute')) {
const field = sub === '/pin' ? 'pinned' : 'muted';
chat.userState = chat.userState || {};
const cur = chat.userState[me.id] || {};
cur[field] = !cur[field];
chat.userState[me.id] = cur;
putNode('chats', chatId, chat);
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
