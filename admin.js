// ত্রিপুরা প্রবাহ — Admin JS

const $ = id => document.getElementById(id);

let currentUser = null;
let unsubscribeNews = null;
let unsubscribeAds = null;
const ADMIN_SESSION_KEY = 'tripuraAdminUid';
const ADMIN_NEWS_PREVIEW_LIMIT = 8;
let adminNewsDocs = [];
let showAllAdminNews = false;

function safeText(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
}

const CATEGORY_ALIASES = {
    'রাজনীতি': 'দেশ',
    'জাতীয়': 'দেশ',
    'ব্যবসা': 'দেশ',
    'শিক্ষা': 'রাজ্য',
    'প্রযুক্তি': 'দেশ'
};

function normalizeCategory(category = 'দেশ') {
    return CATEGORY_ALIASES[category] || category || 'দেশ';
}

function setMessage(message, type = 'info') {
    const dashboard = $('dashboard');
    const dashboardVisible = dashboard && !dashboard.classList.contains('hidden');
    const el = dashboardVisible ? $('dashboard-message') : $('admin-message');
    if (!el) return;
    el.textContent = message;
    el.className = `admin-message ${type}`;
}

function setAdMessage(message, type = 'info') {
    const el = $('ad-message');
    if (!el) {
        setMessage(message, type);
        return;
    }
    el.textContent = message;
    el.className = `admin-message ad-message ${type}`;
}

function normalizeIndianPhone(input) {
    const digits = String(input || '').replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return '';
}

function phoneMatches(inputPhone, storedPhone) {
    return normalizeIndianPhone(inputPhone) === normalizeIndianPhone(storedPhone);
}

function showLogin() {
    $('login-card')?.classList.remove('hidden');
    $('dashboard')?.classList.add('hidden');
}

function showDashboard(user) {
    $('login-card')?.classList.add('hidden');
    $('dashboard')?.classList.remove('hidden');
    const info = $('admin-user');
    if (info) info.textContent = user.email || user.phoneNumber || user.uid;
    listenNews();
    listenAds();
}

async function getAdminDoc(user) {
    if (!user) return false;
    const doc = await db.collection('admins').doc(user.uid).get();
    if (!doc.exists || doc.data().active === false) return null;
    return doc;
}

async function isAdmin(user) {
    return !!(await getAdminDoc(user));
}

async function handleEmailLogin(event) {
    event.preventDefault();
    setMessage('লগইন হচ্ছে...');
    const email = $('admin-email').value.trim();
    const password = $('admin-password').value;
    const phone = normalizeIndianPhone($('admin-phone').value);

    if (!phone) {
        setMessage('১০ সংখ্যার admin মোবাইল নম্বর দিন।', 'error');
        return;
    }

    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        const adminDoc = await getAdminDoc(cred.user);
        if (!adminDoc) {
            await auth.signOut();
            setMessage('এই অ্যাকাউন্টে admin অনুমতি নেই।', 'error');
            return;
        }
        const adminPhone = adminDoc.data().phone || adminDoc.data().mobile || adminDoc.data().phoneNumber;
        if (!adminPhone || !phoneMatches(phone, adminPhone)) {
            await auth.signOut();
            setMessage('Phone number admin record এর সাথে মিলছে না।', 'error');
            return;
        }

        currentUser = cred.user;
        sessionStorage.setItem(ADMIN_SESSION_KEY, cred.user.uid);
        setMessage('');
        showDashboard(cred.user);
    } catch (error) {
        console.error(error);
        setMessage(error.message || 'লগইন করা যায়নি।', 'error');
    }
}

function resetForm() {
    $('news-form')?.reset();
    $('news-id').value = '';
    $('news-published').checked = true;
    $('editor-title').textContent = 'নতুন সংবাদ';
}

function getGalleryImages() {
    return Array.from(document.querySelectorAll('.gallery-url-input'))
        .map(input => input.value.trim())
        .filter(Boolean);
}

