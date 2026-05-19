// ত্রিপুরা প্রবাহ — Admin JS

const $ = id => document.getElementById(id);

let currentUser = null;
let recaptchaVerifier = null;
let confirmationResult = null;
let unsubscribeNews = null;
const OTP_SESSION_KEY = 'tripuraAdminOtpUid';

function safeText(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function setMessage(message, type = 'info') {
  const el = $('admin-message');
  if (!el) return;
  el.textContent = message;
  el.className = `admin-message ${type}`;
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

async function uploadImage(file) {
  if (!file) return '';
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '-').toLowerCase();
  const path = `news-images/${Date.now()}-${safeName}`;
  const snap = await storage.ref(path).put(file);
  return snap.ref.getDownloadURL();
}

async function handleSaveNews(event) {
  event.preventDefault();
  if (!currentUser) return;

  const id = $('news-id').value;
  const file = $('news-image-file').files[0];
  const uploadedUrl = await uploadImage(file);
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

  try {
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

async function deleteNews(id) {
  if (!confirm('এই সংবাদটি ডিলিট করবেন?')) return;
  await db.collection('news').doc(id).delete();
}

async function logout() {
  if (unsubscribeNews) unsubscribeNews();
  sessionStorage.removeItem(OTP_SESSION_KEY);
  await auth.signOut();
  currentUser = null;
  showLogin();
}

document.addEventListener('DOMContentLoaded', () => {
  $('email-login-form')?.addEventListener('submit', handleEmailLogin);
  $('otp-form')?.addEventListener('submit', handleOtp);
  $('news-form')?.addEventListener('submit', handleSaveNews);
  $('reset-form')?.addEventListener('click', resetForm);
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
