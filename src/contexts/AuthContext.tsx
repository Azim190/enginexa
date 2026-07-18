import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
    id: number;
    name: string;
    id_number: string;
    role: string;
    branch_id: string | null;
    department_id: string | null;
    branch_name_en: string | null;
    branch_name_ar: string | null;
    dept_name_en: string | null;
    dept_name_ar: string | null;
    mfa_enabled: boolean;
    section?: string;
}

interface AuthContextType {
    user: User | null;
    permissions: string[];
    token: string | null;
    login: (name: string, idNumber: string) => Promise<{ success?: boolean; mfaRequired?: boolean }>;
    verifyMfa: (pin: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    error: string | null;
    mfaRequired: boolean;
    mfaSessionId: string | null;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mfaRequired, setMfaRequired] = useState<boolean>(false);
    const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);

    const login = async (name: string, idNumber: string) => {
        try {
            setError(null);
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, idNumber }),
            });

            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error('Failed to parse login response:', text);
                throw new Error('Server returned invalid response');
            }

            if (!response.ok) {
                throw new Error(data.error || `Login failed (${response.status})`);
            }

            if (data.mfaRequired) {
                setMfaRequired(true);
                setMfaSessionId(data.sessionId);
                return { mfaRequired: true };
            }

            setUser(data.user);
            setPermissions(data.permissions || []);
            setToken(data.sessionId);
            localStorage.setItem('token', data.sessionId);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
            return { success: true };
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message);
            return { success: false };
        }
    };

    const verifyMfa = async (pin: string): Promise<boolean> => {
        try {
            setError(null);
            if (!mfaSessionId) {
                throw new Error('No active MFA session found');
            }

            const response = await fetch('/api/auth/mfa-verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId: mfaSessionId, pin }),
            });

            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error('Failed to parse MFA response:', text);
                throw new Error('Server returned invalid response');
            }

            if (!response.ok) {
                throw new Error(data.error || `MFA verification failed (${response.status})`);
            }

            setUser(data.user);
            setPermissions(data.permissions || []);
            setToken(data.sessionId);
            localStorage.setItem('token', data.sessionId);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
            setMfaRequired(false);
            setMfaSessionId(null);
            return true;
        } catch (err: any) {
            console.error('MFA verification error:', err);
            setError(err.message);
            return false;
        }
    };

    const logout = async () => {
        const storedToken = localStorage.getItem('token') || token;
        try {
            if (storedToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${storedToken}`,
                    }
                });
            }
        } catch (err) {
            console.error('Logout request failed:', err);
        } finally {
            setUser(null);
            setPermissions([]);
            setToken(null);
            setMfaRequired(false);
            setMfaSessionId(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('permissions');
        }
    };

    const hasPermission = (permission: string): boolean => {
        if (permissions.includes('*')) return true;
        return permissions.includes(permission);
    };

    // Check locally stored session on boot
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedPermissions = localStorage.getItem('permissions');

        if (storedToken && storedUser && storedPermissions) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setPermissions(JSON.parse(storedPermissions));

            // Sync with backend to check if session is still valid
            fetch('/api/auth/session', {
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Session invalid on server');
                }
                return res.json();
            })
            .then(data => {
                setUser(data.user);
                setPermissions(data.permissions || []);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
            })
            .catch(err => {
                console.warn('Session verification failed on boot:', err.message);
                setUser(null);
                setPermissions([]);
                setToken(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('permissions');
            });
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                permissions,
                token,
                login,
                verifyMfa,
                logout,
                isAuthenticated: !!user && !mfaRequired,
                error,
                mfaRequired,
                mfaSessionId,
                hasPermission
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
