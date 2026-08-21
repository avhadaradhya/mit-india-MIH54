import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase.config';
import { LanguageProvider } from './lib/i18n';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error", e);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center font-sans-custom">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-[#143D2B] border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-slate-550 font-bold">Connecting security keys...</p>
        </div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      {authUser ? (
        <Dashboard authUser={authUser} handleLogout={handleLogout} />
      ) : (
        <Login />
      )}
    </LanguageProvider>
  );
}

export default App;
