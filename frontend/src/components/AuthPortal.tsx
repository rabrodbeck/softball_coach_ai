import React, { useState } from 'react';
import { Key, Mail, User, MapPin, Trophy, ShieldAlert, CheckCircle } from 'lucide-react';
import type { CoachProfile } from '../App';

interface AuthPortalProps{
    onLoginSuccess: (profile: CoachProfile) => void;
    onContinueAsGuest: () => void;
}

type AuthMode = 'menu' | 'login' | 'register';

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

    // SEt the base URL of the FastAPI backend (running locally or in the cloud)
    const API_BASE = 'http://localhost:8000';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("All fields are required.");
            return;
        }
        setError(null);
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: email, password }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Invalid credentials.")
            }

            // Extract the user profile from the database response and login
            const profile = await response.json();
            onLoginSuccess(profile);

        } catch (err: any) {
            setError(err.message || "Server connectin failed.");
        } finally {
            setLoading(false)
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
            const response = await fetch(`${API_BASE}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
                throw new Error(errData.detail || "Registration failed.");
            }

            setSuccess("Account created successfully! Redirecting to login...");
            setTimeout(() => {
                setSuccess(null);
                setMode("login");
            }, 2000);
        } catch (err:any) {
            setError(err.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-portal-container">
            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-logo">🥎</span>
                    <h2>Dugout Command Center</h2>
                    <p>Access your playbook files or explore coaching strategies.</p>
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
                    <div className="auth-menu-grid">
                        <button onClick={() => setMode("login")} className="btn-primary">
                            🗝️ Log In
                        </button>
                        <button onClick={() => setMode("register")} className="btn-secondary">
                            📋 Create Profile
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
            </div>
        </div>
    );
}