function getVideoUrls() {
    return Array.from(document.querySelectorAll('.video-url-input'))
        .map(input => input.value.trim())
        .filter(Boolean);
}

function setGalleryImages(images = []) {
    document.querySelectorAll('.gallery-url-input').forEach((input, index) => {
        input.value = images[index] || '';
    });
}

function setVideoUrls(videos = []) {
    document.querySelectorAll('.video-url-input').forEach((input, index) => {
        input.value = videos[index] || '';
    });
}

function resetAdForm() {
    $('ad-form')?.reset();
    $('ad-id').value = '';
    $('ad-active').checked = true;
    $('ad-editor-title').textContent = 'নতুন বিজ্ঞাপন';
    setAdMessage('');
}

function wrapSelectedContent(before, after = before) {
    const input = $('news-content');
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = input.value.slice(start, end);
    const fallback = 'bold text';
    const formatted = selected
        ? selected.replace(/[^\r\n]+/g, text => `${before}${text}${after}`)
        : `${before}${fallback}${after}`;
    input.setRangeText(formatted, start, end, 'select');
    input.focus();

    if (!selected) {
        input.setSelectionRange(start + before.length, start + before.length + fallback.length);
    }
}

function setupContentToolbar() {
    $('bold-content-btn')?.addEventListener('click', () => wrapSelectedContent('**'));
}

async function handleSaveNews(event) {
    event.preventDefault();
    if (!currentUser) return;

    try {
        setMessage('সংবাদ সেভ হচ্ছে...');
        const id = $('news-id').value;
        const imageUrl = $('news-image-url').value.trim();
        const galleryImages = getGalleryImages();
        const videoUrls = getVideoUrls();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        const payload = {
            title: $('news-title').value.trim(),
            category: $('news-category').value,
            excerpt: $('news-excerpt').value.trim(),
            content: $('news-content').value.trim(),
            imageUrl,
            galleryImages,
            videoUrls,
            published: $('news-published').checked,
            featured: $('news-featured').checked,
            breaking: $('news-breaking').checked,
            updatedAt: now,
            updatedBy: currentUser.uid
        };

        if (id) {
            await db.collection('news').doc(id).update(payload);
            setMessage('সংবাদ আপডেট হয়েছে।', 'success');
        } else {
            payload.createdAt = now;
            payload.createdBy = currentUser.uid;
            payload.views = 0;
            await db.collection('news').add(payload);
            setMessage('নতুন সংবাদ প্রকাশ হয়েছে।', 'success');
        }
        resetForm();
    } catch (error) {
        console.error(error);
        setMessage(error.message || 'সংবাদ সেভ করা যায়নি।', 'error');
    }
}

async function handleSaveAd(event) {
    event.preventDefault();
    if (!currentUser) {
        setAdMessage('Admin session পাওয়া যায়নি। আবার লগইন করুন।', 'error');
        return;
    }

    try {
        setAdMessage('বিজ্ঞাপন সেভ হচ্ছে...');
        const id = $('ad-id').value;
        const title = $('ad-title').value.trim();
        const imageUrl = $('ad-image-url').value.trim();
        const linkUrl = $('ad-link-url').value.trim();

        if (!title) {
            setAdMessage('Advertiser / Title লিখুন।', 'error');
            return;
        }
        if (!imageUrl) {
            setAdMessage('বিজ্ঞাপনের জন্য poster image URL দিন।', 'error');
            return;
        }
        if (!/^https?:\/\//i.test(imageUrl)) {
            setAdMessage('Poster Image URL অবশ্যই http:// বা https:// দিয়ে শুরু হতে হবে।', 'error');
            return;
        }
        if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
            setAdMessage('Click Link URL অবশ্যই http:// বা https:// দিয়ে শুরু হতে হবে।', 'error');
            return;
        }

        const now = firebase.firestore.FieldValue.serverTimestamp();
        const payload = {
            title,
            imageUrl,
            linkUrl,
            active: $('ad-active').checked,
            updatedAt: now,
            updatedBy: currentUser.uid
        };

        if (id) {
            await db.collection('ads').doc(id).update(payload);
            setAdMessage('বিজ্ঞাপন আপডেট হয়েছে।', 'success');
        } else {
            payload.createdAt = now;
            payload.createdBy = currentUser.uid;
            await db.collection('ads').add(payload);
            setAdMessage('নতুন বিজ্ঞাপন সেভ হয়েছে।', 'success');
        }
        resetAdForm();
    } catch (error) {
        console.error(error);
        setAdMessage(error.message || 'বিজ্ঞাপন সেভ করা যায়নি।', 'error');
    }
}

