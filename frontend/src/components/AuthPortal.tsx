import React, { useState } from 'react';
import { Key, Mail, User, MapPin, Trophy, ShieldAlert, CheckCircle } from 'lucide-react';
import type { CoachProfile } from '../App';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { apiFetch } from '../utils/api';

interface AuthPortalProps {
    onLoginSuccess: (profile: CoachProfile) => void;
    onContinueAsGuest: () => void;
}

type AuthMode = 'menu' | 'login' | 'register' | 'google-complete';

export default function AuthPortal({ onLoginSuccess, onContinueAsGuest }: AuthPortalProps) {
    const [mode, setMode] = useState<AuthMode>('menu');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [coachName, setCoachName] = useState('');
    const [location, setLocation] = useState('');
    const [ageGroup, setAgeGroup] = useState('8U Division');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Set the base URL of the FastAPI backend (running locally or in the cloud)

    const handleGoogleSignIn = async () => {
        setError(null);
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const userEmail = result.user.email;
            const userDisplayName = result.user.displayName || 'Coach';

            if (!userEmail) {
                throw new Error("Could not retrieve email from Google Account.");
            }

            // Call backend check endpoint
            const response = await apiFetch(`/api/auth/google-login`, {
                method: 'POST',
                body: JSON.stringify({ email: userEmail, display_name: userDisplayName }),
            });

            if (!response.ok) {
                throw new Error("Failed to authenticate with backend.");
            }

            const data = await response.json();
            if (data.registered) {
                // Coach exists, proceed to dashboard
                onLoginSuccess(data.user);
            } else {
                // Coach does not exist, go to profile completion state
                setEmail(userEmail);
                setCoachName(userDisplayName);
                setMode('google-complete');
            }
        } catch (err: any) {
            setError(err.message || "Google Sign-In failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !coachName || !location) {
            setError("All fields required.");
            return;
        }
        setError(null);
        setLoading(true);

        try {
            const response = await apiFetch(`/api/auth/google-register`, {
                method: "POST",
                body: JSON.stringify({
                    email,
                    coach_name: coachName,
                    location,
                    age_group: ageGroup,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Google registration failed.");
            }

            const profile = await response.json();
            onLoginSuccess(profile);
        } catch (err: any) {
            setError(err.message || "Google registration failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("All fields are required.");
            return;
        }
        setError(null);
        setLoading(true);

        try {
            let firebaseUser = null;
            try {
                // 1. Try signing in with Firebase
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                firebaseUser = userCredential.user;
            } catch (fbErr: any) {
                // 2. If user doesn't exist in Firebase yet but exists in PG, auto-migrate them
                if (fbErr.code === "auth/user-not-found" || fbErr.code === "auth/invalid-credential" || fbErr.code === "auth/invalid-email") {
                    const dbResponse = await apiFetch(`/api/auth/login`, {
                        method: 'POST',
                        body: JSON.stringify({ username: email, password }),
                    });
                    
                    if (dbResponse.ok) {
                        // User credentials are correct in DB, create corresponding Firebase Auth user
                        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                        firebaseUser = userCredential.user;
                    } else {
                        throw fbErr; // Fail with original Firebase credentials error
                    }
                } else {
                    throw fbErr;
                }
            }

            if (!firebaseUser || !firebaseUser.email) {
                throw new Error("Failed to resolve authenticated session.");
            }

            // 3. Query the backend for the coach profile using their email
            const response = await apiFetch(`/api/auth/google-login`, {
                method: 'POST',
                body: JSON.stringify({
                    email: firebaseUser.email,
                    display_name: firebaseUser.displayName || 'Coach'
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Failed to retrieve coach profile from database.");
            }

            const data = await response.json();
            if (data.registered) {
                onLoginSuccess(data.user);
            } else {
                throw new Error("Coach profile not registered in database.");
            }

        } catch (err: any) {
            let errMsg = err.message || "Login failed.";
            if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                errMsg = "Invalid email or password.";
            } else if (err.code === "auth/invalid-email") {
                errMsg = "Invalid email address format.";
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }        
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !coachName || !location) {
            setError("All fields required.");
            return;
        }
        setError(null);
        setLoading(true);

        try {
            // 1. Create coach profile in the PostgreSQL database first
            const response = await apiFetch(`/api/auth/register`, {
                method: "POST",
                body: JSON.stringify({
                    username: email,
                    password,
                    coach_name: coachName,
                    location,
                    age_group: ageGroup,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Registration failed on database.");
            }

            // 2. Create the user in Firebase Auth
            await createUserWithEmailAndPassword(auth, email, password);

            setSuccess("Account created successfully! Logging in...");
            
            // 3. Resolve the new profile in our local session state
            const profileRes = await apiFetch(`/api/auth/google-login`, {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    display_name: coachName
                }),
            });
            if (profileRes.ok) {
                const data = await profileRes.json();
                if (data.registered) {
                    onLoginSuccess(data.user);
                }
            }
        } catch (err: any) {
            let errMsg = err.message || "Registration failed.";
            if (err.code === "auth/email-already-in-use") {
                errMsg = "This email is already in use.";
            } else if (err.code === "auth/weak-password") {
                errMsg = "Password is too weak. Must be at least 6 characters.";
            } else if (err.code === "auth/invalid-email") {
                errMsg = "Invalid email address format.";
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-portal-container">
            <div className="auth-card">
                <div className="auth-header">
                    <img src="/winnie-avatar.png?v=3" alt="Winnie" className="auth-logo-img" />
                    <h2 style={{ marginBottom: '4px' }}>Winnie</h2>
                    <p style={{ marginTop: '0', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>Dugout Command Center</p>
                    <p style={{ fontSize: '14px', opacity: 0.85 }}>Access your playbook files or explore coaching strategies.</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <ShieldAlert className="alert-icon" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        <CheckCircle className="alert-icon" />
                        <span>{success}</span>
                    </div>
                )}

                {mode === "menu" && (
                    <div className="auth-menu-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button 
                            onClick={handleGoogleSignIn} 
                            className="btn-primary" 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '10px',
                                background: '#4285F4',
                                color: 'white',
                                border: 'none'
                            }} 
                            disabled={loading}
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" style={{ fill: 'white' }}>
                                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                                <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.806 11.426 0 9 0 5.485 0 2.443 2.017.957 4.961l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#EA4335"/>
                            </svg>
                            Sign In with Google
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                            <span style={{ padding: '0 8px', fontSize: '12px', color: 'var(--text)' }}>or continue with</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                        </div>
                        <button onClick={() => setMode("login")} className="btn-secondary">
                            🗝️ Log In with Email
                        </button>
                        <button onClick={() => setMode("register")} className="btn-secondary">
                            📋 Create Email Profile
                        </button>
                        <button onClick={onContinueAsGuest} className="btn-guest">
                            🥎 Continue as Guest
                        </button>
                    </div>
                )}

                {mode === "login" && (
                    <form onSubmit={handleLogin} className="auth-form">
                        <div className="input-group">
                            <label><Mail className="input-icon" /> Email / Username</label>
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="coach@dugout.com"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label><Key className="input-icon" /> Password</label>
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                                required 
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? "Entering Dugout..." : "Access Boardroom"}
                            </button>
                            <button type="button" onClick={() => setMode("menu")} className="btn-secondary">
                                ⬅️ Back to Portal
                            </button>
                        </div>
                    </form>
                )}

                {mode === "register" && (
                    <form onSubmit={handleRegister} className="auth-form">
                        <div className="input-group">
                            <label><Mail className="input-icon" /> Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="coach@dugout.com"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label><Key className="input-icon" /> Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label><User className="input-icon" /> Coach Full Name</label>
                            <input
                                type="text"
                                value={coachName}
                                onChange={(e) => setCoachName(e.target.value)}
                                placeholder=""
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label><MapPin className="input-icon" /> Your Location</label>
                            <input 
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder=""
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label><Trophy className="input-icon" /> Primary Age Group Coached</label>
                            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                                <option value="8U Division">8U Division</option>
                                <option value="10U Division">10U Division</option>
                                <option value="12U Division">12U Division</option>
                                <option value="14U Division">14U Division</option>
                            </select>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? "Creating..." : "Build Playbook Account"}
                            </button>
                            <button type="button" onClick={() => setMode("menu")} className="btn-secondary">
                                ⬅️ Back
                            </button>
                        </div>
                    </form>
                )}

                {mode === "google-complete" && (
                    <form onSubmit={handleGoogleRegister} className="auth-form">
                        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-h)' }}>Complete Your Coach Profile</h3>
                            <p style={{ fontSize: '13px', margin: 0 }}>We just need a few details to tailor your fastpitch softball playbook.</p>
                        </div>
                        <div className="input-group">
                            <label><User className="input-icon" /> Coach Full Name</label>
                            <input
                                type="text"
                                value={coachName}
                                onChange={(e) => setCoachName(e.target.value)}
                                placeholder="Coach Name"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label><MapPin className="input-icon" /> Your Location</label>
                            <input 
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="City, State"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label><Trophy className="input-icon" /> Primary Age Group Coached</label>
                            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                                <option value="8U Division">8U Division</option>
                                <option value="10U Division">10U Division</option>
                                <option value="12U Division">12U Division</option>
                                <option value="14U Division">14U Division</option>
                            </select>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? "Saving Profile..." : "Complete Setup"}
                            </button>
                            <button type="button" onClick={() => setMode("menu")} className="btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}