/* ================= components/chatlist.js — Left Panel + People & Channels Search ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.chatlist = (() => {
  const { $, esc, icon, initials } = App.utils;
  let globalUsers = [];
  let globalRooms = [];
  let searchTimer = null;

  function isEn() { return localStorage.getItem('looma_lang') === 'en'; }

  function avaHtml(item, cls) {
    if (item.avatar) {
      return '<div class="avatar ' + cls + '" style="background-image:url(' + item.avatar + ');background-size:cover;background-position:center;color:transparent;">' + initials(item.name) + '</div>';
    }
    return '<div class="avatar ' + cls + '" style="background:' + esc(item.color || '#6c47ff') + '">' + initials(item.name) + '</div>';
  }

  function snippetHtml(chat, lm) {
    if (!lm) return '<span class="snippet">' + esc(chat.subtitle || '') + '</span>';
    let s = esc(lm.kind === 'text' ? lm.text : kindLabel(lm));
    if (lm.from === (App.me && App.me.username) && chat.type !== 'channel')
      s = '<span class="ticks">✓✓</span> ' + s;
    if (chat.type === 'group' && lm.from !== (App.me && App.me.username) && lm.sender)
      s = '<b>' + esc(lm.sender.split(' ')) + ':</b> ' + s;
    return '<span class="snippet">' + s + '</span>';
  }

  function kindLabel(m) {
    return { image: '📷 Фото', video: '🎬 Видео', file: '📎 ' + (m.fileName || 'Файл'),
      voice: '🎤 Голосовое', sticker: m.text || 'Стикер' }[m.kind] || '';
  }

  function rowHtml(chat) {
    const lm = App.store.lastMessage(chat);
    const active = App.store.state.activeId === chat.id ? ' active' : '';
    const muted = chat.muted ? ' muted' : '';
    const badge = chat.unread ? '<span class="badge">' + chat.unread + '</span>' : '';
    const pin = chat.pinned ? '<span class="muteIcon">' + icon('pin', 'sm') + '</span>' : '';
    return (
      '<div class="chat' + active + muted + '" data-id="' + chat.id + '">' +
        avaHtml(chat, 'a50') +
        '<div class="info"><div class="top">' +
          '<span class="name">' + esc(chat.name) + '</span>' +
          '<span class="time">' + (lm ? esc(lm.time) : '') + '</span>' +
        '</div><div class="bottom">' +
          snippetHtml(chat, lm) +
          '<span class="right">' + pin + badge +
          (chat.muted && !chat.unread ? '<span class="muteIcon">' + icon('mute', 'sm') + '</span>' : '') +
          '</span>' +
        '</div></div>' +
      '</div>'
    );
  }

  function rowMenu(e, chat) {
    e.preventDefault();
    App.components.chatview.closeMenu();
    const en = isEn();
    const canDel = !chat.id.startsWith('c_saved_');
    const menu = App.utils.el(
      '<div class="ctxmenu">' +
        '<button data-a="pin">' + icon('pin') + (chat.pinned ? (en ? 'Unpin' : 'Открепить') : (en ? 'Pin to top' : 'Закрепить')) + '</button>' +
        '<button data-a="mute">' + icon('mute') + (chat.muted ? (en ? 'Unmute' : 'Включить звук') : (en ? 'Mute' : 'Без звука')) + '</button>' +
        '<button data-a="read">' + icon('check-double') + (en ? 'Mark as read' : 'Прочитано') + '</button>' +
        (canDel ? '<hr><button data-a="delchat" class="danger">' + icon('close') + (en ? 'Delete for both' : 'Удалить чат у обоих') + '</button>' : '') +
      '</div>');
    menu.style.left = Math.min(e.clientX, window.innerWidth - 210) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 210) + 'px';
    $('overlay').appendChild(menu);
    menu.addEventListener('click', async ev => {
      const a = ev.target.closest('button') && ev.target.closest('button').dataset.a;
      App.components.chatview.closeMenu();
      const done = () => render(App.store.state.filter);
      if (a === 'pin') App.store.togglePin(chat.id).then(done);
      else if (a === 'mute') App.store.toggleMute(chat.id).then(done);
      else if (a === 'read') App.store.clearUnread(chat.id).then(done);
      else if (a === 'delchat') {
        if (!confirm(en ? 'Delete this chat for you and your peer?' : 'Удалить этот чат у себя и у собеседника?')) return;
        await App.api.deleteChat(chat.id, 'all');
        await App.store.loadChats();
        if (App.store.state.activeId === chat.id) App.components.settings.close();
        done();
      } else done();
    });
  }

  function render(filter) {
    App.store.state.filter = filter == null ? App.store.state.filter : filter;
    const raw = App.store.state.filter.trim();
    const q = raw.toLowerCase();
    const en = isEn();
    const list = $('chatlist');
    if (!list) return;
    list.innerHTML = '';

    const allMy = App.store.sortedChats();
    const chats = !q
      ? allMy
      : allMy.filter(c =>
          c.name.toLowerCase().includes(q) ||
          (c.subtitle || '').toLowerCase().includes(q) ||
          App.store.getMessages(c.id).some(m => (m.text || '').toLowerCase().includes(q)));

    const pinned = chats.filter(c => c.pinned), rest = chats.filter(c => !c.pinned);
    if (pinned.length) {
      list.appendChild(App.utils.el('<div class="pin-sep">' + (en ? 'Pinned' : 'Закреплённые') + '</div>'));
      pinned.forEach(c => list.appendChild(mountRow(c)));
    }
    rest.forEach(c => list.appendChild(mountRow(c)));

    // Глобальный поиск пользователей по @username и телефону
    if (q && globalUsers.length) {
      list.appendChild(App.utils.el('<div class="pin-sep">' + (en ? 'People' : 'Найденные люди') + '</div>'));
      globalUsers.forEach(u => {
        const uRow = App.utils.el(
          '<div class="chat">' +
            avaHtml(u, 'a50') +
            '<div class="info"><div class="top"><span class="name">' + esc(u.name) + '</span></div>' +
            '<div class="bottom"><span class="snippet" style="color:var(--accent)">@' + esc(u.username) + '</span></div></div>' +
          '</div>'
        );
        uRow.addEventListener('click', async () => {
          try {
            const d = await App.api.createChat({ type: 'dm', username: u.username });
            $('search').value = '';
            globalUsers = [];
            globalRooms = [];
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

    // Глобальный поиск каналов и групп
    if (q && globalRooms.length) {
      list.appendChild(App.utils.el('<div class="pin-sep">' + (en ? 'Channels & Groups' : 'Каналы и группы') + '</div>'));
      globalRooms.forEach(r => {
        const rRow = App.utils.el(
          '<div class="chat">' +
            avaHtml(r, 'a50') +
            '<div class="info"><div class="top"><span class="name">' + esc(r.name) + '</span></div>' +
            '<div class="bottom"><span class="snippet" style="color:var(--accent)">' +
              (r.type === 'channel' ? (en ? 'Channel • Join' : 'Канал • Подписаться') : (en ? 'Group • Join' : 'Группа • Вступить')) +
            '</span></div></div>' +
          '</div>'
        );
        rRow.addEventListener('click', async () => {
          try {
            const d = await App.api.joinChat(r.id);
            $('search').value = '';
            globalUsers = [];
            globalRooms = [];
            await App.store.loadChats();
            render('');
            App.components.chatview.open(d.chat.id);
          } catch (err) {
            App.utils.toast(err.message);
          }
        });
        list.appendChild(rRow);
      });
    }

    if (!chats.length && (!q || (!globalUsers.length && !globalRooms.length))) {
      list.innerHTML = '<div class="empty-list">' + (en ? 'Nothing found' : 'Ничего не найдено') + '</div>';
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
      const trimmed = val.trim();
      if (!trimmed) {
        globalUsers = [];
        globalRooms = [];
        render('');
        return;
      }
      searchTimer = setTimeout(async () => {
        try {
          const res = await App.api.userSearch(trimmed);
          globalUsers = res.users || [];
          globalRooms = res.rooms || [];
          render(val);
        } catch (err) {}
      }, 220);
    });
  }

  return { render, bindSearch };
})();