function listenNews() {
    const list = $('admin-news-list');
    if (!list) return;
    if (unsubscribeNews) unsubscribeNews();
    unsubscribeNews = db.collection('news')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot(snap => {
            if (snap.empty) {
                list.innerHTML = '<p class="muted">এখনও কোনো সংবাদ নেই।</p>';
                updateNewsListToggle();
                return;
            }
            adminNewsDocs = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            renderAdminNewsList();
        }, error => {
            console.error(error);
            list.innerHTML = '<p class="muted">সংবাদ তালিকা লোড করা যাচ্ছে না।</p>';
        });
}

function renderAdminNewsList() {
    const list = $('admin-news-list');
    if (!list) return;
    const visibleDocs = showAllAdminNews ? adminNewsDocs : adminNewsDocs.slice(0, ADMIN_NEWS_PREVIEW_LIMIT);
    list.innerHTML = visibleDocs.map(doc => adminListItem(doc.id, doc.data)).join('');
    updateNewsListToggle();
}

function updateNewsListToggle() {
    const button = $('toggle-news-list');
    if (!button) return;
    if (adminNewsDocs.length <= ADMIN_NEWS_PREVIEW_LIMIT) {
        button.style.display = 'none';
        return;
    }
    button.style.display = 'inline-flex';
    button.textContent = showAllAdminNews ? 'Show Latest 8' : `View All (${adminNewsDocs.length})`;
}

function toggleAdminNewsList() {
    showAllAdminNews = !showAllAdminNews;
    renderAdminNewsList();
}

function listenAds() {
    const list = $('admin-ad-list');
    if (!list) return;
    if (unsubscribeAds) unsubscribeAds();
    unsubscribeAds = db.collection('ads')
        .limit(50)
        .onSnapshot(snap => {
            if (snap.empty) {
                list.innerHTML = '<p class="muted">এখনও কোনো বিজ্ঞাপন নেই।</p>';
                return;
            }
            list.innerHTML = snap.docs.map(doc => adminAdListItem(doc.id, doc.data())).join('');
        }, error => {
            console.error(error);
            list.innerHTML = '<p class="muted">বিজ্ঞাপন তালিকা লোড করা যাচ্ছে না।</p>';
        });
}

function adminListItem(id, data) {
    return `
    <article class="admin-news-item">
      <div>
        <span class="card-category-tag">${safeText(normalizeCategory(data.category || 'সংবাদ'))}</span>
        <h3>${safeText(data.title || '')}</h3>
        <p>${data.published ? 'Published' : 'Draft'} · ${data.breaking ? 'Breaking' : 'Regular'} · ${data.featured ? 'Featured' : 'Normal'}</p>
      </div>
      <div class="admin-row-actions">
        <button onclick="editNews('${id}')">Edit</button>
        <button onclick="togglePublish('${id}', ${data.published ? 'false' : 'true'})">${data.published ? 'Draft' : 'Publish'}</button>
        <button class="danger" onclick="deleteNews('${id}')">Delete</button>
      </div>
    </article>
  `;
}

