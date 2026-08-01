// ===== تخزين البيانات =====
let playlists = [];
let currentPlaylistId = null;
let currentChannels = [];
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// ===== تحميل القوائم من التخزين =====
function loadPlaylistsFromStorage() {
    const stored = localStorage.getItem('playlists');
    if (stored) {
        playlists = JSON.parse(stored);
    } else {
        playlists = [
            { id: 1, name: 'Ziyad Mira 1', url: 'http://apkiptv.online/get...', type: 'm3u' },
            { id: 2, name: 'Ziyad Mira 2', url: 'http://line.mediadisc.cc...', type: 'm3u' },
            { id: 3, name: 'Ziyad Mira 3', url: 'http://premiumn.rksuper...', type: 'm3u' },
            { id: 4, name: 'Ziyad Mira 4', url: 'http://iboplayr.8932437.x...', type: 'xtream' }
        ];
        savePlaylistsToStorage();
    }
}

function savePlaylistsToStorage() {
    localStorage.setItem('playlists', JSON.stringify(playlists));
}

// ===== تحديث الساعة =====
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    document.getElementById('time').textContent = time;
    document.getElementById('date').textContent = date;
}
setInterval(updateClock, 10000);
updateClock();

// ===== التنقل =====
function showHome() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('app').classList.remove('hidden');
    updateCurrentPlaylistDisplay();
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

function showChannels(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    document.getElementById('app').classList.add('hidden');
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('channelsScreen').classList.remove('hidden');
    document.getElementById('channelsTitle').textContent = `📺 ${playlist.name}`;
    
    renderChannels(currentChannels);
}

function showPlayer(channel) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('playerScreen').classList.remove('hidden');
    
    const video = document.getElementById('videoPlayer');
    video.src = channel.url;
    video.play();
    
    document.getElementById('channelInfo').textContent = `▶ ${channel.name}`;
}

function closePlayer() {
    const video = document.getElementById('videoPlayer');
    video.pause();
    video.src = '';
    showHome();
}

// ===== عرض القنوات =====
function renderChannels(channels) {
    const container = document.getElementById('channelsList');
    container.innerHTML = '';
    
    if (!channels || channels.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#666;padding:40px;">No channels found</div>';
        return;
    }
    
    channels.forEach((ch, index) => {
        const div = document.createElement('div');
        div.className = 'channel-item';
        div.innerHTML = `
            <div>
                <div class="channel-name">${ch.name || 'Channel ' + (index+1)}</div>
                <div class="channel-group">${ch.group || 'General'}</div>
            </div>
            <button class="play-btn" onclick="playChannel(${index})">▶</button>
        `;
        container.appendChild(div);
    });
}

function playChannel(index) {
    const channel = currentChannels[index];
    if (channel) {
        showPlayer(channel);
    }
}

// ===== جلب M3U =====
async function fetchM3U(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        const lines = text.split('\n');
        const channels = [];
        let current = null;
        
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
                const match = line.match(/,([^,]+)$/);
                const name = match ? match[1] : 'Unknown';
                const groupMatch = line.match(/group-title="([^"]+)"/);
                const group = groupMatch ? groupMatch[1] : 'General';
                current = { name, group, url: '' };
            } else if (line && !line.startsWith('#') && current) {
                current.url = line;
                channels.push(current);
                current = null;
            }
        }
        return channels;
    } catch (error) {
        console.error('Error fetching M3U:', error);
        return [];
    }
}

// ===== جلب Xtream =====
async function fetchXtream(baseUrl, username, password) {
    try {
        const liveUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
        const response = await fetch(liveUrl);
        const data = await response.json();
        
        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid Xtream response');
        }
        
        return data.map(ch => ({
            name: ch.name || ch.stream_name || 'Unknown',
            group: ch.category_name || 'General',
            url: `${baseUrl}/${ch.stream_id}`,
            id: ch.stream_id
        }));
    } catch (error) {
        console.error('Error fetching Xtream:', error);
        return [];
    }
}

// ===== تحميل قائمة =====
async function loadPlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    currentPlaylistId = playlistId;
    document.getElementById('loadingStatus').style.display = 'block';
    
    try {
        let channels = [];
        if (playlist.type === 'm3u') {
            channels = await fetchM3U(playlist.url);
        } else if (playlist.type === 'xtream') {
            const urlParams = new URLSearchParams(playlist.url.split('?')[1]);
            const baseUrl = playlist.url.split('?')[0];
            const username = urlParams.get('user') || '';
            const password = urlParams.get('pass') || '';
            channels = await fetchXtream(baseUrl, username, password);
        }
        
        currentChannels = channels;
        document.getElementById('currentPlaylistName').textContent = playlist.name;
        
        // تاريخ انتهاء (بعد سنة)
        const exp = new Date();
        exp.setFullYear(exp.getFullYear() + 1);
        document.getElementById('expiryDate').textContent = exp.toISOString().split('T')[0];
        
        localStorage.setItem('currentChannels', JSON.stringify(channels));
        localStorage.setItem('currentPlaylistId', playlistId);
        
        showChannels(playlistId);
        
    } catch (error) {
        alert('❌ Failed to load playlist: ' + error.message);
    } finally {
        document.getElementById('loadingStatus').style.display = 'none';
    }
}

