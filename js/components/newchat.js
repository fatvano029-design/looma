/* ================= components/newchat.js — DM, Group & Channel Creator ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.newchat = (() => {
  const { $, esc, icon, initials } = App.utils;
  let createType = 'dm'; // 'dm' | 'group' | 'channel'
  let picked = [];

  function isEn() {
    return localStorage.getItem('looma_lang') === 'en';
  }

  function open() {
    createType = 'dm';
    picked = [];
    const en = isEn();
    const back = $('modalback');
    back.classList.add('open');
    back.innerHTML =
      '<div id="newchatmodal">' +
        '<div class="fhead" style="flex-direction:column;align-items:stretch;gap:10px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span id="ncHeadTitle">' + (en ? 'New conversation' : 'Создать общение') + '</span>' +
            '<button class="iconbtn" id="ncCloseBtn" style="width:28px;height:28px;">' + icon('close') + '</button>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;background:rgba(0,0,0,0.2);padding:4px;border-radius:12px;">' +
            '<button type="button" class="nc-type-btn" data-t="dm" style="padding:7px 6px;border:none;border-radius:9px;font-weight:700;font-size:12px;cursor:pointer;background:var(--accent,#7c4dff);color:#fff;">' + (en ? 'Chat' : 'Чат') + '</button>' +
            '<button type="button" class="nc-type-btn" data-t="group" style="padding:7px 6px;border:none;border-radius:9px;font-weight:700;font-size:12px;cursor:pointer;background:transparent;color:var(--grey);">' + (en ? 'Group' : 'Группа') + '</button>' +
            '<button type="button" class="nc-type-btn" data-t="channel" style="padding:7px 6px;border:none;border-radius:9px;font-weight:700;font-size:12px;cursor:pointer;background:transparent;color:var(--grey);">' + (en ? 'Channel' : 'Канал') + '</button>' +
          '</div>' +
        '</div>' +
        '<div id="ncGroupName" style="display:none;padding:0 12px 8px;">' +
          '<input id="ncName" placeholder="' + (en ? 'Group name' : 'Название группы') + '" maxlength="60">' +
        '</div>' +
        '<div class="ncsearch"><input id="ncSearch" placeholder="' + (en ? 'Search people…' : 'Поиск пользователей по @username…') + '" autocomplete="off"></div>' +
        '<div class="flist" id="ncResults"><div class="ncempty">' + (en ? 'Type to search registered users' : 'Введите имя или @username для поиска') + '</div></div>' +
        '<div class="ncfoot" id="ncFoot" style="display:none">' +
          '<span id="ncCount">' + (en ? '0 selected' : 'Выбрано: 0') + '</span>' +
          '<button class="authbtn" id="ncCreate">' + (en ? 'Create' : 'Создать') + '</button>' +
        '</div>' +
      '</div>';

    $('ncCloseBtn').addEventListener('click', close);

    back.querySelectorAll('.nc-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        createType = btn.dataset.t;
        picked = [];
        back.querySelectorAll('.nc-type-btn').forEach(b => {
          const active = b.dataset.t === createType;
          b.style.background = active ? 'var(--accent,#7c4dff)' : 'transparent';
          b.style.color = active ? '#fff' : 'var(--grey)';
        });

        const isMulti = createType === 'group' || createType === 'channel';
        $('ncGroupName').style.display = isMulti ? '' : 'none';
        $('ncFoot').style.display = isMulti ? '' : 'none';

        if (createType === 'channel') {
          $('ncName').placeholder = en ? 'Channel name' : 'Название канала';
          $('ncCreate').textContent = en ? 'Create channel' : 'Создать канал';
          $('ncCount').textContent = en ? 'Subscribers (optional)' : 'Подписчики (необязательно)';
        } else if (createType === 'group') {
          $('ncName').placeholder = en ? 'Group name' : 'Название группы';
          $('ncCreate').textContent = en ? 'Create group' : 'Создать группу';
          $('ncCount').textContent = en ? '0 selected' : 'Выбрано: 0';
        }
        renderResults([]);
        $('ncSearch').value = '';
        (isMulti ? $('ncName') : $('ncSearch')).focus();
      });
    });

    $('ncSearch').addEventListener('input', e => search(e.target.value.trim()));
    $('ncCreate').addEventListener('click', createMulti);
    back.onclick = ev => { if (ev.target === back) close(); };
    setTimeout(() => $('ncSearch').focus(), 50);
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
    const isMulti = createType === 'group' || createType === 'channel';
    list.innerHTML = '';
    users.forEach(u => {
      const row = App.utils.el(
        '<div class="nrow' + (picked.includes(u.username) ? ' picked' : '') + '" data-u="' + esc(u.username) + '">' +
          '<div class="avatar a44" style="background:' + esc(u.color || '#5682a3') + '">' +
            initials(u.name) + '</div>' +
          '<div class="ninfo"><div class="nname">' + esc(u.name) + '</div>' +
            '<div class="nsub">@' + esc(u.username) + '</div></div>' +
          (isMulti ? '<span class="ncheck">' + icon('check', 'sm') + '</span>' : '') +
        '</div>');
      row.addEventListener('click', () => {
        if (isMulti) {
          const i = picked.indexOf(u.username);
          if (i >= 0) picked.splice(i, 1); else picked.push(u.username);
          $('ncCount').textContent = en ? (picked.length + ' selected') : ('Выбрано: ' + picked.length);
          renderResults(users);
        } else {
          startDm(u.username);
        }
      });
      list.appendChild(row);
    });
  }

  async function startDm(username) {
    try {
      const d = await App.api.createChat({ type: 'dm', username });
      await App.store.loadChats();
      App.components.chatlist.render(App.store.state.filter);
      close();
      App.components.chatview.open(d.chat.id);
    } catch (e) {
      App.utils.toast(e.message);
    }
  }

  async function createMulti() {
    const en = isEn();
    const name = $('ncName').value.trim();
    const isChan = createType === 'channel';
    if (!name) {
      App.utils.toast(isChan ? (en ? 'Enter channel name' : 'Введите название канала') : (en ? 'Enter group name' : 'Введите название группы'));
      return;
    }
    if (!isChan && !picked.length) {
      App.utils.toast(en ? 'Pick at least one member' : 'Выберите хотя бы одного участника');
      return;
    }
    try {
      const d = await App.api.createChat({ type: createType, name, memberUsernames: picked });
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
