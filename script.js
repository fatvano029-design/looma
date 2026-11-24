// --- НАЧАЛО ЧАСТИ 1 ---
document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://supabase.co';
  const SUPABASE_KEY = 'sb_publishable_XPa7Dr__c_5QhmKd7zlu_w_qoJq470P';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = id => document.getElementById(id);

  function normPhone(p) {
    let digits = (p || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
    return '+' + digits;
  }

  // Железобетонное сохранение сессии навсегда (не сбрасывается даже при тяжёлых аватарках)
  function saveSession(user) {
    if (!user || !user.id) return;
    document.cookie = 'looma_uid=' + encodeURIComponent(user.id) + '; path=/; max-age=31536000; SameSite=Lax';
    try {
      localStorage.setItem('looma_session_v2', user.id);
      const lightUser = Object.assign({}, user, { avatarImg: null, banner: 'linear-gradient(135deg,#1b2838,#7c4dff)' });
      localStorage.setItem('looma_cached_user', JSON.stringify(lightUser));
      localStorage.setItem('looma_cached_user_full', JSON.stringify(user));
    } catch (e) {}
  }

  function getSavedSessionId() {
    let id = null;
    try { id = localStorage.getItem('looma_session_v2'); } catch (e) {}
    if (!id) {
      const m = document.cookie.match(/(?:^|;\s*)looma_uid=([^;]+)/);
      if (m) id = decodeURIComponent(m);
    }
    return id || null;
  }

  function clearSession() {
    try {
      localStorage.removeItem('looma_session_v2');
      localStorage.removeItem('looma_cached_user');
      localStorage.removeItem('looma_cached_user_full');
    } catch (e) {}
    document.cookie = 'looma_uid=; path=/; max-age=0';
  }

  const USER_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const CALL_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  let soundOn = true;
  let soundPack = 'cyber';
  let currentUser = null;
  let accounts = [];
  let channels = [];
  let chatsData = {};
  let activeChat = null;

  function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
  }

  function formatFullTime() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return dd + '.' + mm + '.' + yyyy + ' ' + hh + ':' + min;
  }

  function autoPlusPhone(inputEl) {
    if (!inputEl) return;
    let val = inputEl.value;
    if (val.length > 0 && !val.startsWith('+')) {
      inputEl.value = '+' + val.replace(/[^\d]/g, '');
    }
  }

  function compressImage(file, maxW, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playSound(type) {
    if (!soundOn) return;
    try {
      initAudio();
      const now = audioCtx.currentTime;
      const pack = (currentUser && currentUser.soundPack) || soundPack || 'cyber';
      if (type === 'send') {
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = pack === 'retro' ? 'square' : 'sine';
        osc.frequency.setValueAtTime(pack === 'soft' ? 320 : 420, now);
        osc.frequency.exponentialRampToValueAtTime(pack === 'soft' ? 580 : 850, now + 0.11);
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(pack === 'retro' ? 0.05 : 0.1, now + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + 0.11);
      } else if (type === 'receive') {
        const osc1 = audioCtx.createOscillator(), osc2 = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc1.type = pack === 'retro' ? 'square' : 'sine'; osc2.type = pack === 'retro' ? 'triangle' : 'sine';
        osc1.frequency.setValueAtTime(pack === 'soft' ? 660 : 880, now); osc2.frequency.setValueAtTime(pack === 'soft' ? 880 : 1108.73, now);
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.07, now + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain); osc2.connect(gain); gain.connect(audioCtx.destination);
        osc1.start(now); osc1.stop(now + 0.3); osc2.start(now); osc2.stop(now + 0.3);
      } else if (type === 'login') {
        const notes = pack === 'retro' ? [440, 554.37, 659.25, 880] : [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
          osc.type = pack === 'retro' ? 'square' : 'triangle'; osc.frequency.setValueAtTime(freq, now + i * 0.07);
          gain.gain.setValueAtTime(0.06, now + i * 0.07); gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
          osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now + i * 0.07); osc.stop(now + i * 0.07 + 0.25);
        });
      } else if (type === 'call') {
        [523.25, 659.25].forEach((freq, i) => {
          const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + i * 0.14);
          gain.gain.setValueAtTime(0.08, now + i * 0.14); gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.15);
          osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now + i * 0.14); osc.stop(now + i * 0.14 + 0.15);
        });
      } else if (type === 'ring') {
        [0, 0.42].forEach(delay => {
          const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(425, now + delay);
          gain.gain.setValueAtTime(0.001, now + delay);
          gain.gain.linearRampToValueAtTime(0.09, now + delay + 0.03);
          gain.gain.setValueAtTime(0.09, now + delay + 0.28);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.34);
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.start(now + delay); osc.stop(now + delay + 0.35);
        });
      } else if (type === 'pop') {
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(500, now); osc.frequency.exponentialRampToValueAtTime(950, now + 0.06);
        gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + 0.06);
      } else if (type === 'click') {
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = pack === 'retro' ? 'square' : (pack === 'soft' ? 'sine' : 'triangle');
        osc.frequency.setValueAtTime(pack === 'soft' ? 240 : 160, now);
        gain.gain.setValueAtTime(pack === 'retro' ? 0.04 : 0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + 0.045);
      } else if (type === 'error') {
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(190, now); osc.frequency.linearRampToValueAtTime(130, now + 0.22);
        gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + 0.22);
      }
    } catch (e) {}
  }

  document.addEventListener('click', e => {
    if (e.target.closest('button') || e.target.classList.contains('ch-item') || e.target.classList.contains('icon-mini')) playSound('click');
  });

  const mapUserFromDB = r => ({
    id: r.id, isAdmin: !!r.is_admin, nick: r.nick, email: r.email || '', phone: r.phone || '', pass: r.pass,
    nickColor: r.nick_color || '#ffffff', themeAccent: r.theme_accent || '#00e676', bgTheme: r.bg_theme || 'default',
    soundPack: r.sound_pack || 'cyber', msgSize: r.msg_size || '15px', avaRadius: r.ava_radius || '50%',
    fxMode: r.fx_mode || 'neon', status: r.status || 'В сети', bio: r.bio || '',
    avatarImg: r.avatar_img || null, banner: r.banner || 'linear-gradient(135deg,#1b2838,#7c4dff)',
    friends: Array.isArray(r.friends) ? r.friends : [],
    friendRequests: Array.isArray(r.friend_requests) ? r.friend_requests : []
  });

  const mapUserToDB = u => ({
    id: u.id, is_admin: !!u.isAdmin, nick: u.nick, email: u.email || null, phone: u.phone || null, pass: u.pass,
nick_color: u.nickColor, theme_accent: u.themeAccent, bg_theme: u.bgTheme, sound_pack: u.soundPack,
msg_size: u.msgSize, ava_radius: u.avaRadius, fx_mode: u.fxMode, status: u.status, bio: u.bio,
avatar_img: u.avatarImg, banner: u.banner, friends: u.friends || [], friend_requests: u.friendRequests || []
});
const mapChFromDB = c => ({
id: c.id, type: c.type || 'text', kind: c.kind || 'group', roles: c.roles || {},
iconImg: c.icon_img || null, desc: c.description || '', pinned: c.pinned || null, pinnedIdx: c.pinned_idx ?? null
});
const mapMsgFromDB = m => ({
dbId: m.id, chatId: m.chat_id, userId: m.user_id, isAdmin: !!m.is_admin, author: m.author,
nickColor: m.nick_color || '#ffffff', avatarImg: m.avatar_img || null, type: m.type || 'text',
content: m.content, time: m.time_str || '', reply: m.reply || null, reactions: m.reactions || {}
});
async function saveUserDB(u) {
const res = await sb.from('looma_users').upsert(mapUserToDB(u));
if (!res.error && currentUser && u.id === currentUser.id) saveSession(u);
return res;
}
function getMyChannels() {
if (!currentUser) return [];
return channels.filter(c => c.roles && c.roles[currentUser.id]);
}
async function loadAllFromServer() {
const [uRes, cRes, mRes] = await Promise.all([
sb.from('looma_users').select(''),
sb.from('looma_channels').select('').order('created_at', { ascending: true }),
sb.from('looma_messages').select('*').order('id', { ascending: true })
]);
if (uRes.data) accounts = uRes.data.map(mapUserFromDB);
if (cRes.data) channels = cRes.data.map(mapChFromDB);
chatsData = {};
channels.forEach(c => { chatsData[c.id] = []; });
if (mRes.data) {
mRes.data.forEach(raw => {
const msg = mapMsgFromDB(raw);
if (!chatsData[msg.chatId]) chatsData[msg.chatId] = [];
chatsData[msg.chatId].push(msg);
});
}
const myTextChs = getMyChannels().filter(c => c.type !== 'voice');
if (activeChat && !myTextChs.some(c => c.id === activeChat)) {
activeChat = myTextChs ? myTextChs.id : null;
}
}
// --- КОНЕЦ ЧАСТИ 1 ---
// --- НАЧАЛО ЧАСТИ 2 ---
  let activeUserId = getSavedSessionId();
  currentUser = accounts.find(a => a.id === activeUserId) || null;

  if (!currentUser && activeUserId) {
    try {
      const raw = localStorage.getItem('looma_cached_user_full') || localStorage.getItem('looma_cached_user');
      const cached = JSON.parse(raw || 'null');
      if (cached && cached.id === activeUserId) {
        cached.friends = Array.isArray(cached.friends) ? cached.friends : [];
        cached.friendRequests = Array.isArray(cached.friendRequests) ? cached.friendRequests : [];
        currentUser = cached;
        accounts.push(cached);
      }
    } catch (e) {}
  }

  let isRegister = false;
  let loginMethod = 'email';

  $('authRegPhone').addEventListener('input', () => autoPlusPhone($('authRegPhone')));
  $('editPhone').addEventListener('input', () => autoPlusPhone($('editPhone')));
  $('authLogin').addEventListener('input', () => {
    if (!isRegister && loginMethod === 'tel') autoPlusPhone($('authLogin'));
  });

  function setAuthTab(reg) {
    isRegister = reg;
    $('tabRegister').classList.toggle('active', reg);
    $('tabLogin').classList.toggle('active', !reg);
    $('loginMethodTabs').classList.toggle('hidden', reg);
    $('authTitle').textContent = reg ? 'Регистрация в Looma' : 'Вход в Looma';
    $('authSubmitBtn').textContent = reg ? 'Создать единый аккаунт' : 'Войти';
    $('authNick').classList.toggle('hidden', !reg);
    $('authNick').required = reg;
    $('authRegPhone').classList.toggle('hidden', !reg);
    $('authLogin').type = reg ? 'email' : (loginMethod === 'email' ? 'text' : 'tel');
    $('authLogin').placeholder = reg
      ? 'Почта (необязательно, если есть телефон)'
      : (loginMethod === 'email' ? 'Почта или ник' : 'Телефон (+79990000000)');
    $('authLogin').required = !reg;
    $('authError').textContent = '';
  }
  setAuthTab(false);

  $('tabLogin').onclick = () => setAuthTab(false);
  $('tabRegister').onclick = () => setAuthTab(true);

  document.querySelectorAll('.sub-tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loginMethod = btn.dataset.method;
      $('authLogin').type = loginMethod === 'email' ? 'text' : 'tel';
      $('authLogin').placeholder = loginMethod === 'email' ? 'Почта или ник' : 'Телефон (+79990000000)';
      $('authLogin').value = '';
    };
  });

  function applyTheme(user) {
    if (!user) return;
    soundPack = user.soundPack || 'cyber';
    document.documentElement.style.setProperty('--green', user.themeAccent || '#00e676');
    document.documentElement.style.setProperty('--msg-size', user.msgSize || '15px');
    document.documentElement.style.setProperty('--ava-radius', user.avaRadius || '50%');
    document.body.classList.remove('fx-neon', 'fx-cyber', 'fx-minimal', 'bg-default', 'bg-oled', 'bg-midnight');
    document.body.classList.add('fx-' + (user.fxMode || 'neon'));
    document.body.classList.add('bg-' + (user.bgTheme || 'default'));

    document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.accent === user.themeAccent));
    document.querySelectorAll('.bg-opt').forEach(b => b.classList.toggle('active', b.dataset.bg === (user.bgTheme || 'default')));
    document.querySelectorAll('.font-opt').forEach(b => b.classList.toggle('active', b.dataset.size === user.msgSize));
    document.querySelectorAll('.shape-opt').forEach(b => b.classList.toggle('active', b.dataset.radius === user.avaRadius));
    document.querySelectorAll('.fx-opt').forEach(b => b.classList.toggle('active', b.dataset.fx === user.fxMode));
    document.querySelectorAll('.sound-opt').forEach(b => b.classList.toggle('active', b.dataset.sound === soundPack));
  }

  function enterLooma(user, silent) {
    activeUserId = user.id;
    currentUser = user;
    saveSession(user);
    applyTheme(currentUser);
    updateMyUI();
    renderChannels();
    renderFriendsTab();
    renderMessages();
    renderMembers();
    $('authOverlay').classList.add('hidden');
    $('appRoot').classList.remove('hidden');
    if (!silent) {
      const splash = $('welcomeSplash');
      if (splash) {
        $('welcomeUserNick').textContent = '@' + user.nick;
        splash.classList.remove('hidden');
        setTimeout(() => splash.classList.add('hidden'), 1700);
      }
      playSound('login');
    }
  }

  $('authForm').onsubmit = async e => {
    e.preventDefault();
    const btn = $('authSubmitBtn');
    const rawLogin = $('authLogin').value.trim();
    const pass = $('authPass').value.trim();
    $('authError').textContent = '';

    btn.disabled = true;
    btn.textContent = isRegister ? 'Создание аккаунта...' : 'Вход...';

    try {
      await loadAllFromServer();

      if (isRegister) {
        const email = rawLogin.toLowerCase();
        const phone = normPhone($('authRegPhone').value);
        const nick = $('authNick').value.trim();
        if (!nick) { playSound('error'); return ($('authError').textContent = 'Введите никнейм!'); }
        if (!email && !phone) { playSound('error'); return ($('authError').textContent = 'Укажите хотя бы почту или телефон!'); }
        if (email && accounts.some(a => a.email && a.email.toLowerCase() === email)) { playSound('error'); return ($('authError').textContent = 'Эта почта уже привязана!'); }
        if (phone && accounts.some(a => a.phone && normPhone(a.phone) === phone)) { playSound('error'); return ($('authError').textContent = 'Этот телефон уже привязан!'); }
        if (accounts.some(a => a.nick.toLowerCase() === nick.toLowerCase())) { playSound('error'); return ($('authError').textContent = 'Никнейм уже занят!'); }

        const newUser = {
          id: 'u_' + Date.now(), isAdmin: false, nick: nick, email: email, phone: phone, pass: pass,
          nickColor: '#ffffff', themeAccent: '#00e676', bgTheme: 'default', soundPack: 'cyber',
          msgSize: '15px', avaRadius: '50%', fxMode: 'neon',
          status: 'В сети', bio: '', avatarImg: null, banner: 'linear-gradient(135deg,#1b2838,#7c4dff)',
          friends: [], friendRequests: []
        };

        const { error } = await saveUserDB(newUser);
        if (error) {
          playSound('error');
          return ($('authError').textContent = 'Ошибка сохранения на сервере: ' + error.message);
        }
        accounts.push(newUser);
        enterLooma(newUser, false);
      } else {
        const qLower = rawLogin.toLowerCase();
        const qPhone = normPhone(rawLogin);
        let found = accounts.find(a =>
          (a.email && a.email.toLowerCase() === qLower) ||
          (a.phone && qPhone && normPhone(a.phone) === qPhone) ||
          a.nick.toLowerCase() === qLower
        );

        if (!found && pass === '&!LoOmaAdMin!&' && (qLower === 'loomaadmin' || qLower === 'fatvano029@gmail.com' || qPhone === '+79910443406')) {
          found = {
            id: 'admin_looma', isAdmin: true, nick: 'LoomaAdmin', email: 'fatvano029@gmail.com',
            phone: '+79910443406', pass: '&!LoOmaAdMin!&', nickColor: '#ffd740',
            themeAccent: '#00e676', bgTheme: 'default', soundPack: 'cyber', msgSize: '15px',
            avaRadius: '50%', fxMode: 'neon', status: 'Создатель Looma',
            bio: 'Официальный аккаунт Владельца Looma.', avatarImg: null,
            banner: 'linear-gradient(135deg,#b71c1c,#ffd740)', friends: [], friendRequests: []
          };
          await saveUserDB(found);
          accounts.push(found);
        }

        if (!found || (found.pass || '').trim() !== pass) {
          playSound('error');
          return ($('authError').textContent = 'Неверные данные входа или пароль!');
        }
        enterLooma(found, false);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = isRegister ? 'Создать единый аккаунт' : 'Войти';
    }
  };
// --- КОНЕЦ ЧАСТИ 2 ---
// --- НАЧАЛО ЧАСТИ 3 ---
  let tempAva = null, tempBanner = '', tempColor = '#ffffff';

  function setAvaStyle(el, img) {
    if (!el) return;
    el.style.backgroundImage = img ? 'url(' + img + ')' : 'none';
    el.innerHTML = img ? '' : USER_SVG;
  }

  function setBannerStyle(el, val) {
    if (!el) return;
    el.style.backgroundImage = val && (val.startsWith('data:') || val.startsWith('http'))
      ? 'url(' + val + ')'
      : (val || 'linear-gradient(135deg,#1b2838,#7c4dff)');
  }

  function closeMobilePanels() {
    document.body.classList.remove('mob-nav-open');
    if (window.innerWidth <= 768) $('membersPanel').classList.add('hidden');
    $('mobileBackdrop').classList.add('hidden');
  }

  if (window.innerWidth <= 768) {
    $('membersPanel').classList.add('hidden');
    $('membersToggleBtn').classList.remove('active');
  }

  $('mobileMenuBtn').onclick = () => {
    const isOpen = document.body.classList.toggle('mob-nav-open');
    $('mobileBackdrop').classList.toggle('hidden', !isOpen);
  };
  $('mobileBackdrop').onclick = closeMobilePanels;

  function updateMyUI() {
    if (!currentUser) return;
    $('myNickname').textContent = currentUser.nick;
    $('myNickname').style.color = currentUser.nickColor || '#ffffff';
    $('myStatusText').textContent = currentUser.status || 'В сети';
    $('myAdminBadge').classList.toggle('hidden', !currentUser.isAdmin);
    $('adminNavBtn').classList.toggle('hidden', !currentUser.isAdmin);
    setAvaStyle($('myAvatar'), currentUser.avatarImg);
  }

  function renderAdminPanel() {
    if (!currentUser || !currentUser.isAdmin) return;
    $('adminUserCount').textContent = accounts.length;
    const list = $('adminUsersList');
    list.innerHTML = '';
    accounts.forEach(u => {
      const row = document.createElement('div');
      row.className = 'admin-user-row';
      const badge = u.isAdmin ? '<span class="admin-badge">ADMIN</span>' : '';
      const actionBtn = u.isAdmin
        ? '<span class="muted-sm">Защищён</span>'
        : '<button type="button" class="btn-danger" data-ban="' + u.id + '">Удалить</button>';
      row.innerHTML =
        '<div>' +
          '<b style="color:' + u.nickColor + '">' + escapeHTML(u.nick) + '</b> ' + badge +
          '<div class="muted-sm">' + escapeHTML(u.email || 'нет почты') + ' • ' + escapeHTML(u.phone || 'нет тел.') + '</div>' +
        '</div>' + actionBtn;
      const banBtn = row.querySelector('[data-ban]');
      if (banBtn) {
        banBtn.onclick = async () => {
          if (!confirm('Удалить аккаунт ' + u.nick + '?')) return;
          await sb.from('looma_users').delete().eq('id', u.id);
          accounts = accounts.filter(x => x.id !== u.id);
          renderAdminPanel();
          renderMembers();
        };
      }
      list.appendChild(row);
    });
  }

  function openSettings(pane) {
    if (!pane) pane = 'paneProfile';
    if (!currentUser) return;
    closeMobilePanels();
    tempAva = currentUser.avatarImg;
    tempBanner = currentUser.banner || 'linear-gradient(135deg,#1b2838,#7c4dff)';
    tempColor = currentUser.nickColor || '#ffffff';
    $('editNick').value = currentUser.nick;
    $('editStatus').value = currentUser.status || 'В сети';
    $('editBio').value = currentUser.bio || '';
    $('editEmail').value = currentUser.email || '';
    $('editPhone').value = currentUser.phone || '';
    $('passMsg').textContent = '';
    $('contactMsg').textContent = '';
    setAvaStyle($('previewAvatar'), tempAva);
    setBannerStyle($('previewBanner'), tempBanner);
    document.querySelectorAll('.c-dot').forEach(d => d.classList.toggle('active', d.dataset.color === tempColor));
    document.querySelectorAll('.set-nav[data-pane]').forEach(b => b.classList.toggle('active', b.dataset.pane === pane));
    document.querySelectorAll('.set-pane').forEach(p => p.classList.toggle('hidden', p.id !== pane));
    applyTheme(currentUser);
    if (currentUser.isAdmin) renderAdminPanel();
    $('settingsModal').classList.remove('hidden');
  }

  $('openProfileBtn').onclick = () => openSettings('paneProfile');
  $('openSettingsBtn').onclick = () => openSettings('paneProfile');
  $('closeSettingsBtn').onclick = () => $('settingsModal').classList.add('hidden');
  $('logoutBtn').onclick = () => { clearSession(); location.reload(); };

  document.querySelectorAll('.set-nav[data-pane]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.set-nav[data-pane]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.set-pane').forEach(p => p.classList.toggle('hidden', p.id !== btn.dataset.pane));
    };
  });

  $('editStatusSelect').onchange = e => {
    if (e.target.value !== 'custom') $('editStatus').value = e.target.value;
    else $('editStatus').focus();
  };

  document.querySelectorAll('.grad-dot').forEach(btn => {
    btn.onclick = () => { tempBanner = btn.dataset.grad; setBannerStyle($('previewBanner'), tempBanner); };
  });
  document.querySelectorAll('.c-dot').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.c-dot').forEach(d => d.classList.remove('active'));
      btn.classList.add('active');
      tempColor = btn.dataset.color;
    };
  });
