// ত্রিপুরা প্রবাহ — Admin JS

const $ = id => document.getElementById(id);

let currentUser = null;
let recaptchaVerifier = null;
let confirmationResult = null;
let unsubscribeNews = null;
let unsubscribeAds = null;
const OTP_SESSION_KEY = 'tripuraAdminOtpUid';

function safeText(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
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

async function isAdmin(user) {
    if (!user) return false;
    const doc = await db.collection('admins').doc(user.uid).get();
    return doc.exists && doc.data().active !== false;
}

function setupRecaptcha() {
    if (recaptchaVerifier) return recaptchaVerifier;
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'normal',
        callback: () => setMessage('reCAPTCHA সম্পন্ন হয়েছে।', 'success')
    });
    recaptchaVerifier.render();
    return recaptchaVerifier;
}

async function handleEmailLogin(event) {
    event.preventDefault();
    setMessage('লগইন হচ্ছে...');
    const email = $('admin-email').value.trim();
    const password = $('admin-password').value;
    const phone = $('admin-phone').value.trim();

    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        if (!(await isAdmin(cred.user))) {
            await auth.signOut();
            setMessage('এই অ্যাকাউন্টে admin অনুমতি নেই। Firestore admins collection দেখুন।', 'error');
            return;
        }

        setupRecaptcha();
        confirmationResult = await auth.signInWithPhoneNumber(phone, recaptchaVerifier);
        currentUser = cred.user;
        $('otp-form')?.classList.remove('hidden');
        setMessage('OTP পাঠানো হয়েছে। কোড লিখে যাচাই করুন।', 'success');
    } catch (error) {
        console.error(error);
        setMessage(error.message || 'লগইন করা যায়নি।', 'error');
        if (recaptchaVerifier) recaptchaVerifier.clear();
        recaptchaVerifier = null;
    }
}

async function handleOtp(event) {
    event.preventDefault();
    const code = $('admin-otp').value.trim();
    if (!confirmationResult) {
        setMessage('আগে OTP পাঠান।', 'error');
        return;
    }

    try {
        await confirmationResult.confirm(code);
        const email = $('admin-email').value.trim();
        const password = $('admin-password').value;
        const cred = await auth.signInWithEmailAndPassword(email, password);
        if (!(await isAdmin(cred.user))) {
            await auth.signOut();
            setMessage('Admin অনুমতি পাওয়া যায়নি।', 'error');
            return;
        }
        currentUser = cred.user;
        sessionStorage.setItem(OTP_SESSION_KEY, cred.user.uid);
        setMessage('');
        showDashboard(cred.user);
    } catch (error) {
        console.error(error);
        setMessage(error.message || 'OTP যাচাই করা যায়নি।', 'error');
    }
}

function resetForm() {
    $('news-form')?.reset();
    $('news-id').value = '';
    $('news-published').checked = true;
    $('editor-title').textContent = 'নতুন সংবাদ';
}

function resetAdForm() {
    $('ad-form')?.reset();
    $('ad-id').value = '';
    $('ad-active').checked = true;
    $('ad-editor-title').textContent = 'নতুন বিজ্ঞাপন';
    setAdMessage('');
}

async function uploadImage(file, folder = 'news-images') {
    if (!file) return '';
    if (!file.type || !file.type.startsWith('image/')) {
        throw new Error('শুধু image file upload করা যাবে।');
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size 5MB এর কম হতে হবে।');
    }
    const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '-').toLowerCase();
    const path = `${folder}/${Date.now()}-${safeName}`;
    const upload = storage.ref(path).put(file, { contentType: file.type });
    const snap = await Promise.race([
        upload,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Image upload timeout. Firebase Storage enabled/rules published আছে কিনা দেখুন।')), 45000))
    ]);
    return snap.ref.getDownloadURL();
}

async function handleSaveNews(event) {
    event.preventDefault();
    if (!currentUser) return;

    try {
        setMessage('সংবাদ সেভ হচ্ছে...');
        const id = $('news-id').value;
        const file = $('news-image-file').files[0];
        const uploadedUrl = file ? await uploadImage(file, 'news-images') : '';
        const imageUrl = uploadedUrl || $('news-image-url').value.trim();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        const payload = {
            title: $('news-title').value.trim(),
            category: $('news-category').value,
            excerpt: $('news-excerpt').value.trim(),
            content: $('news-content').value.trim(),
            imageUrl,
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
        const file = $('ad-image-file').files[0];
        const pastedUrl = $('ad-image-url').value.trim();
        const uploadedUrl = file ? await uploadImage(file, 'ad-images') : '';
        const imageUrl = uploadedUrl || pastedUrl;
        const linkUrl = $('ad-link-url').value.trim();

        if (!title) {
            setAdMessage('Advertiser / Title লিখুন।', 'error');
            return;
        }
        if (!imageUrl) {
            setAdMessage('বিজ্ঞাপনের জন্য poster image URL বা upload image দিন।', 'error');
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
                return;
            }
            list.innerHTML = snap.docs.map(doc => adminListItem(doc.id, doc.data())).join('');
        }, error => {
            console.error(error);
            list.innerHTML = '<p class="muted">সংবাদ তালিকা লোড করা যাচ্ছে না।</p>';
        });
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
        <span class="card-category-tag">${safeText(data.category || 'সংবাদ')}</span>
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
    $('news-category').value = data.category || 'রাজনীতি';
    $('news-excerpt').value = data.excerpt || '';
    $('news-content').value = data.content || '';
    $('news-image-url').value = data.imageUrl || '';
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
    sessionStorage.removeItem(OTP_SESSION_KEY);
    await auth.signOut();
    currentUser = null;
    showLogin();
}

document.addEventListener('DOMContentLoaded', () => {
    $('email-login-form')?.addEventListener('submit', handleEmailLogin);
    $('otp-form')?.addEventListener('submit', handleOtp);
    $('news-form')?.addEventListener('submit', handleSaveNews);
    $('ad-form')?.addEventListener('submit', handleSaveAd);
    $('reset-form')?.addEventListener('click', resetForm);
    $('reset-ad-form')?.addEventListener('click', resetAdForm);
    $('logout-btn')?.addEventListener('click', logout);

    auth.onAuthStateChanged(async user => {
        const otpUid = sessionStorage.getItem(OTP_SESSION_KEY);
        if (user && user.email && otpUid === user.uid && await isAdmin(user)) {
            currentUser = user;
            showDashboard(user);
        } else {
            showLogin();
        }
    });
});
