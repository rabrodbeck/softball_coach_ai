import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);

    // Get Firebase ID token
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const token = await currentUser.getIdToken();
            headers.set('Authorization', `Bearer ${token}`);
        } catch (err) {
            console.error("Failed to retrieve Firebase Auth token:", err);
        }
    }

    // Set default content type
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    // Make fetch request
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    return fetch(url, {
        ...options,
        headers
    });
}