import { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
    showHeader?: boolean;
    showFooter?: boolean;
}

export function Layout({ children, showHeader = true, showFooter = true }: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col">
            {showHeader && (
                <header className="bg-header border-b border-gray-200 py-3 px-4">

                    <div className="max-w-2xl mx-auto flex justify-start px-4">
                        <a href="/">
                            <img
                                src="/logo-horizontal.png"
                                alt="ハコボウ"
                                className="h-10"
                            />
                        </a>
                    </div>
                </header>
            )}

            <main className="flex-1">
                {children}
            </main>

            {showFooter && (
                <footer className="bg-black text-white py-8 px-4">
                    <div className="max-w-2xl mx-auto px-4">
                        <div className="flex flex-col items-center gap-3 text-sm text-gray-400 mb-4">
                            <a href="/tokushoho" className="hover:text-white">
                                特定商取引法
                            </a>
                            <a href="/company" className="hover:text-white">
                                会社概要
                            </a>
                            <a href="/privacy" className="hover:text-white">
                                プライバシーポリシー
                            </a>
                            <a href="/contact" className="hover:text-white">
                                お問い合わせ
                            </a>
                        </div>
                        <p className="text-center text-xs text-gray-500">
                            © 2026 ハコボウ All Rights Reserved.
                        </p>
                    </div>
                </footer>
            )}
        </div>
    );
}
