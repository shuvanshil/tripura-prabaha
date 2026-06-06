const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tripura-prabaha';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDKkQAV34aLQQ05kIRMAMN6C7R10g1gtR4';

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

function isSocialCrawler(userAgent = '') {
  return /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|SkypeUriPreview|Googlebot|bingbot/i.test(userAgent);
}

function firestoreValue(value) {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(firestoreValue);
  if ('mapValue' in value) return firestoreFields(value.mapValue.fields || {});
  return undefined;
}

function firestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, firestoreValue(value)])
  );
}

async function getNews(id) {
  const encodedId = encodeURIComponent(id);
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/news/${encodedId}?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    console.error('Firestore REST error:', response.status, text);
    return null;
  }

  const data = await response.json();
  return firestoreFields(data.fields || {});
}

module.exports = async function handler(req, res) {
  const id = req.query && req.query.id;
  const siteUrl = (process.env.SITE_URL || 'https://www.tripuraprabaha.com').replace(/\/$/, '');
  const encodedId = id ? encodeURIComponent(String(id)) : '';
  const articleUrl = `${siteUrl}/news.html?id=${encodedId}`;

  res.setHeader('Content-Type', 'text/html; charset=UTF-8');

  if (!id) {
    res.status(404).send('<h1>News not found</h1>');
    return;
  }

  try {
    if (!isSocialCrawler(req.headers['user-agent'] || '')) {
      res.writeHead(302, { Location: articleUrl });
      res.end();
      return;
    }

    const news = await getNews(String(id));

    if (!news || news.published === false) {
      res.status(404).send('<h1>News not found</h1>');
      return;
    }

    const shareUrl = `${siteUrl}/share/${encodedId}`;
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
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${title}">
  <meta property="og:url" content="${shareUrl}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
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
</body>
</html>`;

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('<h1>Share preview failed</h1>');
  }
};
