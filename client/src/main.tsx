import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializePricingSettings } from "./lib/pricing";

// 料金設定を初期化してからアプリを起動
initializePricingSettings().then(() => {
    createRoot(document.getElementById("root")!).render(<App />);
}).catch((err) => {
    console.error('Failed to initialize pricing settings:', err);
    // エラーが発生してもアプリは起動する（フォールバック値を使用）
    createRoot(document.getElementById("root")!).render(<App />);
});
