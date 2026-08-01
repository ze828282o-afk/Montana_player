// ---- بيانات تجريبية ----
let playlists = [
    { id: 1, name: 'Ziyad Mira 1', url: 'http://apkiptv.online/get...', type: 'm3u' },
    { id: 2, name: 'Ziyad Mira 2', url: 'http://line.mediadisc.cc...', type: 'm3u' },
    { id: 3, name: 'Ziyad Mira 3', url: 'http://premiumn.rksuper...', type: 'm3u' },
    { id: 4, name: 'Ziyad Mira 4', url: 'http://iboplayr.8932437.x...', type: 'xtream' }
];

let currentPlaylistId = 4;
let currentChannel = null;

// ---- تحديث الوقت ----
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    document.getElementById('time').textContent = time;
    document.getElementById('date').textContent = date;
}
setInterval(updateClock, 10000);
updateClock();

// ---- تبديل الشاشات ----
function showHome() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('app').classList.remove('hidden');
}
function showAddPlaylist() {
    document.getElementById('app').classList.add('hidden');
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('addPlaylistScreen').classList.remove('hidden');
}
function showPlaylists() {
    document.getElementById('app').classList.add('hidden');
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('playlistsScreen').classList.remove('hidden');
    renderPlaylistList();
}
function showPlayer(url) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('playerScreen').classList.remove('hidden');
    const video = document.getElementById('videoPlayer');
    video.src = url;
    video.play();
}
function closePlayer() {
    const video = document.getElementById('videoPlayer');
    video.pause();
    video.src = '';
    showHome();
}

// ---- عرض القوائم المحفوظة ----
function renderPlaylistList() {
    const container = document.getElementById('playlistList');
    container.innerHTML = '';
    playlists.forEach(p => {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        div.innerHTML = `
            <span><strong>${p.name}</strong> (${p.type})</span>
            <div>
                <button onclick="loadPlaylist(${p.id})">▶ Load</button>
                <button onclick="deletePlaylist(${p.id})" style="border-color:#ff4444;color:#ff4444;">✕</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ---- تحميل قائمة ----
function loadPlaylist(id) {
    const pl = playlists.find(p => p.id === id);
    if (!pl) return;
    currentPlaylistId = id;
    document.getElementById('currentPlaylistName').textContent = pl.name;
    // محاكاة انتهاء الصلاحية (بعد سنة من اليوم)
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    document.getElementById('expiryDate').textContent = exp.toISOString().split('T')[0];
    showHome();
    // هنا يمكن جلب القنوات من الرابط
    alert(`✅ Loaded ${pl.name}\nNow fetching channels... (demo)`);
}

// ---- حذف قائمة ----
function deletePlaylist(id) {
    if (confirm('Delete this playlist?')) {
        playlists = playlists.filter(p => p.id !== id);
        renderPlaylistList();
    }
}

// ---- إضافة قائمة جديدة ----
document.getElementById('savePlaylistBtn').addEventListener('click', function() {
    const m3uUrl = document.getElementById('m3uUrl').value.trim();
    const xtreamUrl = document.getElementById('xtreamUrl').value.trim();
    const xtreamUser = document.getElementById('xtreamUser').value.trim();
    const xtreamPass = document.getElementById('xtreamPass').value.trim();

    let newPlaylist = null;
    if (m3uUrl) {
        newPlaylist = { id: Date.now(), name: `Playlist ${playlists.length+1}`, url: m3uUrl, type: 'm3u' };
    } else if (xtreamUrl && xtreamUser && xtreamPass) {
        newPlaylist = { id: Date.now(), name: `Xtream ${playlists.length+1}`, url: `${xtreamUrl}?user=${xtreamUser}&pass=${xtreamPass}`, type: 'xtream' };
    } else {
        alert('⚠️ Please fill all fields for the selected type.');
        return;
    }

    playlists.push(newPlaylist);
    alert(`✅ Playlist "${newPlaylist.name}" added!`);
    // reset fields
    document.getElementById('m3uUrl').value = '';
    document.getElementById('xtreamUrl').value = '';
    document.getElementById('xtreamUser').value = '';
    document.getElementById('xtreamPass').value = '';
    showHome();
});

// ---- تبويب M3U / Xtream ----
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        document.getElementById('tabM3U').classList.toggle('hidden', tab !== 'm3u');
        document.getElementById('tabXtream').classList.toggle('hidden', tab !== 'xtream');
    });
});

// ---- أزرار التنقل الرئيسية ----
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const page = this.dataset.page;
        if (page === 'playlists') {
            showPlaylists();
            return;
        }
        if (page === 'live') {
            // محاكاة تشغيل قناة تجريبية
            const sampleUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
            showPlayer(sampleUrl);
            return;
        }
        alert(`📺 ${page} section (coming soon)`);
    });
});

// ---- أزرار الإدارة ----
document.getElementById('manageBtn').addEventListener('click', showPlaylists);
document.getElementById('addBtn').addEventListener('click', showAddPlaylist);

// ---- عرض MAC ----
// تم عرضه مباشرة في HTML