// --- КОНЕЦ ЧАСТИ 3 ---
// --- НАЧАЛО ЧАСТИ 4 ---
  $('pickAvatarBtn').onclick = () => $('avatarInput').click();
  $('pickBannerBtn').onclick = () => $('bannerInput').click();

  $('avatarInput').onchange = e => {
    const file = e.target.files.item(0);
    if (file) compressImage(file, 220, url => { tempAva = url; setAvaStyle($('previewAvatar'), url); });
    e.target.value = '';
  };

  $('bannerInput').onchange = e => {
    const file = e.target.files.item(0);
    if (file) {
      if (file.type === 'image/gif') {
        const reader = new FileReader();
        reader.onload = ev => { tempBanner = ev.target.result; setBannerStyle($('previewBanner'), tempBanner); };
        reader.readAsDataURL(file);
      } else {
        compressImage(file, 700, url => { tempBanner = url; setBannerStyle($('previewBanner'), tempBanner); });
      }
    }
    e.target.value = '';
  };

  $('profileForm').onsubmit = async e => {
    e.preventDefault();
    Object.assign(currentUser, {
      nick: $('editNick').value.trim(), nickColor: tempColor,
      status: $('editStatus').value.trim() || 'В сети', bio: $('editBio').value.trim(),
      avatarImg: tempAva, banner: tempBanner
    });
    await saveUserDB(currentUser);
    updateMyUI();
    renderMessages();
    renderMembers();
    $('settingsModal').classList.add('hidden');
  };

  document.querySelectorAll('.theme-opt').forEach(btn => btn.onclick = async () => { currentUser.themeAccent = btn.dataset.accent; applyTheme(currentUser); await saveUserDB(currentUser); });
  document.querySelectorAll('.bg-opt').forEach(btn => btn.onclick = async () => { currentUser.bgTheme = btn.dataset.bg; applyTheme(currentUser); await saveUserDB(currentUser); });
  document.querySelectorAll('.font-opt').forEach(btn => btn.onclick = async () => { currentUser.msgSize = btn.dataset.size; applyTheme(currentUser); await saveUserDB(currentUser); });
  document.querySelectorAll('.shape-opt').forEach(btn => btn.onclick = async () => { currentUser.avaRadius = btn.dataset.radius; applyTheme(currentUser); await saveUserDB(currentUser); });
  document.querySelectorAll('.fx-opt').forEach(btn => btn.onclick = async () => { currentUser.fxMode = btn.dataset.fx; applyTheme(currentUser); await saveUserDB(currentUser); });
  document.querySelectorAll('.sound-opt').forEach(btn => btn.onclick = async () => { currentUser.soundPack = btn.dataset.sound; soundPack = btn.dataset.sound; applyTheme(currentUser); playSound('pop'); await saveUserDB(currentUser); });

  $('contactsForm').onsubmit = async e => {
    e.preventDefault();
    const newEmail = $('editEmail').value.trim().toLowerCase();
    const newPhone = normPhone($('editPhone').value);
    if (!newEmail && !newPhone) { playSound('error'); $('contactMsg').style.color = '#ff5252'; return ($('contactMsg').textContent = 'Оставьте хотя бы почту или телефон!'); }
    if (newEmail && accounts.some(a => a.id !== currentUser.id && a.email && a.email.toLowerCase() === newEmail)) { playSound('error'); $('contactMsg').style.color = '#ff5252'; return ($('contactMsg').textContent = 'Эта почта уже занята!'); }
    if (newPhone && accounts.some(a => a.id !== currentUser.id && a.phone && normPhone(a.phone) === newPhone)) { playSound('error'); $('contactMsg').style.color = '#ff5252'; return ($('contactMsg').textContent = 'Этот телефон уже занят!'); }
    currentUser.email = newEmail; currentUser.phone = newPhone;
    const { error } = await saveUserDB(currentUser);
    if (error) { playSound('error'); $('contactMsg').style.color = '#ff5252'; return ($('contactMsg').textContent = 'Ошибка сохранения: ' + error.message); }
    $('contactMsg').style.color = 'var(--green)'; $('contactMsg').textContent = 'Контакты сохранены в облаке!';
  };

  $('passForm').onsubmit = async e => {
    e.preventDefault();
    const oldP = $('oldPass').value.trim();
    const newP = $('newPass').value.trim();
    if (oldP !== (currentUser.pass || '').trim()) { playSound('error'); $('passMsg').style.color = '#ff5252'; return ($('passMsg').textContent = 'Неверный текущий пароль!'); }
    if (newP.length < 4) { playSound('error'); $('passMsg').style.color = '#ff5252'; return ($('passMsg').textContent = 'Новый пароль должен быть от 4 символов!'); }
    if (oldP === newP) { playSound('error'); $('passMsg').style.color = '#ff5252'; return ($('passMsg').textContent = 'Новый пароль совпадает со старым!'); }
    currentUser.pass = newP;
    const { error } = await saveUserDB(currentUser);
    if (error) { playSound('error'); $('passMsg').style.color = '#ff5252'; return ($('passMsg').textContent = 'Ошибка обновления: ' + error.message); }
    playSound('pop');
    $('passMsg').style.color = 'var(--green)';
    $('passMsg').textContent = 'Пароль успешно обновлён на сервере!';
    $('oldPass').value = '';
    $('newPass').value = '';
  };

  $('deleteAccBtn').onclick = async () => {
    if (currentUser.isAdmin) return alert('Главный аккаунт администратора нельзя удалить!');
    if (!confirm('Удалить аккаунт «' + currentUser.nick + '» навсегда?')) return;
    await sb.from('looma_users').delete().eq('id', currentUser.id);
    clearSession(); location.reload();
  };

  let mediaRec = null, audioChunks = [], recSec = 0, recInt = null, cachedMicStream = null;
  let micReleaseTimeout = null, pendingVoiceUrl = null;

  function releaseMicLater() {
    clearTimeout(micReleaseTimeout);
    micReleaseTimeout = setTimeout(() => {
      if (cachedMicStream) {
        cachedMicStream.getTracks().forEach(t => t.stop());
        cachedMicStream = null;
      }
    }, 60000);
  }

  $('cancelVoiceBtn').onclick = () => {
    pendingVoiceUrl = null;
    $('voicePreviewBar').classList.add('hidden');
    $('voicePreviewAudio').src = '';
  };

  $('voiceBtn').onclick = async () => {
    clearTimeout(micReleaseTimeout);
    if (mediaRec && mediaRec.state === 'recording') return mediaRec.stop();
    try {
      if (!cachedMicStream || !cachedMicStream.active) {
        cachedMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      mediaRec = new MediaRecorder(cachedMicStream); audioChunks = [];
      mediaRec.ondataavailable = e => audioChunks.push(e.data);
      mediaRec.onstop = () => {
        clearInterval(recInt); $('voiceBtn').classList.remove('recording'); $('recBadge').classList.add('hidden');
        releaseMicLater();
        const reader = new FileReader();
        reader.onload = ev => {
          pendingVoiceUrl = ev.target.result;
          $('voicePreviewAudio').src = pendingVoiceUrl;
          $('voicePreviewBar').classList.remove('hidden');
          $('messageInput').focus();
        };
        reader.readAsDataURL(new Blob(audioChunks, { type: 'audio/webm' }));
      };
      mediaRec.start(); recSec = 0; $('recTimer').textContent = '00:00';
      $('voiceBtn').classList.add('recording'); $('recBadge').classList.remove('hidden');
      recInt = setInterval(() => {
        recSec++;
        $('recTimer').textContent = String(Math.floor(recSec / 60)).padStart(2, '0') + ':' + String(recSec % 60).padStart(2, '0');
      }, 1000);
    } catch { playSound('error'); alert('Нет доступа к микрофону.'); }
  };
// --- КОНЕЦ ЧАСТИ 4 ---
// --- НАЧАЛО ЧАСТИ 5 ---
  let localStream = null, screenStream = null, micMuted = false, camOn = false, callStartTime = null;
  let ringInt = null, ringConnectTimer = null;

  function stopRingingUI() {
    clearInterval(ringInt);
    clearTimeout(ringConnectTimer);
    ringInt = null;
    ringConnectTimer = null;
    const tile = document.querySelector('#callStage .video-tile');
    if (tile) tile.classList.remove('is-ringing');
  }

  async function startCall(withVideo, roomName) {
    if (!roomName) roomName = 'Звонок';
    clearTimeout(micReleaseTimeout);
    stopRingingUI();
    try {
      closeMobilePanels();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!withVideo });
      camOn = !!withVideo; micMuted = false; callStartTime = null;

      $('callStage').classList.remove('hidden');
      $('callMiniStatus').classList.remove('hidden');
      $('callRoomLabel').textContent = roomName + ' • Вызов...';
      $('localCallName').innerHTML = escapeHTML(currentUser ? currentUser.nick : 'Вы') + '<span class="ring-badge" id="ringStatusTag">• Идут гудки...</span>';
      setAvaStyle($('localCallAva'), currentUser ? currentUser.avatarImg : null);
      $('toggleMicBtn').classList.add('active'); $('micMutedTag').classList.add('hidden');
      $('toggleCamBtn').classList.toggle('active', !!withVideo);
      if (withVideo) { $('localVideo').srcObject = localStream; $('localVideo').classList.remove('hidden'); $('localCallAva').classList.add('hidden'); }
      else { $('localVideo').classList.add('hidden'); $('localCallAva').classList.remove('hidden'); }

      const tile = document.querySelector('#callStage .video-tile');
      if (tile) tile.classList.add('is-ringing');
      playSound('ring');
      ringInt = setInterval(() => playSound('ring'), 2400);

      ringConnectTimer = setTimeout(() => {
        stopRingingUI();
        callStartTime = Date.now();
        playSound('call');
        $('callRoomLabel').textContent = roomName + ' • В эфире';
        $('localCallName').textContent = currentUser ? currentUser.nick : 'Вы';
      }, 4800);
    } catch { playSound('error'); alert('Нет доступа к микрофону или камере.'); }
  }

  function endCall() {
    stopRingingUI();
    if (localStream) { releaseMicLater(); localStream = null; }
    if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
    if (callStartTime && currentUser) {
      const mins = Math.max(1, Math.round((Date.now() - callStartTime) / 60000));
      pushMessage('system', 'завершил звонок продолжительностью ' + mins + ' мин.');
      callStartTime = null;
    }
    camOn = false;
    $('callStage').classList.add('hidden'); $('callMiniStatus').classList.add('hidden'); $('toggleScreenBtn').classList.remove('active');
  }

  $('startAudioCallBtn').onclick = () => startCall(false, '#' + activeChat);
  $('startVideoCallBtn').onclick = () => startCall(true, '#' + activeChat);
  $('hangupCallBtn').onclick = endCall; $('miniHangupBtn').onclick = endCall;

  $('inviteCallBtn').onclick = () => {
    const name = prompt('Кого пригласить? Введите ник:');
    if (name) pushMessage('system', 'пригласил пользователя ' + name + ' в звонок.');
  };

  $('toggleMicBtn').onclick = () => {
    if (!localStream) return;
    micMuted = !micMuted; localStream.getAudioTracks().forEach(t => (t.enabled = !micMuted));
    $('toggleMicBtn').classList.toggle('active', !micMuted); $('micMutedTag').classList.toggle('hidden', !micMuted);
  };

  $('toggleCamBtn').onclick = async () => {
    if (!localStream) return;
    if (camOn) {
      localStream.getVideoTracks().forEach(t => t.stop()); camOn = false;
      $('toggleCamBtn').classList.remove('active'); $('localVideo').classList.add('hidden'); $('localCallAva').classList.remove('hidden');
    } else {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
        localStream.addTrack(vStream.getVideoTracks());
        $('localVideo').srcObject = localStream;
        $('localVideo').classList.remove('hidden'); $('localCallAva').classList.add('hidden');
        camOn = true; $('toggleCamBtn').classList.add('active');
      } catch { playSound('error'); alert('Камера недоступна.'); }
    }
  };

  $('toggleScreenBtn').onclick = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop()); screenStream = null;
      $('toggleScreenBtn').classList.remove('active');
      $('localVideo').srcObject = camOn ? localStream : null;
      $('localVideo').classList.toggle('hidden', !camOn); $('localCallAva').classList.toggle('hidden', camOn);
      return;
    }
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      $('localVideo').srcObject = screenStream; $('localVideo').classList.remove('hidden'); $('localCallAva').classList.add('hidden');
      $('toggleScreenBtn').classList.add('active');
      screenStream.getVideoTracks().onended = () => {
        screenStream = null; $('toggleScreenBtn').classList.remove('active');
        $('localVideo').classList.toggle('hidden', !camOn); $('localCallAva').classList.toggle('hidden', camOn);
      };
    } catch {}
  };

  let editingChId = null, ctxTargetId = null, tempChImg = null, selectedChType = 'text', selectedChKind = 'group';

  async function saveChannelDB(ch) {
    await sb.from('looma_channels').upsert({
      id: ch.id, type: ch.type, kind: ch.kind, roles: ch.roles || {},
      icon_img: ch.iconImg || null, description: ch.desc || '',
      pinned: ch.pinned || null, pinned_idx: ch.pinnedIdx ?? null
    });
  }

  function canWrite(channel) {
    if (!currentUser || !channel) return false;
    if (channel.kind === 'group') return true;
    if (channel.kind === 'channel') {
      const role = channel.roles && channel.roles[currentUser.id];
      return role === 'owner' || role === 'admin' || currentUser.isAdmin;
    }
    return true;
  }

  function canManage(channel) {
    if (!currentUser || !channel) return false;
    if (currentUser.isAdmin) return true;
    const role = channel.roles && channel.roles[currentUser.id];
    return role === 'owner' || role === 'admin';
  }

  function setChPreviewStyle(el, img, isVoice) {
    if (!el) return;
    if (img) { el.style.backgroundImage = 'url(' + img + ')'; el.textContent = ''; }
    else { el.style.backgroundImage = 'none'; el.textContent = isVoice ? '🔊' : '#'; }
  }
