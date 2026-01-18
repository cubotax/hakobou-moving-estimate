/**
 * 管理画面用認証フック
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface AdminUser {
    email: string;
    name: string;
    picture?: string;
}

interface AdminAuthContextType {
    user: AdminUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
    checkAuth: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [, setLocation] = useLocation();

    // トークンをlocalStorageから取得
    const getToken = useCallback(() => {
        return localStorage.getItem('adminToken');
    }, []);

    // トークンをlocalStorageに保存
    const setToken = useCallback((token: string) => {
        localStorage.setItem('adminToken', token);
    }, []);

    // トークンを削除
    const removeToken = useCallback(() => {
        localStorage.removeItem('adminToken');
    }, []);

    // 認証状態を確認
    const checkAuth = useCallback(async (): Promise<boolean> => {
        const token = getToken();
        if (!token) {
            setUser(null);
            setIsLoading(false);
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    setUser(data.user);
                    setIsLoading(false);
                    return true;
                }
            }

            // トークンが無効な場合
            removeToken();
            setUser(null);
            setIsLoading(false);
            return false;
        } catch (error) {
            console.error('Auth check error:', error);
            removeToken();
            setUser(null);
            setIsLoading(false);
            return false;
        }
    }, [getToken, removeToken]);

    // 初期化時にURLパラメータからトークンを取得
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');

        if (tokenFromUrl) {
            setToken(tokenFromUrl);
            // URLからトークンパラメータを削除
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }

        checkAuth();
    }, [setToken, checkAuth]);

    // Googleログイン
    const login = useCallback(() => {
        window.location.href = `${API_BASE_URL}/api/admin/auth/google`;
    }, []);

    // ログアウト
    const logout = useCallback(async () => {
        try {
            await fetch(`${API_BASE_URL}/api/admin/auth/logout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            removeToken();
            setUser(null);
            setLocation('/admin/login');
        }
    }, [getToken, removeToken, setLocation]);

    return (
        <AdminAuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                checkAuth,
            }}
        >
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
}

/**
 * 認証が必要なページ用のラッパーコンポーネント
 */
export function RequireAuth({ children }: { children: ReactNode }) {
    const { isLoading, isAuthenticated } = useAdminAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            setLocation('/admin/login');
        }
    }, [isLoading, isAuthenticated, setLocation]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
