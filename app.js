// بيانات الاتصال والتطبيق
let credentials = { url: '', username: '', password: '' };
let currentTab = 'live'; 
let rawData = { live: [], movie: [], series: [] };
let categories = { live: [], movie: [], series: [] };
let favorites = JSON.parse(localStorage.getItem('montana_favs')) || [];
let activeItem = null;
let hlsPlayer = null;

// بروكسي مجاني لتجاوز مشاكل HTTP و CORS أثناء الرفع على Vercel (HTTPS)
const CORS_PROXY = "https://corsproxy.io/?";

// عناصر DOM
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');
const categorySelect = document.getElementById('category-select');
const contentList = document.getElementById('content-list');
const searchInput = document.getElementById('search-input');
const video = document.getElementById('video-player');
const currentTitle = document.getElementById('current-title');
const favBtn = document.getElementById('fav-btn');

// دالة جلب البيانات الآمنة (تدعم HTTP عبر البروكسي)
async function fetchSafe(targetUrl) {
  try {
    // محاولة جلب مباشرة أولاً
    let response = await fetch(targetUrl);
    return await response.json();
  } catch (err) {
    // لو فشل بسبب CORS أو HTTPS/HTTP المختلط، نستخدم البروكسي تلقائياً
    const proxyUrl = CORS_PROXY + encodeURIComponent(targetUrl);
    let response = await fetch(proxyUrl);
    return await response.json();
  }
}

// 1. تسجيل الدخول
loginBtn.addEventListener('click', async () => {
  let url = document.getElementById('server-url').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!url || !username || !password) {
    errorMsg.innerText = "برجاء ملء كافة البيانات!";
    return;
  }

  // ضبط صيغة الـ URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  if (url.endsWith('/')) url = url.slice(0, -1);

  credentials = { url, username, password };
  errorMsg.innerText = "جاري الاتصال بالسيرفر...";

  try {
    const apiReq = `${url}/player_api.php?username=${username}&password=${password}`;
    const data = await fetchSafe(apiReq);

    if (data.user_info && data.user_info.auth === 1) {
      renderUserInfo(data.user_info);
      loginScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');

      // جلب بيانات البث المباشر فور الدخول
      await loadTabCategories('live', 'get_live_categories');
      await loadTabData('live', 'get_live_streams');
    } else {
      errorMsg.innerText = "بيانات الدخول غير صحيحة!";
    }
  } catch (e) {
    errorMsg.innerText = "تعذر الاتصال بالسيرفر! تأكد من الرابط أو اسم المستخدم.";
    console.error(e);
  }
});

// 2. عرض بيانات الحساب وتاريخ الانتهاء
function renderUserInfo(info) {
  document.getElementById('info-user').innerText = info.username;
  document.getElementById('info-status').innerText = info.status;
  document.getElementById('info-conn').innerText = `${info.active_cons} / ${info.max_connections}`;

  const expEl = document.getElementById('info-exp');
  if (!info.exp_date || info.exp_date === "null") {
    expEl.innerText = "غير محدود (Unlimited)";
  } else {
    const d = new Date(parseInt(info.exp_date) * 1000);
    expEl.innerText = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

// 3. التبديل بين التبويبات
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = e.currentTarget;
    target.classList.add('active');
    
    currentTab = target.dataset.type;
    searchInput.value = '';

    if (currentTab === 'fav') {
      renderCategoryOptions([]);
      renderList(favorites);
      return;
    }

    const actions = {
      live: { cat: 'get_live_categories', stream: 'get_live_streams' },
      movie: { cat: 'get_vod_categories', stream: 'get_vod_streams' },
      series: { cat: 'get_series_categories', stream: 'get_series' }
    };

    if (rawData[currentTab].length === 0) {
      contentList.innerHTML = `<li style="justify-content:center;">جاري التحميل...</li>`;
      await loadTabCategories(currentTab, actions[currentTab].cat);
      await loadTabData(currentTab, actions[currentTab].stream);
    } else {
      renderCategoryOptions(categories[currentTab]);
      renderList(rawData[currentTab]);
    }
  });
});

async function loadTabCategories(type, action) {
  try {
    const req = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=${action}`;
    categories[type] = await fetchSafe(req);
    renderCategoryOptions(categories[type]);
  } catch (e) { console.error(e); }
}

async function loadTabData(type, action) {
  try {
    const req = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=${action}`;
    rawData[type] = await fetchSafe(req);
    renderList(rawData[type]);
  } catch (e) { console.error(e); }
}

