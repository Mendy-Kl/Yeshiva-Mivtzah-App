import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const login = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  try {
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      return; // Ignore user cancellation 
    }
    console.error("Login failed", error);
    
    let errorMessage = "אירעה שגיאה בהתחברות.";
    
    if (error.code === 'auth/unauthorized-domain') {
      errorMessage = "שגיאה: התחברות לא מורשית מהדומיין הזה. עליך להוסיף את הכתובת של האתר לרשימת ה-Authorized Domains במסוף Firebase (תחת Authentication -> Settings).";
    } else if (error.code === 'auth/popup-blocked' || error.code === 'auth/network-request-failed' || error.message?.includes('missing initial state')) {
      errorMessage = "שגיאה מערכתית בהתחברות (auth/network-request-failed).\nהדפדפן חוסם חיבור צד-שלישי כי האתר פתוח בתוך מסגרת (iFrame) או במצב גלישה בסתר/חסימת עוגיות.\nאנא פתח את האתר בחלון חדש (דרך התפריט העליון או הכפתור למעלה).";
    } else {
      errorMessage += "\n" + (error.message || error.code || "");
    }
    
    alert(errorMessage);
  }
};

export const loginRedirect = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  try {
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error("Redirect redirect failed", error);
    alert("שגיאה בהפניה להתחברות. אנא פתח בדפדפן חלון חדש.");
  }
};

export const logout = async () => {
  await auth.signOut();
};