// --- КОНЕЦ ЧАСТИ 5 ---
// --- НАЧАЛО ЧАСТИ 6 ---
  function switchSideTab(tab) {
    const isFriends = tab === 'friends';
    $('sideTabChats').classList.toggle('active', !isFriends);
    $('sideTabFriends').classList.toggle('active', isFriends);
    $('dockChatsBtn').classList.toggle('active', !isFriends);
    $('dockFriendsBtn').classList.toggle('active', isFriends);
    $('sideChatsPane').classList.toggle('hidden', isFriends);
    $('sideFriendsPane').classList.toggle('hidden', !isFriends);
    if (isFriends) renderFriendsTab();
  }

  $('sideTabChats').onclick = () => switchSideTab('chats');
  $('sideTabFriends').onclick = () => switchSideTab('friends');
  $('dockChatsBtn').onclick = () => { $('appRoot').classList.add('mob-list-view'); switchSideTab('chats'); };
  $('dockFriendsBtn').onclick = () => { $('appRoot').classList.add('mob-list-view'); switchSideTab('friends'); };
  $('heroFindFriendBtn').onclick = () => { $('appRoot').classList.add('mob-list-view'); switchSideTab('friends'); $('friendSearchInput').focus(); };
  $('heroCreateChatBtn').onclick = () => $('openCreateChBtn').click();

  $('mobileBackBtn').onclick = () => {
    $('appRoot').classList.add('mob-list-view');
    $('membersPanel').classList.add('hidden');
    $('mobileBackdrop').classList.add('hidden');
  };

  async function sendFriendRequestTo(targetUser) {
    if (!currentUser || !targetUser || targetUser.id === activeUserId) return;
    currentUser.friends = currentUser.friends || [];
    targetUser.friends = targetUser.friends || [];
    targetUser.friendRequests = targetUser.friendRequests || [];

    if (currentUser.friends.includes(targetUser.id)) {
      $('friendSearchMsg').style.color = 'var(--green)';
      return ($('friendSearchMsg').textContent = 'Вы уже друзья с ' + targetUser.nick);
    }
    if (targetUser.friendRequests.includes(activeUserId)) {
      $('friendSearchMsg').style.color = 'var(--green)';
      return ($('friendSearchMsg').textContent = 'Заявка для ' + targetUser.nick + ' уже отправлена ✓');
    }

    targetUser.friendRequests.push(activeUserId);
    const { error } = await saveUserDB(targetUser);
    if (error) {
      playSound('error');
      $('friendSearchMsg').style.color = '#ff5252';
      $('friendSearchMsg').textContent = 'Ошибка отправки заявки';
      return;
    }

    playSound('send');
    const btn = $('sendFriendReqBtn');
    const oldTxt = btn.textContent;
    btn.textContent = '✓';
    btn.style.transform = 'scale(1.15)';
    setTimeout(() => { btn.textContent = oldTxt; btn.style.transform = ''; }, 900);

    $('friendSearchMsg').style.color = 'var(--green)';
    $('friendSearchMsg').textContent = 'Заявка отправлена пользователю ' + targetUser.nick + ' ✓';
  }

  $('sendFriendReqBtn').onclick = async () => {
    const q = $('friendSearchInput').value.trim();
    if (!q) return;
    $('friendSearchMsg').textContent = 'Поиск...';
    await loadAllFromServer();
    const qLower = q.toLowerCase();
    const qPhone = normPhone(q);
    const found = accounts.find(u =>
      u.id !== activeUserId && (
        u.nick.toLowerCase() === qLower ||
        (u.phone && qPhone && normPhone(u.phone) === qPhone)
      )
    );
    if (!found) {
      playSound('error');
      $('friendSearchMsg').style.color = '#ff5252';
      return ($('friendSearchMsg').textContent = 'Пользователь не найден. Проверьте ник или телефон.');
    }
    $('friendSearchInput').value = '';
    await sendFriendRequestTo(found);
  };

  function updateReqBadges() {
    if (!currentUser) return;
    const reqs = (currentUser.friendRequests || []).filter(id => accounts.some(a => a.id === id));
    const cnt = reqs.length;
    $('reqCountBadge').textContent = cnt;
    $('reqCountBadge').classList.toggle('hidden', cnt === 0);
    $('dockReqBadge').textContent = cnt;
    $('dockReqBadge').classList.toggle('hidden', cnt === 0);
  }

  function renderFriendsTab() {
    if (!currentUser) return;
    updateReqBadges();

    const reqIds = (currentUser.friendRequests || []).filter(id => accounts.some(a => a.id === id));
    const reqBlock = $('incomingReqBlock');
    const reqList = $('incomingReqList');
    reqList.innerHTML = '';

    if (reqIds.length > 0) {
      reqBlock.classList.remove('hidden');
      reqIds.forEach(fromId => {
        const u = accounts.find(a => a.id === fromId);
        if (!u) return;
        const card = document.createElement('div');
        card.className = 'req-card';
        const avaStyle = u.avatarImg ? 'background-image:url(' + u.avatarImg + ')' : '';
        card.innerHTML =
          '<div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">' +
            '<div class="mem-ava" style="' + avaStyle + '">' + (u.avatarImg ? '' : USER_SVG) + '</div>' +
            '<div style="min-width:0;">' +
              '<div class="mem-name" style="color:' + (u.nickColor || '#fff') + '">' + escapeHTML(u.nick) + '</div>' +
              '<div class="muted-sm">Хочет в друзья</div>' +
            '</div>' +
          '</div>' +
          '<div class="req-actions">' +
            '<button type="button" class="btn-accept" title="Принять">✓</button>' +
            '<button type="button" class="btn-decline" title="Отклонить">✕</button>' +
          '</div>';

        card.querySelector('.btn-accept').onclick = async () => {
          card.classList.add('accepted-flash');
          playSound('login');
          currentUser.friendRequests = (currentUser.friendRequests || []).filter(id => id !== u.id);
          currentUser.friends = currentUser.friends || [];
          if (!currentUser.friends.includes(u.id)) currentUser.friends.push(u.id);
          u.friends = u.friends || [];
          if (!u.friends.includes(activeUserId)) u.friends.push(activeUserId);
          await Promise.all([saveUserDB(currentUser), saveUserDB(u)]);
          setTimeout(() => { renderFriendsTab(); renderChannels(); }, 280);
        };

        card.querySelector('.btn-decline').onclick = async () => {
          currentUser.friendRequests = (currentUser.friendRequests || []).filter(id => id !== u.id);
          await saveUserDB(currentUser);
          renderFriendsTab();
        };

        reqList.appendChild(card);
      });
    } else {
      reqBlock.classList.add('hidden');
    }

    const friendIds = (currentUser.friends || []).filter(id => accounts.some(a => a.id === id));
    $('friendsCountLabel').textContent = friendIds.length;
    const fList = $('friendsList');
    fList.innerHTML = '';

    if (friendIds.length === 0) {
      fList.innerHTML =
        '<div class="side-empty-card">' +
          '<b>У вас пока не добавлен ни один друг</b>' +
          'Введите точный ник или телефон друга в поле выше, чтобы отправить заявку!' +
        '</div>';
      return;
    }

    friendIds.forEach(fid => {
      const u = accounts.find(a => a.id === fid);
      if (!u) return;
      const item = document.createElement('div');
      item.className = 'mem-item mem-row-custom';
      const avaStyle = u.avatarImg ? 'background-image:url(' + u.avatarImg + ')' : '';
      const ownerBadge = u.isAdmin ? '<span class="role-badge role-owner">Владелец</span>' : '';
      item.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">' +
          '<div class="mem-ava" style="' + avaStyle + '">' + (u.avatarImg ? '' : USER_SVG) + '</div>' +
          '<div style="min-width:0;">' +
            '<div class="mem-name" style="color:' + (u.nickColor || '#fff') + '">' + escapeHTML(u.nick) + ' ' + ownerBadge + '</div>' +
            '<div class="mem-stat">' + escapeHTML(u.status || 'В сети') + '</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn-sec" style="padding:4px 9px;font-size:12px;">ЛС</button>';

      item.querySelector('button').onclick = async e => {
        e.stopPropagation();
        viewingUser = u;
        $('dmUserBtn').click();
      };
      item.onclick = () => openUserProfile(u);
      fList.appendChild(item);
    });
  }

  function updateEmptyHeroState() {
    const myChs = getMyChannels();
    const cur = myChs.find(c => c.id === activeChat && c.type !== 'voice');
    const hasActive = !!cur;

    $('emptyChatHero').classList.toggle('hidden', hasActive);
    $('chatHeader').classList.toggle('hidden', !hasActive);
    $('messages').classList.toggle('hidden', !hasActive);
    $('inputBox').classList.toggle('hidden', !hasActive);
    if (!hasActive) {
      $('pinnedBar').classList.add('hidden');
      $('membersPanel').classList.add('hidden');
      const fCount = (currentUser && currentUser.friends ? currentUser.friends.length : 0);
      $('emptyHeroSub').textContent = myChs.length === 0 && fCount === 0
        ? 'У вас пока не создано ни одного чата и не добавлен ни один друг. Начните общение прямо сейчас!'
        : 'Выберите чат или друга слева, чтобы начать переписку!';
    }
  }

  function renderChannels() {
    $('chatList').innerHTML = ''; $('voiceList').innerHTML = '';
    const myChs = getMyChannels();
    const textChs = myChs.filter(c => c.type !== 'voice');
    const voiceChs = myChs.filter(c => c.type === 'voice');

    if (textChs.length === 0) {
      $('chatList').innerHTML =
        '<div class="side-empty-card">' +
          '<b>У вас пока не создано ни одного чата</b>' +
          'Нажмите <b>«+»</b> на панели слева или добавьте друга во вкладке <b>«Друзья»</b>.' +
        '</div>';
    }

    $('voiceGroupLabel').classList.toggle('hidden', voiceChs.length === 0);

    myChs.forEach(ch => {
      const el = document.createElement('div');
      const isVoice = ch.type === 'voice';
      el.className = 'ch-item' + (!isVoice && ch.id === activeChat ? ' active' : '');
      const avaStyle = ch.iconImg ? 'background-image:url(' + ch.iconImg + ')' : '';
      const avaText = ch.iconImg ? '' : (isVoice ? '🔊' : '#');
      const lockIcon = ch.kind === 'channel' && !canWrite(ch) ? ' 🔒' : '';
el.innerHTML = '' + avaText + '' + escapeHTML(ch.id) + lockIcon + '';
el.onclick = () => {
if (isVoice) {
$('appRoot').classList.remove('mob-list-view');
updateEmptyHeroState();
return startCall(false, ch.id);
}
activeChat = ch.id;
$('appRoot').classList.remove('mob-list-view');
renderChannels(); renderMessages(); renderMembers(); closeMobilePanels();
};
el.oncontextmenu = e => {
e.preventDefault(); ctxTargetId = ch.id;
$('ctxManageMembers').classList.toggle('hidden', !canManage(ch));
$('chContextMenu').style.left = Math.min(e.clientX, window.innerWidth - 205) + 'px';
$('chContextMenu').style.top = Math.min(e.clientY, window.innerHeight - 190) + 'px';
$('chContextMenu').classList.remove('hidden');
};
(isVoice ? $('voiceList') : $('chatList')).appendChild(el);
});
updateEmptyHeroState();
const cur = myChs.find(c => c.id === activeChat && c.type !== 'voice');
if (!cur) return;
setChPreviewStyle($('currentChatIco'), cur.iconImg, cur.type === 'voice');
$('currentChatName').textContent = cur.id;
$('currentChatDesc').textContent = cur.desc || '';
const writeAllowed = canWrite(cur);
$('messageForm').classList.toggle('hidden', !writeAllowed);
$('noWriteAlert').classList.toggle('hidden', writeAllowed);
if (writeAllowed) $('messageInput').placeholder = 'Написать в #' + cur.id + '...';
$('openManageBtn').style.display = canManage(cur) ? 'inline-flex' : 'none';
updatePinnedBar();
}
let managingChatId = null;
$('openManageBtn').onclick = () => {
if (!activeChat) return;
managingChatId = activeChat;
const ch = channels.find(c => c.id === managingChatId);
if (!ch) return;
$('manageChName').textContent = 'Чат: #' + ch.id;
$('addMemberSearchInput').value = '';
renderManageList();
$('manageMembersModal').classList.remove('hidden');
};
$('addMemberSearchInput').oninput = renderManageList;
function renderManageList() {
const ch = channels.find(c => c.id === managingChatId);
if (!ch) return;
const query = $('addMemberSearchInput').value.trim().toLowerCase();
const list = $('manageMembersList'); list.innerHTML = '';
let usersToShow = [];
let hint = '';
if (query === '') {
const friendIds = currentUser.friends || [];
usersToShow = accounts.filter(u => friendIds.includes(u.id) && (!ch.roles || !ch.roles[u.id]));
hint = usersToShow.length === 0 ? 'У вас нет друзей, которых можно добавить (или они уже в чате). Введите ник для поиска.' : 'Ваши друзья:';
} else {
usersToShow = accounts.filter(u =>
u.nick.toLowerCase() === query ||
(u.phone && normPhone(u.phone) === normPhone(query))
);
hint = usersToShow.length === 0 ? 'Никого не найдено. Введите точный ник или телефон.' : 'Результаты поиска:';
}
if (hint) list.innerHTML = '' + hint + '';
usersToShow.forEach(u => {
const isMember = ch.roles && ch.roles[u.id];
const row = document.createElement('div');
row.className = 'mem-item mem-row-custom';
const actions = !isMember
? 'Добавить'
: 'Уже в чате';
row.innerHTML =
'' + (u.avatarImg ? '' : USER_SVG) + '' +
'' +
'' + escapeHTML(u.nick) + '' +
'' + escapeHTML(u.phone || 'нет телефона') + '' +
'' +
'' + actions + '';
const addBtn = row.querySelector('[data-add]');
if (addBtn) addBtn.onclick = async () => {
ch.roles = ch.roles || {};
ch.roles[u.id] = 'member';
await saveChannelDB(ch); renderManageList(); renderMembers(); playSound('send');
};
list.appendChild(row);
});
}
$('closeManageBtn').onclick = () => $('manageMembersModal').classList.add('hidden');
$('ctxManageMembers').onclick = () => {
if (ctxTargetId) { activeChat = ctxTargetId; $('openManageBtn').click(); }
};
let viewingUser = null;
$('closeViewUserBtn').onclick = () => $('viewUserModal').classList.add('hidden');
$('addFriendBtn').onclick = async () => {
if (!viewingUser || viewingUser.id === activeUserId) return;
currentUser.friends = currentUser.friends || [];
const isFriend = currentUser.friends.includes(viewingUser.id);
if (isFriend) {
currentUser.friends = currentUser.friends.filter(id => id !== viewingUser.id);
viewingUser.friends = (viewingUser.friends || []).filter(id => id !== activeUserId);
$('addFriendBtn').textContent = 'В друзья';
$('addFriendBtn').style.color = 'var(--green)';
await Promise.all([saveUserDB(currentUser), saveUserDB(viewingUser)]);
renderFriendsTab();
} else {
await sendFriendRequestTo(viewingUser);
$('addFriendBtn').textContent = 'Заявка отправлена ✓';
$('addFriendBtn').style.color = 'var(--green)';
}
};
function openUserProfile(u) {
if (!u) return;
viewingUser = u;
$('viewNick').textContent = u.nick; $('viewNick').style.color = u.nickColor || '#ffffff';
$('viewAdminBadge').textContent = 'Владелец';
$('viewAdminBadge').classList.toggle('hidden', !u.isAdmin);
$('viewStatus').textContent = u.status || 'В сети'; $('viewBio').textContent = u.bio || 'Нет описания';
setAvaStyle($('viewAvatar'), u.avatarImg); setBannerStyle($('viewBanner'), u.banner);
$('dmUserBtn').classList.toggle('hidden', u.id === activeUserId);
if (u.id === activeUserId) {
$('addFriendBtn').classList.add('hidden');
} else {
$('addFriendBtn').classList.remove('hidden');
const isFriend = currentUser.friends && currentUser.friends.includes(u.id);
const isSent = u.friendRequests && u.friendRequests.includes(activeUserId);
$('addFriendBtn').textContent = isFriend ? 'Удалить из друзей' : (isSent ? 'Заявка отправлена ✓' : 'В друзья');
$('addFriendBtn').style.color = isFriend ? '#ff5252' : 'var(--green)';
}
$('viewUserModal').classList.remove('hidden');
}
function renderMembers() {
const q = $('memberSearchInput').value.trim().toLowerCase();
const list = $('membersList'); list.innerHTML = '';
const ch = channels.find(c => c.id === activeChat);
if (!ch) return;
const all = accounts.filter(u => u.nick.toLowerCase().includes(q));
list.innerHTML = 'УЧАСТНИКИ — ' + Object.keys(ch.roles || {}).length + '';
all.forEach(u => {
const isMember = ch.roles && ch.roles[u.id];
if (!isMember) return;
const item = document.createElement('div'); item.className = 'mem-item';
const avaStyle = u.avatarImg ? 'background-image:url(' + u.avatarImg + ')' : '';
const avaText = u.avatarImg ? '' : USER_SVG;
const role = ch.roles && ch.roles[u.id];
let roleBadge = '';
if (u.isAdmin || role === 'owner') roleBadge = 'Владелец';
else if (role === 'admin') roleBadge = 'Админ';
item.innerHTML =
'' + avaText + '' +
'' +
'' + escapeHTML(u.nick) + ' ' + roleBadge + '' +
'' + escapeHTML(u.status || 'В сети') + '' +
'';
item.onclick = () => { closeMobilePanels(); openUserProfile(u); };
list.appendChild(item);
});
}
// --- КОНЕЦ ЧАСТИ 6 ---
// --- НАЧАЛО ЧАСТИ 7 ---
  function renderMessages() {
    const box = $('messages'); box.innerHTML = '';
    if (!activeChat) return;
    const msgs = chatsData[activeChat] || [];
    const ch = channels.find(c => c.id === activeChat);

    msgs.forEach((m, idx) => {
      if (m.type === 'system') {
        const sys = document.createElement('div');
        sys.className = 'sys-row';
        sys.innerHTML = '<div class="sys-ico">' + CALL_SVG + '</div><div><b>' + escapeHTML(m.author) + '</b> ' + escapeHTML(m.content) + ' <span class="sys-time">' + m.time + '</span></div>';
        box.appendChild(sys);
        return;
      }

      const row = document.createElement('div');
      row.className = 'msg-row';
      row.dataset.msgIdx = idx;
      const authorAcc = accounts.find(a => a.id === m.userId);
      const actualAva = authorAcc ? authorAcc.avatarImg : m.avatarImg;
      const actualColor = authorAcc ? authorAcc.nickColor : (m.nickColor || '#fff');
      const isGlobalOwner = (authorAcc && authorAcc.isAdmin) || m.isAdmin;

      const role = ch && ch.roles ? ch.roles[m.userId] : null;
      let roleBadge = '';
      if (isGlobalOwner || role === 'owner') roleBadge = '<span class="role-badge role-owner">Владелец</span>';
      else if (role === 'admin') roleBadge = '<span class="role-badge role-admin">Админ</span>';

      const avaPart = '<div class="msg-ava" style="' + (actualAva ? 'background-image:url(' + actualAva + ')' : '') + '">' + (actualAva ? '' : USER_SVG) + '</div>';
      const topPart =
        '<div class="msg-top">' +
          '<span class="msg-author" style="color:' + actualColor + '">' + escapeHTML(m.author) + '</span>' +
          roleBadge +
          '<span class="msg-time">' + m.time + '</span>' +
        '</div>';
      const quotePart = m.reply ? '<div class="msg-quote">↩ ' + escapeHTML(m.reply) + '</div>' : '';

      let contentHtml = '';
      if (m.type === 'sticker') contentHtml = '<div class="msg-sticker">' + m.content + '</div>';
      else if (m.type === 'image') contentHtml = '<img class="msg-media" data-zoom src="' + m.content + '" alt="media">';
      else if (m.type === 'video') contentHtml = '<video class="msg-media" controls src="' + m.content + '"></video>';
      else if (m.type === 'audio') {
        const heights = Array.from({ length: 24 }, (_, i) => 30 + ((i * 37) % 65));
        const bars = heights.map(h => '<div class="vp-bar" style="height:' + h + '%"></div>').join('');
        contentHtml = '<div class="voice-player"><button type="button" class="vp-play">▶</button><div class="vp-wave">' + bars + '</div><span class="vp-time">0:00</span><audio preload="metadata" src="' + m.content + '"></audio></div>';
      }
      else contentHtml = '<div class="msg-text">' + escapeHTML(m.content) + '</div>';

      const reactsHtml = m.reactions ? Object.entries(m.reactions).map(([em, users]) => {
        if (!Array.isArray(users) || !users.length) return '';
        const mineCls = users.includes(activeUserId) ? ' mine' : '';
        return '<button type="button" class="react-pill' + mineCls + '" data-em="' + em + '">' + em + ' ' + users.length + '</button>';
      }).join('') : '';
      const reactsBlock = reactsHtml ? '<div class="reactions-row">' + reactsHtml + '</div>' : '';

      row.innerHTML = avaPart + '<div class="msg-body">' + topPart + quotePart + contentHtml + reactsBlock + '</div>';

      const openAuthor = () => { if (authorAcc) openUserProfile(authorAcc); };
      row.querySelector('.msg-ava').onclick = openAuthor;
      row.querySelector('.msg-author').onclick = openAuthor;

      row.oncontextmenu = e => { e.preventDefault(); openMsgMenu(e.clientX, e.clientY, idx); };
      let pressTimer = null;
      row.addEventListener('touchstart', e => { const t = e.touches; pressTimer = setTimeout(() => { if (t) openMsgMenu(t.clientX, t.clientY, idx); }, 450); }, { passive: true });
      row.addEventListener('touchend', () => clearTimeout(pressTimer));
      row.addEventListener('touchmove', () => clearTimeout(pressTimer));

      const zoomImg = row.querySelector('[data-zoom]');
      if (zoomImg) zoomImg.onclick = () => { $('lightboxImg').src = m.content; $('lightboxModal').classList.remove('hidden'); };
      row.querySelectorAll('.react-pill').forEach(p => p.onclick = () => toggleReaction(m, p.dataset.em));

      const vp = row.querySelector('.voice-player');
      if (vp) {
        const aud = vp.querySelector('audio'), btn = vp.querySelector('.vp-play'), tm = vp.querySelector('.vp-time'), bars = vp.querySelectorAll('.vp-bar'), wave = vp.querySelector('.vp-wave');
        const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
        aud.onloadedmetadata = () => { tm.textContent = fmt(aud.duration); };
        btn.onclick = () => {
          if (aud.paused) {
            document.querySelectorAll('.voice-player audio').forEach(a => { if (a !== aud) a.pause(); });
            aud.play(); btn.textContent = '⏸';
          } else { aud.pause(); btn.textContent = '▶'; }
        };
        aud.onpause = () => { btn.textContent = '▶'; };
        aud.onended = () => { btn.textContent = '▶'; bars.forEach(b => b.classList.remove('active')); tm.textContent = fmt(aud.duration); };
        aud.ontimeupdate = () => {
          tm.textContent = fmt(aud.currentTime);
          const pct = aud.duration ? aud.currentTime / aud.duration : 0;
          const activeCount = Math.floor(pct * bars.length);
          bars.forEach((b, i) => b.classList.toggle('active', i <= activeCount));
        };
        wave.onclick = e => {
          if (!aud.duration) return;
          const rect = wave.getBoundingClientRect();
          aud.currentTime = ((e.clientX - rect.left) / rect.width) * aud.duration;
        };
      }
      box.appendChild(row);
    });
    box.scrollTop = box.scrollHeight;
  }

  $('messageForm').onsubmit = async e => {
    e.preventDefault();
    if (!activeChat) return;
    const ch = channels.find(c => c.id === activeChat);
    if (!canWrite(ch)) return;

    if (pendingVoiceUrl) {
      const vData = pendingVoiceUrl;
      pendingVoiceUrl = null;
      $('voicePreviewBar').classList.add('hidden');
      $('voicePreviewAudio').src = '';
      await pushMessage('audio', vData);
    }

    let txt = $('messageInput').value.trim();
    if (!txt) return;
    if (txt === '/roll') txt = '🎲 Выбросил число: ' + (Math.floor(Math.random() * 100) + 1);
    else if (txt === '/coin') txt = '🪙 Монетка: ' + (Math.random() < 0.5 ? 'Орёл!' : 'Решка!');
    else if (txt === '/shrug') txt = '¯\\_(ツ)_/¯';
    $('messageInput').value = '';
    await pushMessage('text', txt);
  };

  async function pushMessage(type, content) {
    if (!currentUser || !activeChat) return;
    $('typingIndicator').classList.add('hidden');
    const newMsg = {
      chat_id: activeChat, user_id: activeUserId, is_admin: !!currentUser.isAdmin,
      author: currentUser.nick, nick_color: currentUser.nickColor, avatar_img: currentUser.avatarImg,
      type: type, content: content, time_str: formatFullTime(), reply: replyTo, reactions: {}
    };
    replyTo = null; $('replyBar').classList.add('hidden');
    const { data } = await sb.from('looma_messages').insert(newMsg).select().single();
    if (data) {
      chatsData[activeChat] = chatsData[activeChat] || [];
      if (!chatsData[activeChat].some(x => x.dbId === data.id)) chatsData[activeChat].push(mapMsgFromDB(data));
      renderMessages();
      if (type !== 'system') playSound('send');
    }
  }
