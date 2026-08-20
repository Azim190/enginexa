import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    theme_color?: string;
    plan?: string;
}

export interface User {
    id: number;
    organization_id?: string;
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

export interface RegisterOrgParams {
    orgName: string;
    orgSlug: string;
    adminName: string;
    idNumber: string;
    password?: string;
    themeColor?: string;
}

interface AuthContextType {
    user: User | null;
    organization: Organization | null;
    permissions: string[];
    token: string | null;
    login: (name: string, idNumber: string, orgSlug?: string) => Promise<{ success?: boolean; mfaRequired?: boolean }>;
    registerOrganization: (params: RegisterOrgParams) => Promise<{ success?: boolean; error?: string }>;
    updateOrganization: (data: Partial<Organization>) => Promise<boolean>;
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
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mfaRequired, setMfaRequired] = useState<boolean>(false);
    const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);

    const login = async (name: string, idNumber: string, orgSlug?: string) => {
        try {
            setError(null);
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, idNumber, orgSlug }),
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

            if (data.organization) {
                setOrganization(data.organization);
                localStorage.setItem('organization', JSON.stringify(data.organization));
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

    const registerOrganization = async (params: RegisterOrgParams) => {
        try {
            setError(null);
            const response = await fetch('/api/auth/register-org', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                throw new Error('Server returned invalid response');
            }

            if (!response.ok) {
                throw new Error(data.error || `Registration failed (${response.status})`);
            }

            setUser(data.user);
            setOrganization(data.organization);
            setPermissions(data.permissions || []);
            setToken(data.sessionId);
            localStorage.setItem('token', data.sessionId);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('organization', JSON.stringify(data.organization));
            localStorage.setItem('permissions', JSON.stringify(data.permissions || []));

            return { success: true };
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const updateOrganization = async (data: Partial<Organization>): Promise<boolean> => {
        try {
            const currentToken = localStorage.getItem('token') || token;
            if (!currentToken) return false;

            const response = await fetch('/api/organizations/current', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to update organization');
            }

            const updatedOrg = await response.json();
            setOrganization(updatedOrg);
            localStorage.setItem('organization', JSON.stringify(updatedOrg));
            return true;
        } catch (err: any) {
            console.error('Update org error:', err);
            setError(err.message);
            return false;
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
            if (data.organization) {
                setOrganization(data.organization);
                localStorage.setItem('organization', JSON.stringify(data.organization));
            }
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
            setOrganization(null);
            setPermissions([]);
            setToken(null);
            setMfaRequired(false);
            setMfaSessionId(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('organization');
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
        const storedOrg = localStorage.getItem('organization');
        const storedPermissions = localStorage.getItem('permissions');

        if (storedToken && storedUser && storedPermissions) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            if (storedOrg) {
                setOrganization(JSON.parse(storedOrg));
            }
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
                if (data.organization) {
                    setOrganization(data.organization);
                    localStorage.setItem('organization', JSON.stringify(data.organization));
                }
                setPermissions(data.permissions || []);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
            })
            .catch(err => {
                console.warn('Session verification failed on boot:', err.message);
                setUser(null);
                setOrganization(null);
                setPermissions([]);
                setToken(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('organization');
                localStorage.removeItem('permissions');
            });
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                organization,
                permissions,
                token,
                login,
                registerOrganization,
                updateOrganization,
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
