import type { AppProps } from 'next/app';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "../components/ErrorBoundary";
import { ThemeProvider } from "../contexts/ThemeContext";
import "../index.css";

/**
 * Next.js App Component
 * 
 * Design Philosophy: 和モダン・ミニマリズム
 * - 藍色をプライマリカラーに
 * - 生成り色の温かみのある背景
 * - 余白を活かした静謐で上品なUI
 */

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ErrorBoundary>
            <ThemeProvider defaultTheme="light">
                <TooltipProvider>
                    <Toaster />
                    <Component {...pageProps} />
                </TooltipProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