// --- КОНЕЦ ЧАСТИ 7 ---
// --- НАЧАЛО ЧАСТИ 8 ---
  document.querySelectorAll('.ch-kind').forEach(b => b.onclick = () => {
    document.querySelectorAll('.ch-kind').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); selectedChKind = b.dataset.kind;
  });
  document.querySelectorAll('.ch-type').forEach(b => b.onclick = () => {
    document.querySelectorAll('.ch-type').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); selectedChType = b.dataset.type;
  });

  $('pickChImgBtn').onclick = () => $('chImgInput').click();
  $('chImgInput').onchange = e => {
    const file = e.target.files.item(0);
    if (file) compressImage(file, 160, url => { tempChImg = url; setChPreviewStyle($('chImgPreview'), url, false); });
    e.target.value = '';
  };
  $('clearChImgBtn').onclick = () => { tempChImg = null; setChPreviewStyle($('chImgPreview'), null, false); };
  $('closeChModalBtn').onclick = () => { $('channelModal').classList.add('hidden'); tempChImg = null; };

  $('openCreateChBtn').onclick = () => {
    closeMobilePanels(); editingChId = null; tempChImg = null;
    $('chModalTitle').textContent = 'Новый чат'; $('saveChBtn').textContent = 'Создать';
    $('chNameInput').value = ''; $('chDescInput').value = '';
    document.querySelectorAll('.ch-kind').forEach(b => b.classList.toggle('active', b.dataset.kind === 'group'));
    document.querySelectorAll('.ch-type').forEach(b => b.classList.toggle('active', b.dataset.type === 'text'));
    selectedChKind = 'group'; selectedChType = 'text';
    setChPreviewStyle($('chImgPreview'), null, false);
    $('channelModal').classList.remove('hidden');
  };

  $('channelForm').onsubmit = async e => {
    e.preventDefault();
    const newId = $('chNameInput').value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!newId) return;
    if (editingChId) {
      const ch = channels.find(c => c.id === editingChId);
      if (ch) {
        if (newId !== editingChId) {
          await sb.from('looma_channels').delete().eq('id', editingChId);
          chatsData[newId] = chatsData[editingChId] || [];
          delete chatsData[editingChId];
          if (activeChat === editingChId) activeChat = newId;
          ch.id = newId;
        }
        ch.iconImg = tempChImg; ch.desc = $('chDescInput').value.trim(); ch.type = selectedChType; ch.kind = selectedChKind;
        await saveChannelDB(ch);
      }
    } else {
      if (channels.some(c => c.id === newId)) { playSound('error'); return alert('Чат с таким названием уже занят!'); }
      const newCh = { id: newId, type: selectedChType, kind: selectedChKind, roles: { [activeUserId]: 'owner' }, iconImg: tempChImg, desc: $('chDescInput').value.trim(), pinned: null, pinnedIdx: null };
      channels.push(newCh);
      await saveChannelDB(newCh);
      if (selectedChType !== 'voice') {
        chatsData[newId] = [];
        activeChat = newId;
        $('appRoot').classList.remove('mob-list-view');
      }
    }
    switchSideTab('chats');
    renderChannels(); renderMessages(); $('channelModal').classList.add('hidden');
  };

  $('ctxEditCh').onclick = () => {
    const ch = channels.find(c => c.id === ctxTargetId);
    if (!ch) return;
    editingChId = ch.id; tempChImg = ch.iconImg || null;
    selectedChKind = ch.kind || 'group'; selectedChType = ch.type || 'text';
    $('chModalTitle').textContent = 'Изменить чат'; $('saveChBtn').textContent = 'Сохранить';
    $('chNameInput').value = ch.id; $('chDescInput').value = ch.desc || '';
    document.querySelectorAll('.ch-kind').forEach(b => b.classList.toggle('active', b.dataset.kind === selectedChKind));
    document.querySelectorAll('.ch-type').forEach(b => b.classList.toggle('active', b.dataset.type === selectedChType));
    setChPreviewStyle($('chImgPreview'), tempChImg, ch.type === 'voice');
    $('channelModal').classList.remove('hidden');
  };

  $('ctxClearCh').onclick = async () => {
    if (ctxTargetId && confirm('Очистить историю сообщений на сервере?')) {
      await sb.from('looma_messages').delete().eq('chat_id', ctxTargetId);
      chatsData[ctxTargetId] = [];
      if (activeChat === ctxTargetId) renderMessages();
    }
  };

  $('ctxDeleteCh').onclick = async () => {
    if (!ctxTargetId) return;
    if (!confirm('Удалить этот чат навсегда?')) return;
    await sb.from('looma_channels').delete().eq('id', ctxTargetId);
    channels = channels.filter(c => c.id !== ctxTargetId); delete chatsData[ctxTargetId];
    if (activeChat === ctxTargetId) {
      const nextCh = getMyChannels().find(c => c.type !== 'voice');
      activeChat = nextCh ? nextCh.id : null;
      if (!activeChat) $('appRoot').classList.add('mob-list-view');
    }
    renderChannels(); renderMessages(); $('chContextMenu').classList.add('hidden');
  };

  let replyTo = null, ctxMsgIndex = null;
  function updatePinnedBar() {
    const cur = channels.find(c => c.id === activeChat);
    if (cur && cur.pinned) { $('pinnedText').textContent = cur.pinned; $('pinnedBar').classList.remove('hidden'); }
    else $('pinnedBar').classList.add('hidden');
  }
  $('pinnedBar').onclick = () => {
    const cur = channels.find(c => c.id === activeChat);
    if (!cur || cur.pinnedIdx == null) return;
    const target = $('messages').querySelector('[data-msg-idx="' + cur.pinnedIdx + '"]');
    if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.style.background = 'rgba(124, 77, 255, 0.25)'; setTimeout(() => target.style.background = '', 1200); }
  };
  $('unpinBtn').onclick = async e => { e.stopPropagation(); const cur = channels.find(c => c.id === activeChat); if (cur) { cur.pinned = null; cur.pinnedIdx = null; await saveChannelDB(cur); updatePinnedBar(); } };

  async function toggleReaction(m, emoji) {
    if (!activeUserId || !m) return; m.reactions = m.reactions || {};
    if (!Array.isArray(m.reactions[emoji])) m.reactions[emoji] = [];
    const idx = m.reactions[emoji].indexOf(activeUserId);
    if (idx === -1) m.reactions[emoji].push(activeUserId); else { m.reactions[emoji].splice(idx, 1); if (!m.reactions[emoji].length) delete m.reactions[emoji]; }
    playSound('pop'); renderMessages();
    if (m.dbId) await sb.from('looma_messages').update({ reactions: m.reactions }).eq('id', m.dbId);
  }

  function openMsgMenu(x, y, idx) {
    const m = (chatsData[activeChat] || [])[idx];
    if (!m || m.type === 'system') return;
    ctxMsgIndex = idx;
    $('ctxMsgDel').classList.toggle('hidden', !(m.userId === activeUserId || (currentUser && currentUser.isAdmin)));
    $('msgContextMenu').style.left = Math.min(x, window.innerWidth - 210) + 'px';
    $('msgContextMenu').style.top = Math.min(y, window.innerHeight - 190) + 'px';
    $('msgContextMenu').classList.remove('hidden');
  }

  document.querySelectorAll('#msgContextMenu .ctx-reacts button').forEach(btn => {
    btn.onclick = () => { const m = (chatsData[activeChat] || [])[ctxMsgIndex]; if (m) toggleReaction(m, btn.dataset.em); };
  });
  $('ctxMsgReply').onclick = () => {
    const m = (chatsData[activeChat] || [])[ctxMsgIndex];
    if (!m) return;
    replyTo = m.author + ': ' + (m.type === 'text' ? m.content : '[' + m.type + ']');
    $('replyAuthor').textContent = m.author; $('replyPreview').textContent = m.type === 'text' ? m.content : m.type;
    $('replyBar').classList.remove('hidden'); $('messageInput').focus();
  };
  $('ctxMsgPin').onclick = async () => {
    const m = (chatsData[activeChat] || [])[ctxMsgIndex];
    const cur = channels.find(c => c.id === activeChat);
    if (m && cur) { cur.pinned = m.author + ': ' + (m.type === 'text' ? m.content : '[' + m.type + ']'); cur.pinnedIdx = ctxMsgIndex; await saveChannelDB(cur); updatePinnedBar(); }
  };
  $('ctxMsgDel').onclick = async () => {
    const msgs = chatsData[activeChat] || [];
    const target = msgs[ctxMsgIndex];
    if (target) {
      if (target.dbId) await sb.from('looma_messages').delete().eq('id', target.dbId);
      msgs.splice(ctxMsgIndex, 1); renderMessages();
    }
  };

  $('lightboxModal').onclick = () => $('lightboxModal').classList.add('hidden');
  $('cancelReplyBtn').onclick = () => { replyTo = null; $('replyBar').classList.add('hidden'); };
  document.addEventListener('click', () => { $('chContextMenu').classList.add('hidden'); $('msgContextMenu').classList.add('hidden'); });

  const STICKER_CATS = {
    games: ['🎮', '👾', '🏆', '⚔️', '🛡️', '🎯', '🎲', '🕹️', '🐉', '👑', '💎', '🚀'],
    faces: ['😎', '😂', '🥳', '🤯', '🥶', '😈', '👻', '🤖', '💀', '👽', '🤡', '🫡'],
    symbols: ['🔥', '⚡', '💥', '💯', '❤️', '💔', '✨', '🌈', '🎉', '⚠️', '✅', '❌']
  };
  function renderStickers(cat) {
    if (!cat) cat = 'games';
    $('stickerGrid').innerHTML = '';
    (STICKER_CATS[cat] || STICKER_CATS.games).forEach(em => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sticker-item'; b.textContent = em;
      b.onclick = () => { pushMessage('sticker', em); $('stickerPicker').classList.add('hidden'); };
      $('stickerGrid').appendChild(b);
    });
  }
  renderStickers('games');
  document.querySelectorAll('.st-tab').forEach(tab => {
    tab.onclick = e => { e.stopPropagation(); document.querySelectorAll('.st-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); renderStickers(tab.dataset.cat); };
  });
  $('stickerBtn').onclick = e => { e.stopPropagation(); $('stickerPicker').classList.toggle('hidden'); };
  document.addEventListener('click', e => { if (!$('stickerPicker').contains(e.target) && e.target !== $('stickerBtn')) $('stickerPicker').classList.add('hidden'); });

  function handleFileUpload(f) {
    if (!f) return;
    if (f.type.startsWith('image/')) compressImage(f, 800, url => pushMessage('image', url));
    else if (f.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = ev => pushMessage('video', ev.target.result);
      reader.readAsDataURL(f);
    }
  }
  $('attachBtn').onclick = () => $('mediaInput').click();$('mediaInput').onchange = e => { handleFileUpload(e.target.files.item(0)); e.target.value = ''; };
document.addEventListener('paste', e => { const imgItem = (e.clipboardData ? Array.from(e.clipboardData.items) : []).find(i => i.type.startsWith('image/')); if (imgItem) handleFileUpload(imgItem.getAsFile()); });
$('memberSearchInput').oninput = renderMembers;
$('dmUserBtn').onclick = async () => {
if (!viewingUser) return;
const dmId = 'лс-' + [currentUser.nick, viewingUser.nick].sort().join('-').toLowerCase().replace(/\s+/g, '-');
if (!channels.some(c => c.id === dmId)) {
const newDm = { id: dmId, type: 'text', kind: 'group', roles: { [activeUserId]: 'owner', [viewingUser.id]: 'member' }, iconImg: viewingUser.avatarImg || null, desc: 'Личный чат', pinned: null, pinnedIdx: null };
channels.push(newDm); chatsData[dmId] = [];
await saveChannelDB(newDm);
}
activeChat = dmId;
$('appRoot').classList.remove('mob-list-view');
switchSideTab('chats');
renderChannels(); renderMessages(); renderMembers(); $('viewUserModal').classList.add('hidden');
};
$('soundToggleBtn').onclick = () => { soundOn = !soundOn; $('soundToggleBtn').classList.toggle('active', soundOn); if (soundOn) playSound('click'); };
$('membersToggleBtn').onclick = () => {
const isHidden = $('membersPanel').classList.toggle('hidden');
$('membersToggleBtn').classList.toggle('active', !isHidden);
if (window.innerWidth <= 768) $('mobileBackdrop').classList.toggle('hidden', isHidden);
};
let typingTimer = null, lastTypingSent = 0;
function showTyping(nick) {
$('typingText').textContent = nick + ' печатает...';
$('typingIndicator').classList.remove('hidden');
clearTimeout(typingTimer);
typingTimer = setTimeout(() => $('typingIndicator').classList.add('hidden'), 2600);
}
function showNotification(title, text, chatId, openFriends) {
playSound('receive');
const container = $('toastContainer');
if (container) {
const toast = document.createElement('div');
toast.className = 'looma-toast';
toast.innerHTML = '' + escapeHTML(title) + '' + escapeHTML(text) + '';
toast.onclick = () => {
if (openFriends) {
$('appRoot').classList.add('mob-list-view');
switchSideTab('friends');
} else if (chatId && getMyChannels().some(c => c.id === chatId)) {
activeChat = chatId;
$('appRoot').classList.remove('mob-list-view');
switchSideTab('chats');
renderChannels(); renderMessages(); renderMembers();
}
toast.remove();
};
container.appendChild(toast);
setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4200);
}
if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
new Notification(title, { body: text });
}
}
if ('Notification' in window && Notification.permission === 'default') {
document.addEventListener('click', () => Notification.requestPermission(), { once: true });
}
const realtimeRoom = sb.channel('looma_live_room');
realtimeRoom
.on('broadcast', { event: 'typing' }, ({ payload }) => {
if (payload && payload.chatId === activeChat && payload.userId !== activeUserId) {
showTyping(payload.nick);
}
})
.on('postgres_changes', { event: '', schema: 'public', table: 'looma_messages' }, payload => {
if (payload.eventType === 'INSERT') {
const msg = mapMsgFromDB(payload.new);
const isMyChat = getMyChannels().some(c => c.id === msg.chatId);
if (!isMyChat) return;
chatsData[msg.chatId] = chatsData[msg.chatId] || [];
if (!chatsData[msg.chatId].some(x => x.dbId === msg.dbId)) {
chatsData[msg.chatId].push(msg);
if (msg.chatId === activeChat) renderMessages();
if (msg.userId !== activeUserId && msg.type !== 'system') {
showNotification(msg.author + ' (#' + msg.chatId + ')', msg.type === 'text' ? msg.content : '[' + msg.type + ']', msg.chatId, false);
}
}
} else if (payload.eventType === 'UPDATE') {
const msg = mapMsgFromDB(payload.new);
const arr = chatsData[msg.chatId] || [];
const i = arr.findIndex(x => x.dbId === msg.dbId);
if (i !== -1) { arr[i] = msg; if (msg.chatId === activeChat) renderMessages(); }
} else if (payload.eventType === 'DELETE') {
Object.keys(chatsData).forEach(cid => {
chatsData[cid] = (chatsData[cid] || []).filter(x => x.dbId !== payload.old.id);
});
renderMessages();
}
})
.on('postgres_changes', { event: '', schema: 'public', table: 'looma_channels' }, async () => {
await loadAllFromServer(); renderChannels(); renderMembers();
})
.on('postgres_changes', { event: '*', schema: 'public', table: 'looma_users' }, async () => {
const prevReqs = currentUser ? (currentUser.friendRequests || []) : [];
await loadAllFromServer();
if (activeUserId) {
currentUser = accounts.find(a => a.id === activeUserId) || currentUser;
updateMyUI();
renderFriendsTab();
const newReqs = (currentUser.friendRequests || []).filter(id => !prevReqs.includes(id));
if (newReqs.length > 0) {
const sender = accounts.find(a => a.id === newReqs);
if (sender) showNotification('Новая заявка в друзья', sender.nick + ' хочет добавить вас в друзья', null, true);
}
}
renderMembers(); renderMessages();
})
.subscribe();
$('messageInput').addEventListener('input', () => {
if (!currentUser || !activeChat || Date.now() - lastTypingSent < 1500) return;
lastTypingSent = Date.now();
realtimeRoom.send({ type: 'broadcast', event: 'typing', payload: { chatId: activeChat, userId: activeUserId, nick: currentUser.nick } });
});
if (currentUser) enterLooma(currentUser, true);
loadAllFromServer().then(() => {
const savedId = getSavedSessionId();
if (savedId) {
const freshUser = accounts.find(a => a.id === savedId);
if (freshUser) {
currentUser = freshUser;
if ($('appRoot').classList.contains('hidden')) enterLooma(freshUser, true);
else { updateMyUI(); renderChannels(); renderFriendsTab(); renderMessages(); renderMembers(); }
}
}
});
});
// --- КОНЕЦ ЧАСТИ 8 ---