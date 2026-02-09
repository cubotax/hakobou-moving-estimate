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
                        <div className="flex flex-col sm:flex-row sm:justify-center items-start sm:items-center gap-4 sm:gap-6 text-sm text-gray-400 mb-4">
                            <a href="/tokushoho" className="hover:text-white flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="10" cy="10" r="9" stroke="#FFE14D" strokeWidth="2" />
                                    <path d="M8 6L12 10L8 14" stroke="#FFE14D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                特定商取引法
                            </a>
                            <a href="/company" className="hover:text-white flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="10" cy="10" r="9" stroke="#FFE14D" strokeWidth="2" />
                                    <path d="M8 6L12 10L8 14" stroke="#FFE14D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                会社概要
                            </a>
                            <a href="/privacy" className="hover:text-white flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="10" cy="10" r="9" stroke="#FFE14D" strokeWidth="2" />
                                    <path d="M8 6L12 10L8 14" stroke="#FFE14D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                プライバシーポリシー
                            </a>
                            <a href="/contact" className="hover:text-white flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="10" cy="10" r="9" stroke="#FFE14D" strokeWidth="2" />
                                    <path d="M8 6L12 10L8 14" stroke="#FFE14D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
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
