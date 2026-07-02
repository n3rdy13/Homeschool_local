import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Config parsed directly from firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0424420641",
  appId: "1:549993036457:web:d46bab653b4b63bfe847b8",
  apiKey: "AIzaSyBg-XSRiSa1xYltyNQw8-5LbErb_VnhA_M",
  authDomain: "gen-lang-client-0424420641.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-a8a18a95-7ea8-47e0-95ed-47fc4604aae3",
  storageBucket: "gen-lang-client-0424420641.firebasestorage.app",
  messagingSenderId: "549993036457",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
