// ==================== MONTANA PLAYER - ZY VIVO PLAYER ====================
let playlists = JSON.parse(localStorage.getItem('montana_playlists')) || [];
let activePlaylist = playlists.find(p => p.active) || null;
let serverData = { categories: [], streams: [] };
let hls = new Hls();

// ===== الساعة بنظام 12 ساعة =====
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  const dateStr = now.toLocaleDateString('ar-EG', options);

  const clockTimeEl = document.getElementById('clockTime');
  const clockDateEl = document.getElementById('clockDate');
  if (clockTimeEl) clockTimeEl.innerText = timeStr;
  if (clockDateEl) clockDateEl.innerText = dateStr;
}
setInterval(updateClock, 1000);
updateClock();

// ===== الأساسيات =====
function persistPlaylists() {
  localStorage.setItem('montana_playlists', JSON.stringify(playlists));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.innerText = str == null ? '' : str;
  return div.innerHTML;
}

function normalizeHost(url) {
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
  if (url.endsWith('/')) url = url.slice(0, -1);
  return url;
}

function openAddModal() { document.getElementById('addModal').style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function updatePlaylistLabel() {
  const label = document.getElementById('current-playlist-name');
  if (label) {
    label.innerText = activePlaylist ? activePlaylist.name : 'لا يوجد (اضغط + لإضافة سيرفر)';
  }
}

// ===== حفظ وجلب البيانات (نظام Vivo Player) =====
function saveAndFetchData() {
  const name = document.getElementById('pName').value.trim();
  let url = document.getElementById('pUrl').value.trim();
  const user = document.getElementById('pUser').value.trim();
  const pass = document.getElementById('pPass').value.trim();

  if (!name || !url || !user || !pass) return alert('الرجاء تعبئة كافة البيانات');

  url = normalizeHost(url);
  const newPl = { name, url, user, pass, active: true };
  playlists.forEach(p => p.active = false);
  playlists.push(newPl);
  activePlaylist = newPl;
  persistPlaylists();

  ['pName', 'pUrl', 'pUser', 'pPass'].forEach(id => document.getElementById(id).value = '');
  updatePlaylistLabel();
  closeModal('addModal');
  serverData = { categories: [], streams: [] };
  fetchAllData();
}

function openPlaylistsModal() {
  renderPlaylistsList();
  document.getElementById('playlistsModal').style.display = 'flex';
}

function renderPlaylistsList() {
  const container = document.getElementById('playlistsListContainer');
  container.innerHTML = '';
  if (playlists.length === 0) {
    container.innerHTML = '<p style="text-align:center; opacity:0.6; font-size:11px; padding:6px 0;">لا يوجد سيرفرات محفوظة بعد</p>';
    return;
  }
  playlists.forEach((pl, i) => {
    const div = document.createElement('div');
    div.className = 'pl-item' + (pl.active ? ' active' : '');
    div.innerHTML = `
      <div class="pl-item-left">
        <div class="pl-dot"></div>
        <div class="pl-item-info"><b>${escapeHtml(pl.name)}</b><span>${escapeHtml(pl.url)}</span></div>
      </div>
      <div class="pl-item-actions"><i class="fa-solid fa-trash" style="font-size:11px; color:#f87171;"></i></div>
    `;
    div.querySelector('.pl-item-actions i').onclick = (e) => { e.stopPropagation(); deletePlaylist(i); };
    div.onclick = () => selectPlaylist(i);
    container.appendChild(div);
  });
}

function selectPlaylist(i) {
  playlists.forEach(p => p.active = false);
  playlists[i].active = true;
  activePlaylist = playlists[i];
  persistPlaylists();
  updatePlaylistLabel();
  serverData = { categories: [], streams: [] };
  closeModal('playlistsModal');
  fetchAllData();
}

function deletePlaylist(i) {
  const wasActive = playlists[i].active;
  playlists.splice(i, 1);
  if (wasActive) {
    activePlaylist = playlists[0] || null;
    if (activePlaylist) activePlaylist.active = true;
  }
  persistPlaylists();
  renderPlaylistsList();
  updatePlaylistLabel();
}

// ===== جلب البيانات (نظام Vivo Player بالظبط) =====
function fetchAllData() {
  if(!activePlaylist) {
    alert('مفيش سيرفر نشط، اضغط + عشان تضيف واحد');
    return;
  }
  
  document.getElementById('loadingOverlay').style.display = 'flex';

  const baseUrl = activePlaylist.url;
  const user = activePlaylist.user;
  const pass = activePlaylist.pass;

  // ===== نفس نظام Vivo Player بالظبط =====
  const apiBase = `${baseUrl}/player_api.php?username=${user}&password=${pass}`;
  
  const endpoints = [
    `${apiBase}&action=get_live_categories`,
    `${apiBase}&action=get_live_streams`
  ];

  // نجيب البيانات
  Promise.all([
    fetch(endpoints[0]).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
    fetch(endpoints[1]).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
  ])
  .then(([categories, streams]) => {
    // التأكد إن في بيانات
    if (!categories || categories.length === 0) {
      throw new Error('مفيش بيانات، تأكد من اليوزر والباسورد');
    }
    
    serverData.categories = categories;
    serverData.streams = streams;
    
    document.getElementById('loadingOverlay').style.display = 'none';
    openPlayerView('live');
    
    // رسالة نجاح
    alert(`✅ تم التحميل!\nأقسام: ${categories.length}\nقنوات: ${streams.length}`);
  })
  .catch(err => {
    document.getElementById('loadingOverlay').style.display = 'none';
    alert(`❌ فشل التحميل: ${err.message}\n\n🔧 الحلول:\n1- تأكد السيرفر شغال\n2- تأكد اليوزر والباسورد\n3- غير http لـ https\n4- جرب سيرفر تاني`);
  });
}

// ===== مشغل الفيديو =====
function openPlayerView(type) {
  if(!activePlaylist) { openPlaylistsModal(); return; }
  if(serverData.categories.length === 0) {
    fetchAllData();
    return;
  }
  document.getElementById('playerView').style.display = 'flex';
  document.getElementById('channelsContainer').innerHTML = '<p style="text-align:center; opacity:0.5; margin-top:15px; font-size:11px;">اختر قسماً لعرض القنوات</p>';
  renderCategories();
}

function closePlayerView() {
  document.getElementById('playerView').style.display = 'none';
  const video = document.getElementById('mainVideo');
  video.pause();
}

function renderCategories() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';
  if (!serverData.categories || serverData.categories.length === 0) {
    container.innerHTML = '<p style="text-align:center; opacity:0.5; padding:10px; font-size:11px;">لا توجد أقسام</p>';
    return;
  }
  serverData.categories.forEach((cat) => {
    const div = document.createElement('div');
    div.className = 'panel-item';
    div.innerText = cat.category_name;
    div.onclick = () => {
      document.querySelectorAll('#categoriesContainer .panel-item').forEach(el => el.classList.remove('active'));
      div.classList.add('active');
      renderChannels(cat.category_id);
    };
    container.appendChild(div);
  });
}

