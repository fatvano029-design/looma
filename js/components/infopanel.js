/* ================= components/infopanel.js — Smooth Channel/Group Management ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.infopanel = (() => {
  const { $, esc, icon, initials } = App.utils;
  let isEditing = false;

  async function open(chatId) {
    let ip = $('infopanel');
    if (!ip) {
      ip = document.createElement('aside');
      ip.id = 'infopanel';
      ip.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:340px;max-width:100vw;background:var(--panel,#161926);border-left:1px solid var(--border,rgba(255,255,255,.08));z-index:900;display:flex;flex-direction:column;overflow-y:auto;padding:16px;color:var(--text,#fff);box-shadow:-12px 0 36px rgba(0,0,0,.5);transform:translateX(100%);transition:transform 0.3s cubic-bezier(.22,1,.36,1);';
      document.body.appendChild(ip);
    }
    ip.style.display = 'flex';
    requestAnimationFrame(() => {
      ip.classList.add('open');
      ip.style.transform = 'translateX(0)';
    });

    ip.innerHTML = '<div style="padding:24px;text-align:center;color:var(--grey);">Загрузка...</div>';

    try {
      const info = await App.api.chatInfo(chatId);
      const chat = info.chat || {};
      const members = info.members || [];
      const media = info.media || [];
      const files = info.files || [];
      const photosCount = media.filter(m => m.kind === 'image').length;
      const videosCount = media.filter(m => m.kind === 'video').length;
      const isGroupOrChan = chat.type === 'group' || chat.type === 'channel';
      const myId = App.me && App.me.id;
      const isOwner = chat.ownerId === myId;
      const isAdmin = isOwner || (chat.admins || []).includes(myId);

      const avaStyle = chat.avatar
        ? 'background-image:url(' + chat.avatar + ');background-size:cover;background-position:center;color:transparent;'
        : 'background:linear-gradient(135deg,#6c47ff,#00d2ff);color:#fff;';

      ip.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
          '<strong style="font-size:16px;">Информация</strong>' +
          '<div style="display:flex;gap:6px;">' +
            (isGroupOrChan && isAdmin ? '<button class="iconbtn" id="ipEditBtn" title="Редактировать">' + icon('edit') + '</button>' : '') +
            '<button class="iconbtn" id="ipCloseBtn">' + icon('close') + '</button>' +
          '</div>' +
        '</div>' +

        (isEditing && isGroupOrChan && isAdmin
          ? '<div style="display:flex;flex-direction:column;gap:10px;padding-bottom:16px;border-bottom:1px solid var(--border);">' +
              '<div style="display:flex;align-items:center;gap:12px;">' +
                '<div id="ipAvaEdit" title="Сменить фото" style="width:58px;height:58px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0;' + avaStyle + '">' + initials(chat.name) + '</div>' +
                '<input type="file" id="ipAvaInput" accept="image/*" style="display:none">' +
                '<input id="ipNameInput" value="' + esc(chat.name) + '" placeholder="Название" style="flex:1;padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);">' +
              '</div>' +
              '<input id="ipBioInput" value="' + esc(chat.bio || '') + '" placeholder="Описание..." style="padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);">' +
              '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
                '<button type="button" id="ipCancelEdit" style="padding:7px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--grey);cursor:pointer;">Отмена</button>' +
                '<button type="button" id="ipSaveEdit" style="padding:7px 16px;border-radius:10px;border:none;background:var(--accent,#7c4dff);color:#fff;cursor:pointer;font-weight:700;">Сохранить</button>' +
              '</div>' +
            '</div>'
          : '<div style="text-align:center;padding:8px 0 18px;border-bottom:1px solid var(--border);">' +
              '<div class="avatar a60" style="margin:0 auto 10px;font-size:22px;' + avaStyle + '">' + initials(chat.name || 'Чат') + '</div>' +
              '<div style="font-size:18px;font-weight:700;">' + esc(chat.name || 'Чат') + '</div>' +
              (chat.bio ? '<div style="font-size:13px;color:var(--text);opacity:.85;margin-top:4px;">' + esc(chat.bio) + '</div>' : '') +
              '<div style="font-size:13px;color:var(--grey);margin-top:4px;">' +
                (chat.type === 'channel' ? ('Канал • ' + members.length + ' подписч.') : (members.length + ' участн.')) +
              '</div>' +
            '</div>') +

        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:14px 0;border-bottom:1px solid var(--border);text-align:center;">' +
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

        '<div style="padding:14px 0;flex:1;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
            '<span style="font-weight:700;font-size:14px;">' + (chat.type === 'channel' ? 'Подписчики' : 'Участники') + ' (' + members.length + ')</span>' +
            (isGroupOrChan && isAdmin
              ? '<button type="button" id="ipAddMemberBtn" title="Добавить участника" style="width:32px;height:32px;border-radius:50%;border:none;background:var(--accent,#7c4dff);color:#fff;font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>'
              : '') +
          '</div>' +
          '<div id="ipAddBox" style="display:none;margin-bottom:12px;background:rgba(0,0,0,.2);padding:10px;border-radius:12px;">' +
            '<input id="ipAddSearch" placeholder="Введите @username или телефон..." style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:inherit;margin-bottom:6px;">' +
            '<div id="ipAddResults"></div>' +
          '</div>' +
          '<div id="ipMembersList" style="display:flex;flex-direction:column;gap:8px;">' +
            members.map(m => {
              const roleTag = m.isOwner ? 'Владелец' : (m.isAdmin ? 'Админ' : '');
              const mAva = m.avatar
                ? 'background-image:url(' + m.avatar + ');background-size:cover;background-position:center;color:transparent;'
                : 'background:' + esc(m.color || '#6c47ff') + ';';
              return '<div class="ip-member-row" data-uid="' + esc(m.id) + '" style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;background:rgba(128,128,128,.08);cursor:pointer;">' +
                '<div class="avatar a36" style="' + mAva + '">' + initials(m.name) + '</div>' +
                '<div style="flex:1;min-width:0;">' +
                  '<div style="font-weight:600;font-size:14px;">' + esc(m.name) + '</div>' +
                  '<div style="font-size:12px;color:var(--grey);">@' + esc(m.username) + '</div>' +
                '</div>' +
                (roleTag ? '<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px;background:rgba(124,77,255,.2);color:var(--accent,#7c4dff);">' + roleTag + '</span>' : '') +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +

        (isGroupOrChan && isOwner
          ? '<button type="button" id="ipDeleteChatBtn" style="margin-top:12px;width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,82,82,.35);background:rgba(255,82,82,.12);color:#ff5252;font-weight:700;cursor:pointer;">' +
              (chat.type === 'channel' ? 'Удалить канал' : 'Удалить группу') +
            '</button>'
          : '');

      $('ipCloseBtn').onclick = () => { isEditing = false; close(); };

      if ($('ipEditBtn')) {
        $('ipEditBtn').onclick = () => { isEditing = !isEditing; open(chatId); };
      }
      if ($('ipCancelEdit')) {
        $('ipCancelEdit').onclick = () => { isEditing = false; open(chatId); };
      }
      if ($('ipAvaEdit')) {
        $('ipAvaEdit').onclick = () => $('ipAvaInput').click();
        $('ipAvaInput').onchange = e => {
          const f = e.target.files && e.target.files;
          if (!f) return;
          const r = new FileReader();
          r.onload = async () => {
            await App.api.updateChat(chatId, { avatar: r.result });
            await App.store.loadChats();
            App.components.chatlist.render(App.store.state.filter);
            open(chatId);
          };
          r.readAsDataURL(f);
        };
      }
      if ($('ipSaveEdit')) {
        $('ipSaveEdit').onclick = async () => {
          const newName = $('ipNameInput').value.trim() || chat.name;
          const newBio = $('ipBioInput').value.trim();
await App.api.updateChat(chatId, { name: newName, bio: newBio });
isEditing = false;
await App.store.loadChats();
App.components.chatlist.render(App.store.state.filter);
App.components.chatview.open(chatId);
open(chatId);
};
}
if ($('ipDeleteChatBtn')) {
$('ipDeleteChatBtn').onclick = async () => {
if (!confirm('Удалить навсегда?')) return;
await App.api.deleteChat(chatId);
close();
App.store.setActive(null);
await App.store.loadChats();
App.components.chatlist.render(App.store.state.filter);
App.components.settings.close();
};
}
// Назначение прав админа / исключение участника по клику
if (isGroupOrChan && isAdmin) {
ip.querySelectorAll('.ip-member-row').forEach(row => {
row.onclick = async () => {
const uid = row.dataset.uid;
const target = members.find(x => x.id === uid);
if (!target || target.isOwner || uid === myId) return;
const action = prompt(
'Управление участником ' + target.name + ':\n' +
'1 — Назначить администратором\n' +
'2 — Снять права администратора\n' +
'3 — Удалить из канала/группы'
);
if (action === '1') await App.api.setMemberRole(chatId, uid, 'admin');
else if (action === '2') await App.api.setMemberRole(chatId, uid, 'unadmin');
else if (action === '3') await App.api.setMemberRole(chatId, uid, 'kick');
else return;
open(chatId);
};
});
}
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
'' +
'' + esc(u.name) + ' (@' + esc(u.username) + ')' +
'+ Добавить' +
''
).join('')
: 'Не найдено';
resBox.querySelectorAll('.ip-pick-user').forEach(el => {
el.onclick = async () => {
await App.api.addMember(chatId, el.dataset.u);
App.utils.toast('Добавлен!');
open(chatId);
};
});
} catch (err) {}
};
}
} catch (e) {
ip.innerHTML = 'Ошибка загрузки';
}
}
function close() {
const ip = $('infopanel');
if (ip) {
ip.style.transform = 'translateX(100%)';
ip.classList.remove('open');
setTimeout(() => { if (!ip.classList.contains('open')) ip.style.display = 'none'; }, 300);
}
}
return { open, close };
})();
