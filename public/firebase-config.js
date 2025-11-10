import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwafvR_SA8v_tsA_B0YhknMqlytMNUCQk",
  authDomain: "pos-bahaa.firebaseapp.com",
  projectId: "pos-bahaa",
  storageBucket: "pos-bahaa.appspot.com",
  messagingSenderId: "898451030919",
  appId: "1:898451030919:web:822b019b0b038081470922"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
