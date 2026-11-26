/* ================= components/infopanel.js — Telegram-style Info + Add Member (+) ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.infopanel = (() => {
  const { $, esc, icon, initials } = App.utils;

  async function open(chatId) {
    let ip = $('infopanel');
    if (!ip) {
      ip = document.createElement('aside');
      ip.id = 'infopanel';
      ip.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:330px;max-width:100vw;background:var(--panel,#161926);border-left:1px solid var(--border,rgba(255,255,255,.08));z-index:900;display:flex;flex-direction:column;overflow-y:auto;padding:16px;color:var(--text,#fff);box-shadow:-12px 0 32px rgba(0,0,0,.45);';
      document.body.appendChild(ip);
    }
    ip.classList.add('open');
    ip.style.display = 'flex';
    ip.innerHTML = '<div style="padding:24px;text-align:center;color:var(--grey);">Загрузка информации...</div>';

    try {
      const info = await App.api.chatInfo(chatId);
      const chat = info.chat || {};
      const members = info.members || [];
      const media = info.media || [];
      const files = info.files || [];
      const photosCount = media.filter(m => m.kind === 'image').length;
      const videosCount = media.filter(m => m.kind === 'video').length;
      const isGroupOrChan = chat.type === 'group' || chat.type === 'channel';

      ip.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
          '<strong style="font-size:16px;">Информация</strong>' +
          '<button class="iconbtn" id="ipCloseBtn">' + icon('close') + '</button>' +
        '</div>' +
        '<div style="text-align:center;padding:12px 0 18px;border-bottom:1px solid var(--border,rgba(255,255,255,.08));">' +
          '<div class="avatar a60" style="margin:0 auto 10px;background:linear-gradient(135deg,#6c47ff,#00d2ff);font-size:22px;">' + initials(chat.name || 'Чат') + '</div>' +
          '<div style="font-size:18px;font-weight:700;">' + esc(chat.name || 'Чат') + '</div>' +
          '<div style="font-size:13px;color:var(--grey);margin-top:4px;">' +
            (chat.type === 'channel' ? ('Канал • ' + members.length + ' подписч.') : (members.length + ' участн.')) +
          '</div>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:14px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.08));text-align:center;">' +
          '<div style="background:rgba(128,128,128,.1);padding:10px 6px;border-radius:12px;">' +
            '<div style="font-weight:700;font-size:16px;">' + photosCount + '</div>' +
            '<div style="font-size:11px;color:var(--grey);">Фото</div>' +
          '</div>' +
          '<div style="background:rgba(128,128,128,.1);padding:10px 6px;border-radius:12px;">' +
            '<div style="font-weight:700;font-size:16px;">' + videosCount + '</div>' +
            '<div style="font-size:11px;color:var(--grey);">Видео</div>' +
          '</div>' +
          '<div style="background:rgba(128,128,128,.1);padding:10px 6px;border-radius:12px;">' +
            '<div style="font-weight:700;font-size:16px;">' + files.length + '</div>' +
            '<div style="font-size:11px;color:var(--grey);">Файлы</div>' +
          '</div>' +
        '</div>' +

        '<div style="padding:14px 0;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
            '<span style="font-weight:700;font-size:14px;">' + (chat.type === 'channel' ? 'Подписчики' : 'Участники') + ' (' + members.length + ')</span>' +
            (isGroupOrChan
              ? '<button type="button" id="ipAddMemberBtn" title="Добавить участника" style="width:32px;height:32px;border-radius:50%;border:none;background:var(--accent,#7c4dff);color:#fff;font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>'
              : '') +
          '</div>' +
          '<div id="ipAddBox" style="display:none;margin-bottom:12px;background:rgba(0,0,0,.2);padding:10px;border-radius:12px;">' +
            '<input id="ipAddSearch" placeholder="Введите @username..." style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:inherit;margin-bottom:6px;">' +
            '<div id="ipAddResults"></div>' +
          '</div>' +
          '<div id="ipMembersList" style="display:flex;flex-direction:column;gap:8px;">' +
            members.map(m =>
              '<div style="display:flex;align-items:center;gap:10px;padding:6px;border-radius:10px;background:rgba(128,128,128,.07);">' +
                '<div class="avatar a36" style="background:' + esc(m.color || '#6c47ff') + '">' + initials(m.name) + '</div>' +
                '<div style="flex:1;min-width:0;">' +
                  '<div style="font-weight:600;font-size:14px;">' + esc(m.name) + '</div>' +
                  '<div style="font-size:12px;color:var(--grey);">@' + esc(m.username) + '</div>' +
                '</div>' +
              '</div>'
            ).join('') +
          '</div>' +
        '</div>';

      $('ipCloseBtn').onclick = close;

      if ($('ipAddMemberBtn')) {
        $('ipAddMemberBtn').onclick = () => {
          const box = $('ipAddBox');
          box.style.display = box.style.display === 'none' ? 'block' : 'none';
          if (box.style.display === 'block') $('ipAddSearch').focus();
        };
      }

      if ($('ipAddSearch')) {
        $('ipAddSearch').oninput = async e => {
          const q = e.target.value.trim();
          const resBox = $('ipAddResults');
          if (!q) { resBox.innerHTML = ''; return; }
          try {
            const d = await App.api.userSearch(q);
            const list = d.users || [];
            resBox.innerHTML = list.length
              ? list.map(u =>
                  '<div class="ip-pick-user" data-u="' + esc(u.username) + '" style="padding:7px 8px;border-radius:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:13px;">' +
                    '<span>' + esc(u.name) + ' (@' + esc(u.username) + ')</span>' +
                    '<span style="color:var(--accent,#7c4dff);font-weight:700;">+ Добавить</span>' +
                  '</div>'
                ).join('')
              : '<div style="font-size:12px;color:var(--grey);padding:4px;">Не найдено</div>';

            resBox.querySelectorAll('.ip-pick-user').forEach(el => {
              el.onclick = async () => {
                await App.api.addMember(chatId, el.dataset.u);
                App.utils.toast('Участник добавлен!');
                open(chatId);
              };
            });
          } catch (err) {}
        };
      }
    } catch (e) {
      ip.innerHTML = '<div style="padding:20px;color:#ff5252;">Ошибка загрузки информации</div>';
    }
  }

  function close() {
    const ip = $('infopanel');
    if (ip) {
      ip.classList.remove('open');
      ip.style.display = 'none';
    }
  }

  return { open, close };
})();
