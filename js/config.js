/* Settings: Firebase project, sign-in, currency, limits, demo mode. */

/* ------------------------------------------------------------------ */
/* CONFIG: fill these in from Firebase Console > Project settings      */
/* ------------------------------------------------------------------ */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBKlMyKQvEkCehVsprPiRGFLVHlj0sZR-M',
  authDomain: 'pantau-gethyred.firebaseapp.com',
  projectId: 'pantau-gethyred',
  appId: '1:140675971652:web:84ed63ba5c38332b401a11'
};

/* Set to true to put a sign-in screen in front of the reports (and use the
   allowlist rules). false = anyone with the link can view. */
export const REQUIRE_LOGIN = true;

/* Shown before amounts on the Collection tab. */
export const CURRENCY = 'Rp';



/* Show the CCTV tab (the camera's picture, sent by cctv_feed.py). Needs the
   cctv_watch Firestore rule (see SETUP). */
export const SHOW_CCTV = false;

export const ALLOWED_SOURCES = ['overlay', 'emulator', 'video'];
export const MAX_DAYS = 60;
export const STALE_HOURS = 6;
export const PAGE_SIZE = 200;
export const FB_VERSION = '10.14.1';

export const params = new URLSearchParams(location.search);
export const placeholder = Object.values(FIREBASE_CONFIG).some(v => !v || /YOUR_|PLACEHOLDER|XXXX/i.test(String(v)));
export const DEMO = placeholder || params.get('demo') === '1';
