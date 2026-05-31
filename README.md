# Tripura Prabaha

**Tripura Prabaha** is a Bengali news website for publishing and reading news from Tripura, India, and beyond. The site is built with simple frontend technologies and Firebase, making it lightweight, fast, and deployable on GitHub Pages.

Live website: `https://www.tripuraprabaha.com/`

## Overview

This project provides a complete static news portal with an admin dashboard. Publishers can log in, create news posts, manage categories, add advertisements, attach images and videos by URL, and publish content instantly through Firebase Firestore.

The website is designed for Bengali readers and supports a classic red-and-white news layout with category navigation, breaking news, featured stories, article pages, sharing options, advertisements, and PWA installation support.

## Features

- Bengali news homepage with featured and latest news sections
- Category-wise news listing
- Single news article page
- Admin dashboard for publishing, editing, drafting, and deleting news
- Firebase Authentication based admin login
- Firestore based news, admin, and advertisement management
- Breaking news and featured news controls
- Multiple image URL support for each news article
- Video URL/embed support inside news content
- Advertisement poster management from the admin dashboard
- WhatsApp and Facebook sharing support
- PWA support with `manifest.json` and `service-worker.js`
- Responsive layout for mobile, tablet, and desktop
- GitHub Pages compatible deployment

## Tech Stack

- HTML5
- CSS3
- JavaScript
- Firebase Authentication
- Firebase Firestore
- Firebase SDK for Web
- GitHub Pages
- PWA manifest and service worker

## Project Structure

```text
tripura-prabaha/
+-- index.html              # Homepage
+-- news.html               # Single news article page
+-- category.html           # Category-wise news listing page
+-- admin.html              # Admin login and dashboard
+-- app.js                  # Main frontend rendering and Firebase read logic
+-- admin.js                # Admin dashboard logic
+-- firebase-config.js      # Firebase project configuration
+-- firestore.rules         # Firestore security rules
+-- storage.rules           # Firebase Storage rules
+-- manifest.json           # PWA app manifest
+-- service-worker.js       # Offline/cache support
+-- css/
|   +-- style.css           # Main stylesheet
+-- assets/
    +-- images/             # Static project images/icons
```

## Categories

news categories:

- দেশ
- রাজ্য
- জেলা
- আন্তর্জাতিক
- স্বাস্থ্য
- বিনোদন
- খেলাধুলা
- সম্পাদকীয়


## Firebase Setup

Create a Firebase project and enable the following services:

1. **Authentication**
   - Enable Email/Password sign-in.

2. **Cloud Firestore**
   - Create a Firestore database.
   - Add an admin document under the `admins` collection using the Firebase Auth user UID.

Example admin document:

```text
Collection: admins
Document ID: Firebase Auth UID

active: true
phone: "9876543210"
```

3. **Firestore Rules**
   - Deploy or copy the rules from `firestore.rules`.
   - Public users can read published news and active ads.
   - Only admins can create, update, or delete news and ads.

## Firebase Config

Update `firebase-config.js` with your Firebase web app configuration:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Firebase web config is safe to keep in frontend code, but Firestore security rules must be configured properly.

## Admin Workflow

1. Open `admin.html`.
2. Log in with the registered admin email and password.
3. Enter the registered admin phone number.
4. Create or edit a news post.
5. Add title, category, excerpt, content, image URLs, optional video URLs, and publish status.
6. Save the news.

For article media placement, the editor can use markers inside the news content:

```text
[image1]
[image2]
[image3]
[image4]
[video1]
[video2]
```

These markers allow the publisher to place related images or videos exactly where they fit in the story.

## Image and Video Uploading

This project currently uses URL-based media. Upload images or videos to an external hosting service such as Cloudinary, then paste the generated URL into the admin dashboard.

Firebase Storage upload is not required for the current free setup.

## Advertisement Management

Admins can add advertisement posters from the dashboard using:

- Advertiser/title
- Poster image URL
- Optional click link URL
- Active/inactive status

Active ads are shown on the website sidebar.

## Local Development

Because the project uses Firebase and browser APIs, run it through a local server instead of opening files directly.

Example using VS Code Live Server:

1. Open the project folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html`.
4. Select **Open with Live Server**.

## Deployment

This project can be deployed directly with GitHub Pages.

Basic steps:

1. Push the project to a GitHub repository.
2. Go to repository **Settings**.
3. Open **Pages**.
4. Select the `main` branch.
5. Set the folder to `/` or root.
6. Save and wait for GitHub Pages to publish the site.

After deployment, add the live domain to Firebase authorized domains:

```text
Firebase Console > Authentication > Settings > Authorized domains
```

## PWA Support

The project includes:

- `manifest.json`
- `service-worker.js`

This allows the website to be installed like an app on supported Android, iOS, Windows, and desktop browsers.

If updates do not appear immediately after deployment, clear browser cache or reopen the installed app.

## Security Notes

- Do not allow public write access to Firestore.
- Keep admin access limited to trusted Firebase Auth users.
- Add only real admin UID documents in the `admins` collection.
- Use strong passwords for admin accounts.
- Keep Firestore rules updated before going live.

## License

This project is developed for Tripura Prabaha. All news content, branding, and media rights belong to their respective owners.
