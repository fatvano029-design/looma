// --- НАЧАЛО ЧАСТИ 1 ---
document.addEventListener('DOMContentLoaded', async () => {
  const SUPABASE_URL = 'https://supabase.co';
  const SUPABASE_KEY = 'sb_publishable_XPa7Dr__c_5QhmKd7zlu_w_qoJq470P';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = id => document.getElementById(id);
  const normPhone = p => (p || '').replace(/[^\d+]/g, '');

  const USER_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const CALL_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  let soundOn = true;
  let soundPack = 'cyber';
  let currentUser = null;
  let accounts = [];
  let channels = [];
  let chatsData = {};
  let activeChat = 'общий-чат';

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
    friends: Array.isArray(r.friends) ? r.friends : []
  });

  const mapUserToDB = u => ({
    id: u.id, is_admin: !!u.isAdmin, nick: u.nick, email: u.email || null, phone: u.phone || null, pass: u.pass,
    nick_color: u.nickColor, theme_accent: u.themeAccent, bg_theme: u.bgTheme, sound_pack: u.soundPack,
    msg_size: u.msgSize, ava_radius: u.avaRadius, fx_mode: u.fxMode, status: u.status, bio: u.bio,
    avatar_img: u.avatarImg, banner: u.banner, friends: u.friends || []
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

  async function saveUserDB(u) { await sb.from('looma_users').upsert(mapUserToDB(u)); }

  async function loadAllFromServer() {
    const [uRes, cRes, mRes] = await Promise.all([
      sb.from('looma_users').select('*'),
      sb.from('looma_channels').select('*').order('created_at', { ascending: true }),
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
    if (!channels.some(c => c.id === activeChat && c.type !== 'voice')) {
      activeChat = channels.find(c => c.type !== 'voice')?.id || 'общий-чат';
    }
  }

  await loadAllFromServer();
// --- КОНЕЦ ЧАСТИ 1 ---
// --- НАЧАЛО ЧАСТИ 2 ---
  let activeUserId = localStorage.getItem('looma_session_v2') || null;
  currentUser = accounts.find(a => a.id === activeUserId) || null;
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

  function enterLooma(user) {
    activeUserId = user.id;
    currentUser = user;
    localStorage.setItem('looma_session_v2', user.id);
    applyTheme(currentUser);
    updateMyUI();
    renderChannels();
    renderMessages();
    renderMembers();
    $('authOverlay').classList.add('hidden');
    $('appRoot').classList.remove('hidden');
    const splash = $('welcomeSplash');
    if (splash) {
      $('welcomeUserNick').textContent = '@' + user.nick;
      splash.classList.remove('hidden');
      setTimeout(() => splash.classList.add('hidden'), 1700);
    }
    playSound('login');
  }

  $('authForm').onsubmit = async e => {
    e.preventDefault();
    const rawLogin = $('authLogin').value.trim();
    const pass = $('authPass').value;

    if (isRegister) {
      const email = rawLogin.toLowerCase();
      const phone = normPhone($('authRegPhone').value);
      const nick = $('authNick').value.trim();
      if (!email && !phone) { playSound('error'); return ($('authError').textContent = 'Укажите хотя бы почту или телефон!'); }
      if (email && accounts.some(a => a.email === email)) { playSound('error'); return ($('authError').textContent = 'Эта почта уже привязана!'); }
      if (phone && accounts.some(a => a.phone === phone)) { playSound('error'); return ($('authError').textContent = 'Этот телефон уже привязан!'); }
      if (accounts.some(a => a.nick.toLowerCase() === nick.toLowerCase())) { playSound('error'); return ($('authError').textContent = 'Никнейм занят!'); }

      const newUser = {
        id: 'u_' + Date.now(), isAdmin: false, nick: nick, email: email, phone: phone, pass: pass,
        nickColor: '#ffffff', themeAccent: '#00e676', bgTheme: 'default', soundPack: 'cyber',
        msgSize: '15px', avaRadius: '50%', fxMode: 'neon',
        status: 'В сети', bio: '', avatarImg: null, banner: 'linear-gradient(135deg,#1b2838,#7c4dff)', friends: []
      };
      accounts.push(newUser);
      await saveUserDB(newUser);
      enterLooma(newUser);
    } else {
      const qLower = rawLogin.toLowerCase();
      const qPhone = normPhone(rawLogin);
      const found = accounts.find(a =>
        (a.email && a.email === qLower) ||
        (a.phone && qPhone && a.phone === qPhone) ||
        a.nick.toLowerCase() === qLower
      );
      if (!found || found.pass !== pass) { playSound('error'); return ($('authError').textContent = 'Неверные данные входа или пароль!'); }
      enterLooma(found);
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
  $('logoutBtn').onclick = () => { localStorage.removeItem('looma_session_v2'); location.reload(); };

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
    if (newEmail && accounts.some(a => a.id !== currentUser.id && a.email === newEmail)) { playSound('error'); $('contactMsg').style.color = '#ff5252'; return ($('contactMsg').textContent = 'Эта почта уже занята!'); }
    if (newPhone && accounts.some(a => a.id !== currentUser.id && a.phone === newPhone)) { playSound('error'); $('contactMsg').style.color = '#ff5252'; return ($('contactMsg').textContent = 'Этот телефон уже занят!'); }
    currentUser.email = newEmail; currentUser.phone = newPhone;
    await saveUserDB(currentUser);
    $('contactMsg').style.color = 'var(--green)'; $('contactMsg').textContent = 'Контакты сохранены в облаке!';
  };

  $('passForm').onsubmit = async e => {
    e.preventDefault();
    const oldP = $('oldPass').value;
    const newP = $('newPass').value.trim();
    if (oldP !== currentUser.pass) { playSound('error'); $('passMsg').style.color = '#ff5252'; return ($('passMsg').textContent = 'Неверный текущий пароль!'); }
    if (newP.length < 4) { playSound('error'); $('passMsg').style.color = '#ff5252'; return ($('passMsg').textContent = 'Новый пароль должен быть от 4 символов!'); }
    if (oldP === newP) { playSound('error'); $('passMsg').style.color = '#ff5252'; return ($('passMsg').textContent = 'Новый пароль совпадает со старым!'); }
    currentUser.pass = newP;
    await saveUserDB(currentUser);
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
    localStorage.removeItem('looma_session_v2'); location.reload();
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

  async function startCall(withVideo, roomName) {
    if (!roomName) roomName = 'Звонок';
    clearTimeout(micReleaseTimeout);
    try {
      closeMobilePanels();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!withVideo });
      camOn = !!withVideo; micMuted = false; callStartTime = Date.now();
      playSound('call');
      $('callStage').classList.remove('hidden'); $('callMiniStatus').classList.remove('hidden');
      $('callRoomLabel').textContent = roomName; $('localCallName').textContent = currentUser ? currentUser.nick : 'Вы';
      setAvaStyle($('localCallAva'), currentUser ? currentUser.avatarImg : null);
      $('toggleMicBtn').classList.add('active'); $('micMutedTag').classList.add('hidden');
      $('toggleCamBtn').classList.toggle('active', !!withVideo);
      if (withVideo) { $('localVideo').srcObject = localStream; $('localVideo').classList.remove('hidden'); $('localCallAva').classList.add('hidden'); }
      else { $('localVideo').classList.add('hidden'); $('localCallAva').classList.remove('hidden'); }
    } catch { playSound('error'); alert('Нет доступа к микрофону или камере.'); }
  }

  function endCall() {
    if (localStream) { releaseMicLater(); localStream = null; }
    if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
    if (callStartTime && currentUser) {
      const mins = Math.max(1, Math.round((Date.now() - callStartTime) / 60000));
      pushMessage('system', 'начал звонок продолжительностью ' + mins + ' мин.');
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
  function renderChannels() {
    $('chatList').innerHTML = ''; $('voiceList').innerHTML = '';
    channels.forEach(ch => {
      const el = document.createElement('div');
      const isVoice = ch.type === 'voice';
      el.className = 'ch-item' + (!isVoice && ch.id === activeChat ? ' active' : '');
      const avaStyle = ch.iconImg ? 'background-image:url(' + ch.iconImg + ')' : '';
      const avaText = ch.iconImg ? '' : (isVoice ? '🔊' : '#');
      const lockIcon = ch.kind === 'channel' && !canWrite(ch) ? ' 🔒' : '';

      el.innerHTML = '<div class="ch-left"><div class="ch-ava" style="' + avaStyle + '">' + avaText + '</div><span class="ch-name">' + escapeHTML(ch.id) + lockIcon + '</span></div>';

      el.onclick = () => {
        if (isVoice) return startCall(false, ch.id);
        activeChat = ch.id; renderChannels(); renderMessages(); renderMembers(); closeMobilePanels();
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

    const cur = channels.find(c => c.id === activeChat) || channels[0];
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

    if (hint) list.innerHTML = '<div class="muted-sm" style="padding:10px 8px;">' + hint + '</div>';

    usersToShow.forEach(u => {
      const isMember = ch.roles && ch.roles[u.id];
      const row = document.createElement('div');
      row.className = 'mem-item mem-row-custom';

      const actions = !isMember
        ? '<button class="btn-sec" style="padding: 4px 10px; font-size:12px;" data-add="' + u.id + '">Добавить</button>'
        : '<span class="muted-sm" style="color:var(--green)">Уже в чате</span>';

      row.innerHTML =
        '<div class="mem-ava" style="' + (u.avatarImg ? 'background-image:url(' + u.avatarImg + ')' : '') + '">' + (u.avatarImg ? '' : USER_SVG) + '</div>' +
        '<div style="min-width:0; flex:1; margin-left:8px;">' +
          '<div class="mem-name" style="color:' + (u.nickColor || '#fff') + '">' + escapeHTML(u.nick) + '</div>' +
          '<div class="muted-sm">' + escapeHTML(u.phone || 'нет телефона') + '</div>' +
        '</div>' +
        '<div class="mem-actions" style="align-items:center;">' + actions + '</div>';

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
    if (!currentUser.friends) currentUser.friends = [];

    const isFriend = currentUser.friends.includes(viewingUser.id);
    if (isFriend) {
      currentUser.friends = currentUser.friends.filter(id => id !== viewingUser.id);
      $('addFriendBtn').textContent = 'В друзья';
      $('addFriendBtn').style.color = 'var(--green)';
    } else {
      currentUser.friends.push(viewingUser.id);
      $('addFriendBtn').textContent = 'Удалить из друзей';
      $('addFriendBtn').style.color = '#ff5252';
      playSound('receive');
    }
    await saveUserDB(currentUser);
  };

  function openUserProfile(u) {
    if (!u) return;
    viewingUser = u;
    $('viewNick').textContent = u.nick; $('viewNick').style.color = u.nickColor || '#ffffff';
    $('viewAdminBadge').classList.toggle('hidden', !u.isAdmin);
    $('viewStatus').textContent = u.status || 'В сети'; $('viewBio').textContent = u.bio || 'Нет описания';
    setAvaStyle($('viewAvatar'), u.avatarImg); setBannerStyle($('viewBanner'), u.banner);
    $('dmUserBtn').classList.toggle('hidden', u.id === activeUserId);

    if (u.id === activeUserId) {
      $('addFriendBtn').classList.add('hidden');
    } else {
      $('addFriendBtn').classList.remove('hidden');
      const isFriend = currentUser.friends && currentUser.friends.includes(u.id);
      $('addFriendBtn').textContent = isFriend ? 'Удалить из друзей' : 'В друзья';
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
    list.innerHTML = '<div class="mem-group">УЧАСТНИКИ — ' + Object.keys(ch.roles || {}).length + '</div>';

    all.forEach(u => {
      const isMember = ch.roles && ch.roles[u.id];
      if (!isMember && !canManage(ch)) return;

      const item = document.createElement('div'); item.className = 'mem-item';
      const avaStyle = u.avatarImg ? 'background-image:url(' + u.avatarImg + ')' : '';
      const avaText = u.avatarImg ? '' : USER_SVG;
      const role = ch.roles && ch.roles[u.id];

      let roleBadge = '';
      if (role === 'owner') roleBadge = '<span class="role-badge role-owner">Владелец</span>';
      else if (role === 'admin') roleBadge = '<span class="role-badge role-admin">Админ</span>';

      item.innerHTML =
        '<div class="mem-ava" style="' + avaStyle + '">' + avaText + '</div>' +
        '<div style="min-width:0; flex:1; margin-left: 8px;">' +
          '<div class="mem-name" style="color:' + (u.nickColor || '#fff') + '">' + escapeHTML(u.nick) + ' ' + roleBadge + '</div>' +
          '<div class="mem-stat">' + escapeHTML(u.status || 'В сети') + '</div>' +
        '</div>';

      item.onclick = () => { closeMobilePanels(); openUserProfile(u); };
      list.appendChild(item);
    });
  }
// --- КОНЕЦ ЧАСТИ 6 ---
// --- НАЧАЛО ЧАСТИ 7 ---
  function renderMessages() {
    const box = $('messages'); box.innerHTML = '';
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

      const role = ch && ch.roles ? ch.roles[m.userId] : null;
      let roleBadge = '';
      if (role === 'owner') roleBadge = '<span class="role-badge role-owner">Владелец</span>';
      else if (role === 'admin') roleBadge = '<span class="role-badge role-admin">Админ</span>';

      const avaPart = '<div class="msg-ava" style="' + (actualAva ? 'background-image:url(' + actualAva + ')' : '') + '">' + (actualAva ? '' : USER_SVG) + '</div>';
      const topPart =
        '<div class="msg-top">' +
          '<span class="msg-author" style="color:' + actualColor + '">' + escapeHTML(m.author) + '</span>' +
          roleBadge +
          (m.isAdmin && !roleBadge ? '<span class="admin-badge">ADMIN</span>' : '') +
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
      row.addEventListener('touchstart', e => { const t = e.touches[0]; pressTimer = setTimeout(() => { if (t) openMsgMenu(t.clientX, t.clientY, idx); }, 450); }, { passive: true });
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
    if (!currentUser) return;
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
      if (channels.some(c => c.id === newId)) { playSound('error'); return alert('Чат уже существует!'); }
      const newCh = { id: newId, type: selectedChType, kind: selectedChKind, roles: { [activeUserId]: 'owner' }, iconImg: tempChImg, desc: $('chDescInput').value.trim(), pinned: null, pinnedIdx: null };
      channels.push(newCh);
      await saveChannelDB(newCh);
      if (selectedChType !== 'voice') { chatsData[newId] = []; activeChat = newId; }
    }
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
    const textChs = channels.filter(c => c.type !== 'voice');
    if (textChs.length <= 1 && ctxTargetId === textChs.id) { playSound('error'); return alert('Нельзя удалить последний текстовый чат!'); }
    if (!confirm('Удалить этот чат навсегда?')) return;
    await sb.from('looma_channels').delete().eq('id', ctxTargetId);
    channels = channels.filter(c => c.id !== ctxTargetId); delete chatsData[ctxTargetId];
    if (activeChat === ctxTargetId) activeChat = channels.find(c => c.type !== 'voice')?.id || '';
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
  $('attachBtn').onclick = () => $('mediaInput').click();
$('mediaInput').onchange = e => { handleFileUpload(e.target.files.item(0)); e.target.value = ''; };
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
activeChat = dmId; renderChannels(); renderMessages(); renderMembers(); $('viewUserModal').classList.add('hidden');
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
function showNotification(title, text, chatId) {
playSound('receive');
const container = $('toastContainer');
if (container) {
const toast = document.createElement('div');
toast.className = 'looma-toast';
toast.innerHTML = '' + escapeHTML(title) + '' + escapeHTML(text) + '';
toast.onclick = () => {
if (chatId && channels.some(c => c.id === chatId)) { activeChat = chatId; renderChannels(); renderMessages(); renderMembers(); }
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
chatsData[msg.chatId] = chatsData[msg.chatId] || [];
if (!chatsData[msg.chatId].some(x => x.dbId === msg.dbId)) {
chatsData[msg.chatId].push(msg);
if (msg.chatId === activeChat) renderMessages();
if (msg.userId !== activeUserId && msg.type !== 'system') {
showNotification(msg.author + ' (#' + msg.chatId + ')', msg.type === 'text' ? msg.content : '[' + msg.type + ']', msg.chatId);
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
await loadAllFromServer();
if (activeUserId) { currentUser = accounts.find(a => a.id === activeUserId) || currentUser; updateMyUI(); }
renderMembers(); renderMessages();
})
.subscribe();
$('messageInput').addEventListener('input', () => {
if (!currentUser || Date.now() - lastTypingSent < 1500) return;
lastTypingSent = Date.now();
realtimeRoom.send({ type: 'broadcast', event: 'typing', payload: { chatId: activeChat, userId: activeUserId, nick: currentUser.nick } });
});
if (currentUser) enterLooma(currentUser);
});
// --- КОНЕЦ ЧАСТИ 8 ---