function renderChannels(catId) {
  const container = document.getElementById('channelsContainer');
  container.innerHTML = '';
  const filteredStreams = serverData.streams.filter(s => s.category_id === catId);
  
  if(filteredStreams.length === 0) {
    container.innerHTML = '<p style="text-align:center; opacity:0.5; margin-top:15px; font-size:11px;">لا توجد قنوات</p>';
    return;
  }

  filteredStreams.forEach(stream => {
    const div = document.createElement('div');
    div.className = 'panel-item';
    div.innerHTML = `<span>${escapeHtml(stream.name)}</span> <i class="fa-solid fa-play" style="font-size:9px;"></i>`;
    div.onclick = () => playStream(stream.stream_id);
    container.appendChild(div);
  });
}

function playStream(streamId) {
  const streamUrl = `${activePlaylist.url}/live/${activePlaylist.user}/${activePlaylist.pass}/${streamId}.m3u8`;
  const video = document.getElementById('mainVideo');
  const placeholder = document.getElementById('videoPlaceholder');

  placeholder.style.display = 'none';
  video.style.display = 'block';

  if (Hls.isSupported()) {
    hls.destroy();
    hls = new Hls();
    hls.loadSource(streamUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamUrl;
    video.play();
  }
}

function toggleFullscreen() {
  document.getElementById('videoBox').classList.toggle('fullscreen');
}

document.addEventListener('keydown', (e) => {
  if (e.key === "Escape") {
    document.getElementById('videoBox').classList.remove('fullscreen');
  }
});

// ===== بدء التشغيل =====
if (activePlaylist) {
  updatePlaylistLabel();
  fetchAllData();
} else {
  updatePlaylistLabel();
}