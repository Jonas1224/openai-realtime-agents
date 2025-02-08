import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCcJQx5v_LgMtesc4yBJHiJSQbPJYx74Es",
  authDomain: "voiceagent-ed845.firebaseapp.com",
  projectId: "voiceagent-ed845",
  storageBucket: "voiceagent-ed845.firebasestorage.app",
  messagingSenderId: "691596197511",
  appId: "1:691596197511:web:bda3462f95819e9e06c222"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Connect to auth emulator in development
if (process.env.NODE_ENV === 'development') {
  // Uncomment the next line if you're using Firebase Emulator
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

export { auth }; 