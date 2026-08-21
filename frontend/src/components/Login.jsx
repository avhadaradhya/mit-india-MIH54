import React, { useEffect, useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, githubProvider, googleProvider } from "../firebase.config";

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getPasswordChecks = (password) => ({
  minLength: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /\d/.test(password),
});

const getFirebaseMessage = (error) => {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/popup-closed-by-user":
      return "The popup was closed before sign in completed.";
    case "auth/account-exists-with-different-credential":
      return "This email is already linked with another sign-in method.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return error?.message || "Something went wrong. Please try again.";
  }
};

const Login = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [formData, setFormData] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authUser, setAuthUser] = useState(null);

  const isSignUp = activeTab === "create";
  const passwordChecks = getPasswordChecks(formData.password);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });

    return unsubscribe;
  }, []);

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    clearFeedback();
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const validateForm = () => {
    if (isSignUp && formData.name.trim().length < 3) {
      return "Full name should be at least 3 characters.";
    }

    if (!emailPattern.test(formData.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!passwordChecks.minLength) {
      return "Password should be at least 8 characters.";
    }

    if (isSignUp && !passwordChecks.uppercase) {
      return "Password must contain at least one uppercase letter.";
    }

    if (isSignUp && !passwordChecks.lowercase) {
      return "Password must contain at least one lowercase letter.";
    }

    if (isSignUp && !passwordChecks.number) {
      return "Password must contain at least one number.";
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      return "Password and confirm password must match.";
    }

    return "";
  };

  const applyPersistence = async () => {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearFeedback();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await applyPersistence();

      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );

        await updateProfile(result.user, {
          displayName: formData.name.trim(),
        });
        await sendEmailVerification(result.user);

        setMessage("Account created successfully. Verification email sent.");
        resetForm();
        setActiveTab("login");
      } else {
        await signInWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );

        setMessage("Login successful.");
        setFormData((prev) => ({
          ...prev,
          password: "",
          confirmPassword: "",
        }));
      }
    } catch (firebaseError) {
      setError(getFirebaseMessage(firebaseError));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    clearFeedback();
    setLoading(true);

    try {
      await applyPersistence();
      await signInWithPopup(auth, provider);
      setMessage("Login successful.");
    } catch (firebaseError) {
      setError(getFirebaseMessage(firebaseError));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    clearFeedback();

    if (!emailPattern.test(formData.email.trim())) {
      setError("Enter your email first to reset the password.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, formData.email.trim());
      setMessage("Password reset email sent.");
    } catch (firebaseError) {
      setError(getFirebaseMessage(firebaseError));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearFeedback();
    setLoading(true);

    try {
      await signOut(auth);
      setMessage("Logged out successfully.");
    } catch (firebaseError) {
      setError(getFirebaseMessage(firebaseError));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    clearFeedback();
    resetForm();
  };

  // If authenticated directly inside the login view, we can just show a transition state.
  // The parent shell will take care of rendering the main dashboard.
  if (authUser) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center px-4 font-sans-custom">
        <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#143D2B] flex items-center justify-center mx-auto border border-emerald-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#143D2B] font-serif-custom">Authenticating...</h2>
          <p className="text-xs text-slate-500 font-semibold">
            Connecting to your KrushakSetu Farmer profile.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-11 bg-rose-50 border border-rose-100 text-rose-700 font-bold rounded-xl text-xs hover:bg-rose-100 transition cursor-pointer min-h-[44px]"
          >
            Cancel & Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center px-4 font-sans-custom">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl">
        
        {/* Logo and Brand */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-md mx-auto mb-2">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#143D2B] font-serif-custom">KrushakSetu</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            AI-Driven Crop Price Forecasting & Market Routing
          </p>
        </div>

        {/* Tab Selection */}
        <div className="mb-6 flex w-fit mx-auto rounded-full border border-emerald-100 bg-emerald-50/50 p-1 select-none">
          <button
            type="button"
            onClick={() => switchTab("create")}
            className={`rounded-full px-5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              isSignUp
                ? "bg-[#143D2B] text-white shadow-sm"
                : "text-slate-500 hover:text-[#143D2B]"
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={`rounded-full px-5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              !isSignUp
                ? "bg-[#143D2B] text-white shadow-sm"
                : "text-slate-500 hover:text-[#143D2B]"
            }`}
          >
            Login
          </button>
        </div>

        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-slate-800 font-serif-custom">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-semibold">
            {isSignUp
              ? "Sign up to track and optimize your crop revenue."
              : "Access your saved alert settings and routes."}
          </p>
        </div>

        {/* Social Logins */}
        <div className="mb-5 flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => handleSocialLogin(googleProvider)}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer min-h-[44px] disabled:opacity-50"
          >
            {/* Google Vector Icon */}
            <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin(githubProvider)}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer min-h-[44px] disabled:opacity-50"
          >
            {/* GitHub Vector Icon */}
            <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.48 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        <div className="mb-4 flex items-center select-none">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-3 text-[10px] font-black uppercase text-slate-400">Or</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#143D2B] focus:bg-white min-h-[44px]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#143D2B] focus:bg-white min-h-[44px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">Password</label>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 focus-within:border-[#143D2B] focus-within:bg-white overflow-hidden">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-transparent px-3.5 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="px-3 text-xs font-bold text-[#143D2B] cursor-pointer"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">Confirm Password</label>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 focus-within:border-[#143D2B] focus-within:bg-white overflow-hidden">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-transparent px-3.5 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="px-3 text-xs font-bold text-[#143D2B] cursor-pointer"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 font-sans-custom">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe((prev) => !prev)}
                className="accent-[#143D2B]"
              />
              Remember me
            </label>

            {!isSignUp && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-xs font-bold text-[#143D2B] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Forgot password?
              </button>
            )}
          </div>

          {(error || message) && (
            <div
              className={`rounded-xl px-3.5 py-2 text-xs font-bold ${
                error
                  ? "border border-rose-100 bg-rose-50 text-rose-700"
                  : "border border-emerald-100 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-[#143D2B] hover:bg-[#1c4e38] py-3 text-sm font-extrabold text-white shadow-md transition cursor-pointer min-h-[44px] disabled:opacity-70"
          >
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