function adminAdListItem(id, data) {
    return `
    <article class="admin-news-item">
      <div class="admin-ad-preview">
        ${data.imageUrl ? `<img src="${safeText(data.imageUrl)}" alt="${safeText(data.title || 'Ad')}">` : ''}
        <div>
          <span class="card-category-tag">${data.active ? 'Active' : 'Hidden'}</span>
          <h3>${safeText(data.title || '')}</h3>
          <p>${data.linkUrl ? safeText(data.linkUrl) : 'No click link'}</p>
        </div>
      </div>
      <div class="admin-row-actions">
        <button onclick="editAd('${id}')">Edit</button>
        <button onclick="toggleAd('${id}', ${data.active ? 'false' : 'true'})">${data.active ? 'Hide' : 'Show'}</button>
        <button class="danger" onclick="deleteAd('${id}')">Delete</button>
      </div>
    </article>
  `;
}

async function editNews(id) {
    const doc = await db.collection('news').doc(id).get();
    if (!doc.exists) return;
    const data = doc.data();
    $('news-id').value = id;
    $('news-title').value = data.title || '';
    $('news-category').value = normalizeCategory(data.category || 'দেশ');
    $('news-excerpt').value = data.excerpt || '';
    $('news-content').value = data.content || '';
    $('news-image-url').value = data.imageUrl || '';
    setGalleryImages(data.galleryImages || []);
    setVideoUrls(data.videoUrls || []);
    $('news-published').checked = data.published !== false;
    $('news-featured').checked = !!data.featured;
    $('news-breaking').checked = !!data.breaking;
    $('editor-title').textContent = 'সংবাদ এডিট';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function togglePublish(id, value) {
    await db.collection('news').doc(id).update({
        published: value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
    });
}

async function editAd(id) {
    const doc = await db.collection('ads').doc(id).get();
    if (!doc.exists) return;
    const data = doc.data();
    $('ad-id').value = id;
    $('ad-title').value = data.title || '';
    $('ad-image-url').value = data.imageUrl || '';
    $('ad-link-url').value = data.linkUrl || '';
    $('ad-active').checked = data.active !== false;
    $('ad-editor-title').textContent = 'বিজ্ঞাপন এডিট';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

async function toggleAd(id, value) {
    await db.collection('ads').doc(id).update({
        active: value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
    });
}

async function deleteAd(id) {
    if (!confirm('এই বিজ্ঞাপনটি ডিলিট করবেন?')) return;
    await db.collection('ads').doc(id).delete();
}

async function deleteNews(id) {
    if (!confirm('এই সংবাদটি ডিলিট করবেন?')) return;
    await db.collection('news').doc(id).delete();
}

async function logout() {
    if (unsubscribeNews) unsubscribeNews();
    if (unsubscribeAds) unsubscribeAds();
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    await auth.signOut();
    currentUser = null;
    showLogin();
}

function setupPasswordToggle() {
    const input = $('admin-password');
    const button = $('toggle-password');
    if (!input || !button) return;

    button.addEventListener('click', () => {
        const shouldShow = input.type === 'password';
        input.type = shouldShow ? 'text' : 'password';
        button.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
        button.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
        button.textContent = shouldShow ? '✕' : '👁';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupPasswordToggle();
    setupContentToolbar();
    $('email-login-form')?.addEventListener('submit', handleEmailLogin);
    $('news-form')?.addEventListener('submit', handleSaveNews);
    $('ad-form')?.addEventListener('submit', handleSaveAd);
    $('reset-form')?.addEventListener('click', resetForm);
    $('reset-ad-form')?.addEventListener('click', resetAdForm);
    $('logout-btn')?.addEventListener('click', logout);
    $('toggle-news-list')?.addEventListener('click', toggleAdminNewsList);

    auth.onAuthStateChanged(async user => {
        const adminUid = sessionStorage.getItem(ADMIN_SESSION_KEY);
        if (user && user.email && adminUid === user.uid && await isAdmin(user)) {
            currentUser = user;
            showDashboard(user);
        } else {
            showLogin();
        }
    });
});
