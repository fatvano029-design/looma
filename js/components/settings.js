/* ================= components/newchat.js — start a real conversation (RU / EN) ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.newchat = (() => {
  const { $, esc, icon, initials } = App.utils;
  let groupMode = false;
  let picked = [];

  function isEn() {
    return localStorage.getItem('looma_lang') === 'en';
  }

  function open() {
    groupMode = false;
    picked = [];
    const en = isEn();
    const back = $('modalback');
    back.classList.add('open');
    back.innerHTML =
      '<div id="newchatmodal">' +
        '<div class="fhead">' +
          '<span id="ncHeadTitle">' + (en ? 'New chat' : 'Новый чат') + '</span>' +
          '<button class="nctoggle" id="ncToggle">' + (en ? 'New group' : 'Новая группа') + '</button>' +
        '</div>' +
        '<div id="ncGroupName" style="display:none">' +
          '<input id="ncName" placeholder="' + (en ? 'Group name' : 'Название группы') + '" maxlength="60">' +
        '</div>' +
        '<div class="ncsearch"><input id="ncSearch" placeholder="' + (en ? 'Search people…' : 'Поиск пользователей…') + '" autocomplete="off"></div>' +
        '<div class="flist" id="ncResults"><div class="ncempty">' + (en ? 'Type to search registered users' : 'Введите имя или @username для поиска') + '</div></div>' +
        '<div class="ncfoot" id="ncFoot" style="display:none">' +
          '<span id="ncCount">' + (en ? '0 selected' : 'Выбрано: 0') + '</span>' +
          '<button class="authbtn" id="ncCreate">' + (en ? 'Create group' : 'Создать группу') + '</button>' +
        '</div>' +
      '</div>';

    $('ncToggle').addEventListener('click', () => {
      groupMode = !groupMode;
      picked = [];
      $('ncHeadTitle').textContent = groupMode
        ? (en ? 'New group' : 'Новая группа')
        : (en ? 'New chat' : 'Новый чат');
      $('ncToggle').textContent = groupMode
        ? (en ? 'New DM' : 'Личный чат')
        : (en ? 'New group' : 'Новая группа');
      $('ncGroupName').style.display = groupMode ? '' : 'none';
      $('ncFoot').style.display = groupMode ? '' : 'none';
      $('ncCount').textContent = en ? '0 selected' : 'Выбрано: 0';
      renderResults([]);
      $('ncSearch').value = '';
      $('ncSearch').focus();
    });
    $('ncSearch').addEventListener('input', e => search(e.target.value.trim()));
    $('ncCreate').addEventListener('click', createGroup);
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
    list.innerHTML = '';
    users.forEach(u => {
      const row = App.utils.el(
        '<div class="nrow' + (picked.includes(u.username) ? ' picked' : '') + '" data-u="' + esc(u.username) + '">' +
          '<div class="avatar a44" style="background:' + esc(u.color || '#5682a3') + '">' +
            initials(u.name) + '</div>' +
          '<div class="ninfo"><div class="nname">' + esc(u.name) +
            (u.bot ? ' <span class="botbadge">бот</span>' : '') + '</div>' +
            '<div class="nsub">@' + esc(u.username) + '</div></div>' +
          (groupMode ? '<span class="ncheck">' + icon('check', 'sm') + '</span>' : '') +
        '</div>');
      row.addEventListener('click', () => {
        if (groupMode) {
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

  async function createGroup() {
    const en = isEn();
    const name = $('ncName').value.trim();
    if (!name) { App.utils.toast(en ? 'Enter a group name' : 'Введите название группы'); return; }
    if (!picked.length) { App.utils.toast(en ? 'Pick at least one member' : 'Выберите хотя бы одного участника'); return; }
    try {
      const d = await App.api.createChat({ type: 'group', name, memberUsernames: picked });
      await App.store.loadChats();
      App.components.chatlist.render(App.store.state.filter);
      close();
      App.components.chatview.open(d.chat.id);
      App.utils.toast(en ? 'Group created' : 'Группа создана');
    } catch (e) {
      App.utils.toast(e.message);
    }
  }

  return { open, close };
})();
