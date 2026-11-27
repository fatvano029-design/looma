'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.newchat = (() => {
  const { $, esc, icon, initials } = App.utils;
  let createType = 'group';
  let picked = [];
  let avaData = null;

  function isEn() { return localStorage.getItem('looma_lang') === 'en'; }

  function open() {
    createType = 'group';
    picked = [];
    avaData = null;
    const en = isEn();
    const back = $('modalback');
    back.classList.add('open');
    back.innerHTML =
      '<div id="newchatmodal" style="animation:popFade .2s ease;">' +
        '<div class="fhead" style="flex-direction:column;align-items:stretch;gap:10px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span>' + (en ? 'Create Group or Channel' : 'Создать группу или канал') + '</span>' +
            '<button class="iconbtn" id="ncCloseBtn" style="width:28px;height:28px;">' + icon('close') + '</button>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;background:rgba(0,0,0,0.2);padding:4px;border-radius:12px;">' +
            '<button type="button" class="nc-type-btn" data-t="group" style="padding:8px 6px;border:none;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer;background:var(--accent,#7c4dff);color:#fff;">' + (en ? 'Group' : 'Группа') + '</button>' +
            '<button type="button" class="nc-type-btn" data-t="channel" style="padding:8px 6px;border:none;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer;background:transparent;color:var(--grey);">' + (en ? 'Channel' : 'Канал') + '</button>' +
          '</div>' +
        '</div>' +
        '<div style="padding:10px 14px;display:flex;flex-direction:column;gap:10px;">' +
          '<div style="display:flex;align-items:center;gap:12px;">' +
            '<div id="ncAvaPick" title="Выбрать аватарку" style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#6c47ff,#00d2ff);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:#fff;cursor:pointer;flex-shrink:0;overflow:hidden;">📷</div>' +
            '<input type="file" id="ncAvaFile" accept="image/*" style="display:none">' +
            '<input id="ncName" placeholder="' + (en ? 'Group name' : 'Название группы') + '" maxlength="60" style="flex:1;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--text);">' +
          '</div>' +
          '<input id="ncBio" placeholder="' + (en ? 'Description (optional)' : 'Описание (необязательно)') + '" maxlength="140" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--text);">' +
        '</div>' +
        '<div class="ncsearch"><input id="ncSearch" placeholder="' + (en ? 'Add members (optional)…' : 'Добавить участников (необязательно)…') + '" autocomplete="off"></div>' +
        '<div class="flist" id="ncResults"><div class="ncempty">' + (en ? 'You can create it solo and add people later via +' : 'Можно создать одному, а людей добавить позже через +') + '</div></div>' +
        '<div class="ncfoot">' +
          '<span id="ncCount">' + (en ? '0 selected' : 'Выбрано: 0') + '</span>' +
          '<button class="authbtn" id="ncCreate">' + (en ? 'Create group' : 'Создать группу') + '</button>' +
        '</div>' +
      '</div>';

    $('ncCloseBtn').addEventListener('click', close);
    $('ncAvaPick').addEventListener('click', () => $('ncAvaFile').click());
    $('ncAvaFile').addEventListener('change', e => {
      const f = e.target.files && e.target.files;
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        avaData = r.result;
        $('ncAvaPick').innerHTML = '<img src="' + avaData + '" style="width:100%;height:100%;object-fit:cover;">';
      };
      r.readAsDataURL(f);
    });

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
    }, 250);
  }

  function renderResults(users) {
    const list = $('ncResults');
    const en = isEn();
    if (!list) return;
    if (!users.length) {
      list.innerHTML = '<div class="ncempty">' + (en ? 'No users found' : 'Пользователи не найдены') + '</div>';
      return;
    }
    list.innerHTML = '';
    users.forEach(u => {
      const row = App.utils.el(
        '<div class="nrow' + (picked.includes(u.username) ? ' picked' : '') + '" data-u="' + esc(u.username) + '">' +
          '<div class="avatar a44" style="background:' + esc(u.color || '#5682a3') + '">' +
            initials(u.name) + '</div>' +
          '<div class="ninfo"><div class="nname">' + esc(u.name) + '</div>' +
            '<div class="nsub">@' + esc(u.username) + '</div></div>' +
          '<span class="ncheck">' + icon('check', 'sm') + '</span>' +
        '</div>');
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
      const d = await App.api.createChat({ type: createType, name, bio, avatar: avaData, memberUsernames: picked });
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