function renderCategoryOptions(cats) {
  categorySelect.innerHTML = '<option value="">جميع الأقسام</option>';
  if (Array.isArray(cats)) {
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.category_id;
      opt.innerText = c.category_name;
      categorySelect.appendChild(opt);
    });
  }
}

// 4. عرض العناصر
function renderList(items) {
  contentList.innerHTML = '';
  if (!items || items.length === 0) {
    contentList.innerHTML = `<li style="justify-content:center; color:#777;">لا توجد عناصر</li>`;
    return;
  }

  items.slice(0, 300).forEach(item => {
    const li = document.createElement('li');
    const iconUrl = item.stream_icon || item.cover || 'https://via.placeholder.com/35';
    const title = item.name || item.title;

    li.innerHTML = `
      <img src="${iconUrl}" onerror="this.src='https://via.placeholder.com/35'" />
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${title}</span>
    `;

    li.addEventListener('click', () => {
      document.querySelectorAll('.content-list li').forEach(el => el.classList.remove('active'));
      li.classList.add('active');
      playItem(item);
    });

    contentList.appendChild(li);
  });
}

// 5. البحث والتصفية
searchInput.addEventListener('input', filterContent);
categorySelect.addEventListener('change', filterContent);

function filterContent() {
  const query = searchInput.value.toLowerCase();
  const catId = categorySelect.value;
  let source = currentTab === 'fav' ? favorites : rawData[currentTab];

  if (!Array.isArray(source)) return;

  let filtered = source.filter(item => {
    const name = (item.name || item.title || '').toLowerCase();
    const matchName = name.includes(query);
    const matchCat = catId ? item.category_id === catId : true;
    return matchName && matchCat;
  });

  renderList(filtered);
}

// 6. تشغيل الفيديو
function playItem(item) {
  activeItem = item;
  const title = item.name || item.title;
  currentTitle.innerText = title;
  updateFavButton();

  let rawStreamUrl = '';
  const { url, username, password } = credentials;

  if (currentTab === 'live') {
    rawStreamUrl = `${url}/live/${username}/${password}/${item.stream_id}.m3u8`;
  } else if (currentTab === 'movie') {
    const ext = item.container_extension || 'mp4';
    rawStreamUrl = `${url}/movie/${username}/${password}/${item.stream_id}.${ext}`;
  } else if (currentTab === 'series') {
    alert("قسم المسلسلات يعمل كدليل، اختر من الأفلام أو البث المباشر للتشغيل الفوري!");
    return;
  }

  // تمرير رابط البث عبر البروكسي لضمان عمل الـ HTTP على Vercel (HTTPS)
  const streamUrl = CORS_PROXY + encodeURIComponent(rawStreamUrl);

  if (rawStreamUrl.endsWith('.m3u8') && Hls.isSupported()) {
    if (hlsPlayer) hlsPlayer.destroy();
    hlsPlayer = new Hls();
    hlsPlayer.loadSource(streamUrl);
    hlsPlayer.attachMedia(video);
    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => video.play());
  } else {
    if (hlsPlayer) hlsPlayer.destroy();
    video.src = streamUrl;
    video.play();
  }
}

// 7. إدارـة المفضلة
favBtn.addEventListener('click', () => {
  if (!activeItem) return;
  const id = activeItem.stream_id || activeItem.series_id;
  const index = favorites.findIndex(f => (f.stream_id || f.series_id) === id);

  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(activeItem);
  }

  localStorage.setItem('montana_favs', JSON.stringify(favorites));
  updateFavButton();
  if (currentTab === 'fav') renderList(favorites);
});

function updateFavButton() {
  if (!activeItem) return;
  const id = activeItem.stream_id || activeItem.series_id;
  const isFav = favorites.some(f => (f.stream_id || f.series_id) === id);
  favBtn.innerHTML = isFav 
    ? `<i class="fa-solid fa-star" style="color:#ffca28;"></i> إزالة من المفضلة`
    : `<i class="fa-regular fa-star"></i> إضافة للمفضلة`;
}

// تسجيل الخروج
document.getElementById('logout-btn').addEventListener('click', () => location.reload());
