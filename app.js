// ত্রিপুরা প্রবাহ — Main App JS

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const CATEGORIES = ['দেশ', 'জাতীয়', 'রাজ্য', 'জেলা', 'সম্পাদকীয়', 'খেলাধুলা', 'বিনোদন', 'আন্তর্জাতিক', 'স্বাস্থ্য'];
const CATEGORY_ALIASES = {
    'রাজনীতি': 'জাতীয়',
    'ব্যবসা': 'দেশ',
    'শিক্ষা': 'রাজ্য',
    'প্রযুক্তি': 'দেশ'
};
const PLACEHOLDER = 'https://placehold.co/800x520/C8102E/ffffff?text=%E0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A6%BF%E0%A6%AA%E0%A7%81%E0%A6%B0%E0%A6%BE+%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%AC%E0%A6%BE%E0%A6%B9';

let lastVisible = null;
let currentCategory = 'all';
let activeCategoryPage = '';
let homeArticleCache = [];
let categoryArticleCache = [];
let homePage = 0;
let categoryPage = 0;
const PAGE_SIZE = 8;

function safeText(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
}

function normalizeCategory(category = 'সংবাদ') {
    return CATEGORY_ALIASES[category] || category || 'সংবাদ';
}

function enc(value = '') {
    return encodeURIComponent(String(value));
}

function safeImg(url) {
    return url || PLACEHOLDER;
}

function pageUrl(path) {
    return new URL(path, window.location.href).href;
}

function setMeta(selector, value) {
    let el = document.head.querySelector(selector);
    if (!el) {
        el = document.createElement('meta');
        const propertyMatch = selector.match(/property="([^"]+)"/);
        const nameMatch = selector.match(/name="([^"]+)"/);
        if (propertyMatch) el.setAttribute('property', propertyMatch[1]);
        if (nameMatch) el.setAttribute('name', nameMatch[1]);
        document.head.appendChild(el);
    }
    el.setAttribute('content', value || '');
}

function updateArticleMeta(article) {
    const title = article.title || 'সংবাদ | ত্রিপুরা প্রবাহ';
    const description = article.excerpt || (article.content ? `${article.content.substring(0, 150)}...` : 'ত্রিপুরা, দেশ ও বিশ্বের নির্ভরযোগ্য বাংলা সংবাদ।');
    const image = article.imageUrl ? new URL(article.imageUrl, window.location.href).href : pageUrl('assets/images/icon.jpeg');
    const url = window.location.href;

    document.title = `${title} | ত্রিপুরা প্রবাহ`;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[property="og:image:secure_url"]', image);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', image);
}

function timeAgo(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'এইমাত্র';
    if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} দিন আগে`;
    return date.toLocaleDateString('bn-BD');
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showToast(msg, duration = 3000) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function shareWhatsApp(title, url) {
    const text = encodeURIComponent(`${title}\n\nপড়ুন: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
}

function shareFacebook(url) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
}

