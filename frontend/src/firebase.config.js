import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCyIkOT4reUb3JRkJefke25j5JrNZDqjx0",
  authDomain: "reactoauth-7a653.firebaseapp.com",
  projectId: "reactoauth-7a653",
  storageBucket: "reactoauth-7a653.firebasestorage.app",
  messagingSenderId: "773570432382",
  appId: "1:773570432382:web:ff1ab706160cc84145f72f",
  measurementId: "G-2WS60ESW2W",
};

const app = initializeApp(firebaseConfig);

isSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  })
  .catch(() => {
    // Analytics is optional for auth flows, so we silently skip unsupported environments.
  });

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });
githubProvider.setCustomParameters({ allow_signup: "true" });

export { app, auth, googleProvider, githubProvider };
