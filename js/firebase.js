/* Firebase, loaded from Google's CDN on boot (never in demo mode). Firestore
   and Auth calls go through the loaded modules: FS.getDocs(...), AU.signOut(...). */
import { FB_VERSION, FIREBASE_CONFIG, REQUIRE_LOGIN } from './config.js';
import { LANG } from './i18n.js';

export let db = null, FS = null, AU = null, auth = null;

export async function initFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
  const [appM, fsM, authM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js'),
    REQUIRE_LOGIN ? import(base + 'firebase-auth.js') : null]);
  const app = appM.initializeApp(FIREBASE_CONFIG);
  db = fsM.getFirestore(app); FS = fsM;
  if (REQUIRE_LOGIN) { auth = authM.getAuth(app); auth.languageCode = LANG; AU = authM; }
}
