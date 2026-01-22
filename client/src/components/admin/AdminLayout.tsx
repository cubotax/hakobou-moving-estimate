/**
 * 管理画面共通レイアウト
 */

import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Menu, X, FileText, Ticket, Settings, LogOut } from 'lucide-react';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const { user, logout } = useAdminAuth();
    const [location] = useLocation();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // ページタイトルを設定
    useEffect(() => {
        document.title = 'ハコボウ管理画面';
    }, []);

    const navItems = [
        { href: '/admin', label: '見積もり一覧', icon: FileText },
        { href: '/admin/coupons', label: 'クーポン管理', icon: Ticket },
        { href: '/admin/pricing-settings', label: '料金設定', icon: Settings },
    ];

    const isActiveRoute = (href: string) => {
        if (href === '/admin') {
            return location === '/admin' || location === '/admin/';
        }
        return location.startsWith(href);
    };

    const handleNavClick = () => {
        setIsDrawerOpen(false);
    };

    const handleLogout = () => {
        setIsDrawerOpen(false);
        logout();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ヘッダー */}
            <header className="bg-[#FFE355] border-b-2 border-black shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* ロゴ */}
                        <Link href="/admin" className="flex items-center gap-2">
                            <span className="text-2xl">🚚</span>
                            <span className="font-bold text-lg">ハコボウ管理画面</span>
                        </Link>

                        {/* 右側: アバター + ハンバーガーメニュー */}
                        <div className="flex items-center gap-3">
                            {/* アバター */}
                            {user && (
                                <div className="flex items-center gap-2">
                                    {user.picture ? (
                                        <img
                                            src={user.picture}
                                            alt={user.name}
                                            className="w-8 h-8 rounded-full border border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center text-sm font-bold">
                                            {user.name?.charAt(0) || user.email?.charAt(0)}
                                        </div>
                                    )}
                                    <span className="hidden sm:inline font-medium text-sm">{user.name}</span>
                                </div>
                            )}

                            {/* ハンバーガーメニューボタン */}
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="メニューを開く"
                            >
                                <Menu size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ドロワーオーバーレイ */}
            {isDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsDrawerOpen(false)}
                />
            )}

            {/* ドロワーメニュー */}
            <div
                className={`fixed top-0 right-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* ドロワーヘッダー */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <span className="font-bold text-lg">メニュー</span>
                    <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="メニューを閉じる"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ナビゲーション */}
                <nav className="p-4">
                    <ul className="space-y-2">
                        {navItems.map((item) => {
                            const isActive = isActiveRoute(item.href);
                            const Icon = item.icon;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={handleNavClick}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive
                                            ? 'bg-yellow-100 text-black border-2 border-yellow-400'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* ログアウト */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        {user && (
                            <div className="px-4 py-2 mb-4">
                                <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={20} />
                            ログアウト
                        </button>
                    </div>
                </nav>
            </div>

            {/* メインコンテンツ */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
