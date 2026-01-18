/**
 * 管理画面共通レイアウト
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, FileText, Ticket, LogOut } from 'lucide-react';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const { user, logout } = useAdminAuth();
    const [location] = useLocation();

    const navItems = [
        { href: '/admin', label: '見積もり一覧', icon: FileText },
        { href: '/admin/coupons', label: 'クーポン管理', icon: Ticket },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ヘッダー */}
            <header className="bg-white border-b-2 border-black shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* ロゴ */}
                        <Link href="/admin" className="flex items-center gap-2">
                            <span className="text-2xl">🚚</span>
                            <span className="font-bold text-lg">ハコボウ管理画面</span>
                        </Link>

                        {/* ナビゲーション */}
                        <nav className="hidden md:flex items-center gap-4">
                            {navItems.map((item) => {
                                const isActive = location === item.href ||
                                    (item.href !== '/admin' && location.startsWith(item.href));
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isActive
                                                ? 'bg-yellow-100 text-black'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* ユーザーメニュー */}
                        {user && (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
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
                                    <span className="hidden sm:inline font-medium">{user.name}</span>
                                    <ChevronDown size={16} className="text-gray-400" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem className="text-gray-500 text-sm">
                                        {user.email}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={logout} className="text-red-600">
                                        <LogOut size={16} className="mr-2" />
                                        ログアウト
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* モバイルナビゲーション */}
                <div className="md:hidden border-t border-gray-200">
                    <div className="flex">
                        {navItems.map((item) => {
                            const isActive = location === item.href ||
                                (item.href !== '/admin' && location.startsWith(item.href));
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${isActive
                                            ? 'bg-yellow-100 text-black border-b-2 border-yellow-400'
                                            : 'text-gray-600'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
