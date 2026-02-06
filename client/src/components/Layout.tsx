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
                <header className="bg-white border-b border-gray-200 py-3 px-4">
                    <div className="max-w-lg mx-auto">
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
                    <div className="max-w-lg mx-auto">
                        <div className="flex justify-center mb-4">
                            <img 
                                src="/logo-horizontal.png" 
                                alt="ハコボウ" 
                                className="h-8 brightness-0 invert"
                            />
                        </div>
                        <div className="flex justify-center gap-6 text-sm text-gray-400 mb-4">
                            <a href="https://line.me/R/ti/p/@602epmvz" className="hover:text-white">
                                LINEで相談
                            </a>
                            <a href="/privacy" className="hover:text-white">
                                プライバシーポリシー
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