function updateCurrentPlaylistDisplay() {
    if (currentPlaylistId) {
        const playlist = playlists.find(p => p.id === currentPlaylistId);
        if (playlist) {
            document.getElementById('currentPlaylistName').textContent = playlist.name;
            return;
        }
    }
    document.getElementById('currentPlaylistName').textContent = 'None';
}

// ===== عرض القوائم المحفوظة =====
function renderPlaylistList() {
    const container = document.getElementById('playlistList');
    container.innerHTML = '';
    if (playlists.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">No playlists added</div>';
        return;
    }
    playlists.forEach(p => {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        div.innerHTML = `
            <span><strong>${p.name}</strong></span>
            <div>
                <button onclick="loadPlaylist(${p.id})">▶ Load</button>
                <button onclick="deletePlaylist(${p.id})" style="border-color:#ff4444;color:#ff4444;">✕</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function deletePlaylist(id) {
    if (confirm('Delete this playlist?')) {
        playlists = playlists.filter(p => p.id !== id);
        savePlaylistsToStorage();
        renderPlaylistList();
        if (currentPlaylistId === id) {
            currentPlaylistId = null;
            currentChannels = [];
            updateCurrentPlaylistDisplay();
        }
    }
}

// ===== إضافة قائمة =====
document.getElementById('savePlaylistBtn').addEventListener('click', async function() {
    const m3uUrl = document.getElementById('m3uUrl').value.trim();
    const xtreamUrl = document.getElementById('xtreamUrl').value.trim();
    const xtreamUser = document.getElementById('xtreamUser').value.trim();
    const xtreamPass = document.getElementById('xtreamPass').value.trim();
    
    let newPlaylist = null;
    let channels = [];
    
    if (m3uUrl) {
        newPlaylist = { id: Date.now(), name: `Playlist ${playlists.length+1}`, url: m3uUrl, type: 'm3u' };
        document.getElementById('loadingStatus').style.display = 'block';
        channels = await fetchM3U(m3uUrl);
    } else if (xtreamUrl && xtreamUser && xtreamPass) {
        newPlaylist = { id: Date.now(), name: `Xtream ${playlists.length+1}`, url: `${xtreamUrl}?user=${xtreamUser}&pass=${xtreamPass}`, type: 'xtream' };
        document.getElementById('loadingStatus').style.display = 'block';
        channels = await fetchXtream(xtreamUrl, xtreamUser, xtreamPass);
    } else {
        alert('⚠️ Please fill all fields.');
        return;
    }
    
    if (channels.length === 0) {
        alert('⚠️ No channels found.');
        document.getElementById('loadingStatus').style.display = 'none';
        return;
    }
    
    playlists.push(newPlaylist);
    savePlaylistsToStorage();
    currentChannels = channels;
    currentPlaylistId = newPlaylist.id;
    
    document.getElementById('currentPlaylistName').textContent = newPlaylist.name;
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    document.getElementById('expiryDate').textContent = exp.toISOString().split('T')[0];
    
    localStorage.setItem('currentChannels', JSON.stringify(channels));
    localStorage.setItem('currentPlaylistId', currentPlaylistId);
    
    document.getElementById('loadingStatus').style.display = 'none';
    
    document.getElementById('m3uUrl').value = '';
    document.getElementById('xtreamUrl').value = '';
    document.getElementById('xtreamUser').value = '';
    document.getElementById('xtreamPass').value = '';
    
    alert(`✅ Loaded ${channels.length} channels!`);
    showChannels(newPlaylist.id);
});

// ===== أزرار التنقل =====
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const page = this.dataset.page;
        if (page === 'playlists') {
            showPlaylists();
            return;
        }
        if (page === 'live') {
            if (currentChannels.length > 0) {
                showChannels(currentPlaylistId);
            } else {
                alert('📺 Please add a playlist first.');
            }
            return;
        }
        if (page === 'favorites') {
            const favs = currentChannels.filter((ch, i) => favorites.includes(i));
            if (favs.length > 0) {
                renderChannels(favs);
                document.getElementById('app').classList.add('hidden');
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                document.getElementById('channelsScreen').classList.remove('hidden');
                document.getElementById('channelsTitle').textContent = '❤️ Favorites';
            } else {
                alert('No favorites yet.');
            }
            return;
        }
        alert(`📺 ${page} section coming soon`);
    });
});

// ===== أزرار الإدارة =====
document.getElementById('manageBtn')?.addEventListener('click', showPlaylists);
document.getElementById('addBtn')?.addEventListener('click', showAddPlaylist);

// ===== تبويب M3U / Xtream =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        document.getElementById('tabM3U').classList.toggle('hidden', tab !== 'm3u');
        document.getElementById('tabXtream').classList.toggle('hidden', tab !== 'xtream');
    });
});

// ===== بدء التشغيل =====
loadPlaylistsFromStorage();

const savedPlaylistId = localStorage.getItem('currentPlaylistId');
if (savedPlaylistId) {
    const savedChannels = localStorage.getItem('currentChannels');
    if (savedChannels) {
        currentChannels = JSON.parse(savedChannels);
        currentPlaylistId = parseInt(savedPlaylistId);
        updateCurrentPlaylistDisplay();
        // تحديث تاريخ الانتهاء
        const exp = new Date();
        exp.setFullYear(exp.getFullYear() + 1);
        document.getElementById('expiryDate').textContent = exp.toISOString().split('T')[0];
    }
}