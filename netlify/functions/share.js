const admin = require('firebase-admin');

function getFirebaseApp() {
  if (admin.apps.length) return admin.app();

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    })
  });

  return admin.app();
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function stripText(value = '') {
  return String(value)
    .replace(/\[(image|ছবি|video|ভিডিও)\s*[1-4]\]/ig, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(url, siteUrl) {
  if (!url) return `${siteUrl}/assets/images/icon.jpeg`;
  try {
    return new URL(url, siteUrl).href;
  } catch {
    return `${siteUrl}/assets/images/icon.jpeg`;
  }
}

exports.handler = async event => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  const siteUrl = (process.env.SITE_URL || 'https://www.tripuraprabaha.com').replace(/\/$/, '');

  if (!id) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      body: '<h1>News not found</h1>'
    };
  }

  try {
    getFirebaseApp();
    const doc = await admin.firestore().collection('news').doc(id).get();

    if (!doc.exists || doc.data().published === false) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
        body: '<h1>News not found</h1>'
      };
    }

    const news = doc.data();
    const articleUrl = `${siteUrl}/news.html?id=${encodeURIComponent(id)}`;
    const shareUrl = `${siteUrl}/share/${encodeURIComponent(id)}`;
    const title = escapeHtml(news.title || 'সংবাদ | ত্রিপুরা প্রবাহ');
    const description = escapeHtml(
      stripText(news.excerpt || news.content || 'ত্রিপুরা, দেশ ও বিশ্বের নির্ভরযোগ্য বাংলা সংবাদ।').slice(0, 180)
    );
    const image = escapeHtml(absoluteUrl(news.imageUrl, siteUrl));

    const html = `<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | ত্রিপুরা প্রবাহ</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${articleUrl}">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Tripura Prabaha">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:url" content="${shareUrl}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">

  <meta http-equiv="refresh" content="1;url=${articleUrl}">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #111; }
    img { width: 100%; max-width: 720px; height: auto; display: block; margin: 20px 0; }
    a { color: #c8102e; font-weight: 700; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${image}" alt="${title}">
  <p><a href="${articleUrl}">সংবাদটি পড়ুন</a></p>
  <script>setTimeout(function(){ location.replace(${JSON.stringify(articleUrl)}); }, 600);</script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=300'
      },
      body: html
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      body: '<h1>Share preview failed</h1>'
    };
  }
};