function shareTwitter(title, url) {
    const text = encodeURIComponent(`${title} ${url}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener');
}

function shareGeneral(title, url) {
    if (navigator.share) {
        navigator.share({ title, url }).catch(() => { });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => showToast('লিংক কপি হয়েছে!'));
    }
}

function buildNewsCard(article) {
    const title = safeText(article.title);
    const shareTitle = enc(article.title || '');
    const category = safeText(normalizeCategory(article.category || 'সংবাদ'));
    const url = `news.html?id=${encodeURIComponent(article.id)}`;
    const absoluteUrl = pageUrl(url);
    const excerpt = safeText(article.excerpt || (article.content ? `${article.content.substring(0, 110)}...` : ''));

    return `
    <article class="news-card" onclick="location.href='${url}'">
      <div class="news-card-img-wrap">
        <img class="news-card-img" src="${safeImg(article.imageUrl)}" alt="${title}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
      </div>
      <div class="news-card-body">
        <span class="card-category-tag">${category}</span>
        <h3 class="news-card-title">${title}</h3>
        <p class="news-card-excerpt">${excerpt}</p>
        <div class="news-card-footer">
          <span class="read-more">পড়ুন →</span>
          <div class="share-btns" onclick="event.stopPropagation()">
            <button class="share-btn whatsapp" title="WhatsApp এ শেয়ার" onclick="shareWhatsApp(decodeURIComponent('${shareTitle}'), decodeURIComponent('${enc(absoluteUrl)}'))">W</button>
            <button class="share-btn facebook" title="Facebook এ শেয়ার" onclick="shareFacebook(decodeURIComponent('${enc(absoluteUrl)}'))">f</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function buildListItem(article) {
    const title = safeText(article.title);
    const url = `news.html?id=${encodeURIComponent(article.id)}`;
    return `
    <article class="news-list-item" onclick="location.href='${url}'">
      <img class="news-list-img" src="${safeImg(article.imageUrl)}" alt="${title}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
      <div class="news-list-body">
        <span class="card-category-tag">${safeText(normalizeCategory(article.category || 'সংবাদ'))}</span>
        <h3 class="news-list-title">${title}</h3>
        <div class="card-meta-dark"><span>${timeAgo(article.createdAt)}</span></div>
      </div>
    </article>
  `;
}

function buildSkeletonCards(count, container) {
    if (!container) return;
    container.innerHTML = Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line medium"></div>
      </div>
    </div>
  `).join('');
}

function setupTicker(articles) {
    const scroll = document.querySelector('.ticker-scroll');
    if (!scroll || !articles.length) return;
    const items = articles.slice(0, 10).map(a =>
        `<span class="ticker-item" onclick="location.href='news.html?id=${encodeURIComponent(a.id)}'">${safeText(a.title)}</span>`
    ).join('');
    scroll.innerHTML = items + items;
}

function articleDateValue(article) {
    const value = article.createdAt;
    if (!value) return 0;
    if (value.toMillis) return value.toMillis();
    if (value.toDate) return value.toDate().getTime();
    return new Date(value).getTime() || 0;
}

function sortByCreatedAt(articles) {
    return articles.sort((a, b) => articleDateValue(b) - articleDateValue(a));
}

function sortByViews(articles) {
    return articles.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
}

async function fetchPublishedNews(limit = 80) {
    const snap = await db.collection('news')
        .where('published', '==', true)
        .limit(limit)
        .get();
    return sortByCreatedAt(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

function renderHero(articles) {
    const hero = document.querySelector('.hero-grid');
    if (!hero || !articles.length) return;

    const main = articles[0];
    const mainUrl = `news.html?id=${encodeURIComponent(main.id)}`;
    const mainTitle = enc(main.title || '');
    document.querySelector('.hero-main').innerHTML = `
    <a href="${mainUrl}"><img src="${safeImg(main.imageUrl)}" alt="${safeText(main.title)}" onerror="this.src='${PLACEHOLDER}'"></a>
    <div class="card-overlay">
      <span class="card-category-tag">${safeText(normalizeCategory(main.category || 'সংবাদ'))}</span>
      <h1 class="card-title"><a href="${mainUrl}">${safeText(main.title)}</a></h1>
      <div class="card-meta">
        <span>${timeAgo(main.createdAt)}</span>
        <button onclick="event.stopPropagation(); shareWhatsApp(decodeURIComponent('${mainTitle}'), decodeURIComponent('${enc(pageUrl(mainUrl))}'))">WhatsApp শেয়ার</button>
      </div>
    </div>
  `;

    ['.hero-side-top', '.hero-side-bottom'].forEach((selector, index) => {
        const article = articles[index + 1];
        const el = document.querySelector(selector);
        if (!article || !el) return;
        const url = `news.html?id=${encodeURIComponent(article.id)}`;
        el.innerHTML = `
      <a href="${url}"><img src="${safeImg(article.imageUrl)}" alt="${safeText(article.title)}" onerror="this.src='${PLACEHOLDER}'"></a>
      <div class="card-info">
        <span class="card-category-tag">${safeText(normalizeCategory(article.category || 'সংবাদ'))}</span>
        <h2 class="card-title-dark"><a href="${url}">${safeText(article.title)}</a></h2>
        <div class="card-meta-dark"><span>${timeAgo(article.createdAt)}</span></div>
      </div>
    `;
    });
}

async function loadNews(category = 'all', reset = true) {
    const grid = $('news-grid');
    if (!grid) return;
    if (reset) {
        lastVisible = null;
        homePage = 0;
        buildSkeletonCards(8, grid);
    }

    try {
        if (reset) {
            const articles = await fetchPublishedNews(100);
            homeArticleCache = category === 'all' ? articles : articles.filter(a => normalizeCategory(a.category) === category);
        }
        renderPagedArticles(homeArticleCache, grid, $('load-more'), reset, () => homePage, value => { homePage = value; });
    } catch (err) {
        console.error('News load error:', err);
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>সংবাদ লোড করতে সমস্যা হচ্ছে। Firebase index/config দেখে আবার চেষ্টা করুন।</p></div>';
    }
}

function renderPagedArticles(articles, grid, loadBtn, reset, getPage, setPage) {
    if (!articles.length) {
        if (reset) grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>কোনো সংবাদ পাওয়া যায়নি।</p></div>';
        if (loadBtn) loadBtn.style.display = 'none';
        return;
    }

    const page = getPage();
    const start = page * PAGE_SIZE;
    const nextPage = page + 1;
    const pageItems = articles.slice(start, start + PAGE_SIZE);
    const html = pageItems.map(buildNewsCard).join('');
    if (reset) grid.innerHTML = html;
    else grid.insertAdjacentHTML('beforeend', html);
    setPage(nextPage);
    if (loadBtn) loadBtn.style.display = nextPage * PAGE_SIZE >= articles.length ? 'none' : 'inline-block';
}

async function loadHeroNews() {
    try {
        const all = await fetchPublishedNews(50);
        let articles = all.filter(a => a.featured).slice(0, 3);
        if (articles.length < 3) articles = all.slice(0, 3);
        renderHero(articles);
        setupTicker(articles);
    } catch (e) {
        console.error('Hero load error:', e);
    }
}

async function loadBreakingNews() {
    try {
        const all = await fetchPublishedNews(50);
        const articles = all.filter(a => a.breaking).slice(0, 10);
        if (articles.length) setupTicker(articles);
    } catch (e) {
        console.error('Breaking load error:', e);
    }
}

async function loadSidebar() {
    const popular = $('popular-list');
    loadAds();
    if (!popular) return;
    try {
        const articles = sortByViews(await fetchPublishedNews(80)).slice(0, 5);
        popular.innerHTML = articles.length ? articles.map((a, i) => `
      <article class="popular-item" onclick="location.href='news.html?id=${encodeURIComponent(a.id)}'">
        <div class="popular-num">${i + 1}</div>
        <h3 class="popular-title">${safeText(a.title)}</h3>
      </article>
    `).join('') : '<p class="muted">এখনও কোনো সংবাদ নেই।</p>';
    } catch (e) {
        console.error('Popular load error:', e);
    }
}

async function loadAds() {
    const list = $('ad-list');
    if (!list) return;
    try {
        const snap = await db.collection('ads')
            .where('active', '==', true)
            .limit(5)
            .get();
        const ads = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(ad => ad.imageUrl);
        if (!ads.length) {
            list.innerHTML = '<p class="muted">বিজ্ঞাপনের জন্য যোগাযোগ করুন।</p>';
            return;
        }
        list.innerHTML = ads.map(ad => {
            const image = safeImg(ad.imageUrl);
            const title = safeText(ad.title || 'বিজ্ঞাপন');
            const img = `<img src="${image}" alt="${title}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">`;
            return ad.linkUrl
                ? `<a class="ad-poster" href="${safeText(ad.linkUrl)}" target="_blank" rel="noopener">${img}</a>`
                : `<div class="ad-poster">${img}</div>`;
        }).join('');
    } catch (e) {
        console.error('Ad load error:', e);
        list.innerHTML = '<p class="muted">বিজ্ঞাপন লোড করা যাচ্ছে না।</p>';
    }
}

async function loadArticlePage() {
    const target = $('article-detail');
    if (!target) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) {
        target.innerHTML = '<div class="empty-state"><p>সংবাদ আইডি পাওয়া যায়নি।</p></div>';
        return;
    }

    try {
        const ref = db.collection('news').doc(id);
        const doc = await ref.get();
        if (!doc.exists || doc.data().published === false) {
            target.innerHTML = '<div class="empty-state"><p>সংবাদটি পাওয়া যায়নি।</p></div>';
            return;
        }

        const article = { id: doc.id, ...doc.data() };
        ref.update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => { });
        updateArticleMeta(article);
        renderArticle(article, target);
        loadRelated(article);
    } catch (e) {
        console.error('Article load error:', e);
        target.innerHTML = '<div class="empty-state"><p>সংবাদ লোড করতে সমস্যা হচ্ছে।</p></div>';
    }
}

function renderArticle(article, target) {
    const url = location.href;
    const shareTitle = enc(article.title || '');
    const shareUrl = enc(url);
    const rawContent = article.content || '';
    const paragraphs = safeText(rawContent).split(/\n{2,}|\r?\n/).filter(Boolean);
    const galleryImages = Array.isArray(article.galleryImages)
        ? article.galleryImages.filter(Boolean)
        : [];
    const videoUrls = Array.isArray(article.videoUrls)
        ? article.videoUrls.filter(Boolean)
        : [];
    const articleBody = buildArticleBody(rawContent, galleryImages, videoUrls, article.title);
    target.classList.remove('skeleton-article');
    target.innerHTML = `
    <div class="article-kicker">${safeText(normalizeCategory(article.category || 'সংবাদ'))}</div>
    <h1>${safeText(article.title)}</h1>
    <div class="article-meta">
      <span>${formatDate(article.createdAt)} · ${timeAgo(article.createdAt)}</span>
      <span> ~ ত্রিপুরা প্রবাহ প্রতিবেদন</span>
    </div>
    <img class="article-image" src="${safeImg(article.imageUrl)}" alt="${safeText(article.title)}" onerror="this.src='${PLACEHOLDER}'">
    ${article.excerpt ? `<p class="article-excerpt">${safeText(article.excerpt)}</p>` : ''}
    <div class="article-share">
      <button onclick="shareWhatsApp(decodeURIComponent('${shareTitle}'), decodeURIComponent('${shareUrl}'))">WhatsApp</button>
      <button onclick="shareFacebook(decodeURIComponent('${shareUrl}'))">Facebook</button>
      <button onclick="shareTwitter(decodeURIComponent('${shareTitle}'), decodeURIComponent('${shareUrl}'))">X</button>
      <button onclick="shareGeneral(decodeURIComponent('${shareTitle}'), decodeURIComponent('${shareUrl}'))">Share</button>
    </div>
    <div class="article-content">${articleBody.html}</div>
    ${articleBody.remainingHtml}
  `;
}

function buildInlineImage(image, title, index) {
    return `
      <figure class="article-inline-image">
        <img src="${safeImg(image)}" alt="${safeText(title)} ছবি ${index + 1}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
      </figure>
    `;
}

function buildVideoEmbed(url, title, index) {
    const safeUrl = safeText(url);
    const youtube = getYouTubeEmbedUrl(url);
    if (youtube) {
        return `
          <figure class="article-video">
            <iframe src="${safeText(youtube)}" title="${safeText(title)} ভিডিও ${index}" loading="lazy" allowfullscreen></iframe>
          </figure>
        `;
    }
    return `
      <figure class="article-video">
        <video src="${safeUrl}" controls preload="metadata"></video>
      </figure>
    `;
}

function getYouTubeEmbedUrl(url) {
    try {
        const parsed = new URL(url);
        let id = '';
        if (parsed.hostname.includes('youtu.be')) {
            id = parsed.pathname.replace('/', '');
        } else if (parsed.hostname.includes('youtube.com')) {
            id = parsed.searchParams.get('v') || parsed.pathname.split('/').pop();
        }
        return id ? `https://www.youtube.com/embed/${id}` : '';
    } catch {
        return '';
    }
}

function buildArticleBody(rawContent, galleryImages, videoUrls, title) {
    const markerRegex = /\[(image|ছবি|video|ভিডিও)\s*([1-4])\]/ig;
    const hasMarkers = markerRegex.test(rawContent);
    const used = new Set();
    const usedVideos = new Set();

    if (!hasMarkers) {
        const paragraphs = safeText(rawContent).split(/\n{2,}|\r?\n/).filter(Boolean);
        const html = paragraphs.map((paragraph, index) => `
          <p>${paragraph}</p>
          ${galleryImages[index] ? buildInlineImage(galleryImages[index], title, index + 1) : ''}
          ${videoUrls[index] ? buildVideoEmbed(videoUrls[index], title, index + 1) : ''}
        `).join('');
        const remainingHtml = buildRemainingGallery(galleryImages.slice(paragraphs.length), title, paragraphs.length + 1);
        const remainingVideosHtml = buildRemainingVideos(videoUrls.slice(paragraphs.length), title, paragraphs.length + 1);
        return { html, remainingHtml: remainingHtml + remainingVideosHtml };
    }

    const blocks = rawContent.split(/\n{2,}|\r?\n/).filter(Boolean);
    const html = blocks.map(block => {
        let output = '';
        let lastIndex = 0;
        block.replace(markerRegex, (match, type, num, offset) => {
            const before = block.slice(lastIndex, offset).trim();
            if (before) output += `<p>${safeText(before)}</p>`;
            const itemIndex = Number(num) - 1;
            if (type.toLowerCase() === 'video' || type === 'ভিডিও') {
                const video = videoUrls[itemIndex];
                if (video) {
                    usedVideos.add(itemIndex);
                    output += buildVideoEmbed(video, title, itemIndex + 1);
                }
            } else {
                const image = galleryImages[itemIndex];
                if (image) {
                    used.add(itemIndex);
                    output += buildInlineImage(image, title, itemIndex + 1);
                }
            }
            lastIndex = offset + match.length;
            return match;
        });
        const after = block.slice(lastIndex).trim();
        if (after) output += `<p>${safeText(after)}</p>`;
        return output;
    }).join('');

    const remainingImages = galleryImages.filter((_, index) => !used.has(index));
    const remainingVideos = videoUrls.filter((_, index) => !usedVideos.has(index));
    return {
        html,
        remainingHtml: buildRemainingGallery(remainingImages, title, used.size + 1) + buildRemainingVideos(remainingVideos, title, usedVideos.size + 1)
    };
}

function buildRemainingGallery(images, title, startIndex = 1) {
    if (!images.length) return '';
    return `
      <div class="article-gallery">
        ${images.map((image, index) => `
          <img src="${safeImg(image)}" alt="${safeText(title)} ছবি ${startIndex + index + 1}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
        `).join('')}
      </div>
    `;
}

function buildRemainingVideos(videos, title, startIndex = 1) {
    if (!videos.length) return '';
    return videos.map((video, index) => buildVideoEmbed(video, title, startIndex + index)).join('');
}

async function loadRelated(article) {
    const list = $('related-list');
    if (!list) return;
    try {
        const articles = (await fetchPublishedNews(80))
            .filter(a => a.id !== article.id)
            .filter(a => !article.category || normalizeCategory(a.category) === normalizeCategory(article.category))
            .slice(0, 4);
        list.innerHTML = articles.length ? articles.map(buildListItem).join('') : '<p class="muted">আরও সংবাদ নেই।</p>';
    } catch (e) {
        console.error('Related load error:', e);
    }
}

async function loadCategoryPage(reset = true) {
    const grid = $('category-grid');
    if (!grid) return;
    activeCategoryPage = normalizeCategory(new URLSearchParams(location.search).get('cat') || CATEGORIES[0]);
    const title = $('category-title');
    if (title) title.textContent = `${activeCategoryPage} সংবাদ`;
    document.title = `${activeCategoryPage} | ত্রিপুরা প্রবাহ`;
    $$('.nav-links a[data-cat]').forEach(a => a.classList.toggle('active', normalizeCategory(a.dataset.cat) === activeCategoryPage));

    if (reset) {
        categoryPage = 0;
        buildSkeletonCards(8, grid);
    }

    try {
        if (reset) {
            categoryArticleCache = (await fetchPublishedNews(100)).filter(a => normalizeCategory(a.category) === activeCategoryPage);
        }
        renderPagedArticles(categoryArticleCache, grid, $('category-load-more'), reset, () => categoryPage, value => { categoryPage = value; });
    } catch (e) {
        console.error('Category load error:', e);
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>এই বিভাগের সংবাদ লোড করা যাচ্ছে না।</p></div>';
    }
}

function setupCategoryFilter() {
    $$('.nav-links a[data-cat]').forEach(link => {
        link.addEventListener('click', e => {
            if (!$('news-grid')) return;
            e.preventDefault();
            $$('.nav-links a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentCategory = link.dataset.cat;
            loadNews(currentCategory, true);
        });
    });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = $('install-banner');
    if (banner) banner.classList.add('show');
});

function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(result => {
        if (result.outcome === 'accepted') showToast('অ্যাপ ইনস্টল হচ্ছে...');
        deferredPrompt = null;
        const banner = $('install-banner');
        if (banner) banner.classList.remove('show');
    });
}

window.addEventListener('appinstalled', () => {
    showToast('ত্রিপুরা প্রবাহ অ্যাপ ইনস্টল সম্পন্ন!');
    const banner = $('install-banner');
    if (banner) banner.classList.remove('show');
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swPath = `${location.pathname.replace(/\/[^/]*$/, '/') || '/'}service-worker.js`;
        navigator.serviceWorker.register(swPath).catch(err => console.log('SW error:', err));
    });
}

function setDate() {
    const el = document.querySelector('.top-date');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function setYear() {
    const year = $('year');
    if (year) year.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
    setDate();
    setYear();

    if (document.querySelector('.hero-grid')) {
        loadHeroNews();
        loadBreakingNews();
        loadSidebar();
        loadNews('all', true);
        setupCategoryFilter();
        const loadBtn = $('load-more');
        if (loadBtn) loadBtn.addEventListener('click', () => loadNews(currentCategory, false));
    }

    if ($('article-detail')) {
        loadArticlePage();
        loadSidebar();
    }

    if ($('category-grid')) {
        loadCategoryPage(true);
        loadAds();
        const loadBtn = $('category-load-more');
        if (loadBtn) loadBtn.addEventListener('click', () => loadCategoryPage(false));
    }
});

 
