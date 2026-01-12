import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/index.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
    title: "ハコボウ オンライン見積",
    description: "住所と条件を入力するだけですぐに概算料金がわかる引越し見積もりアプリ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ja">
            <body className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-300 to-sky-200">
                <TooltipProvider>
                    <Toaster />
                    {children}
                </TooltipProvider>
            </body>
        </html>
    );
}
