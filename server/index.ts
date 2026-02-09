import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resend = new Resend(process.env.RESEND_API_KEY);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // JSON bodyを解析
  app.use(express.json());

  // お問い合わせAPI
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, furigana, email, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: "必須項目が入力されていません" });
      }

      // 1. ユーザーへの自動返信メール
      await resend.emails.send({
        from: "ハコボウ <noreply@hakobou.com>",
        to: email,
        subject: "【ハコボウ】お問い合わせありがとうございます",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">お問い合わせありがとうございます</h2>
            <p>${name} 様</p>
            <p>この度はハコボウへお問い合わせいただき、誠にありがとうございます。</p>
            <p>以下の内容でお問い合わせを承りました。<br>
            1〜2営業日以内に担当者よりご連絡いたしますので、今しばらくお待ちください。</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>お名前：</strong>${name}（${furigana || ""}）</p>
              <p style="margin: 0 0 10px 0;"><strong>メールアドレス：</strong>${email}</p>
              <p style="margin: 0;"><strong>お問い合わせ内容：</strong></p>
              <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${message}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 14px; color: #666;">
              ハコボウ｜青森の単身引越し専門<br>
              メール: info@hakobou.com<br>
              電話: 050-6862-8994（9:00〜18:00）<br>
              <a href="https://mitsumori.hakobou.com">https://mitsumori.hakobou.com</a>
            </p>
          </div>
        `,
      });

      // 2. 管理者への通知メール
      await resend.emails.send({
        from: "ハコボウお問い合わせ <noreply@hakobou.com>",
        to: "info@hakobou.com",
        subject: `【お問い合わせ】${name} 様より`,
        html: `
          <div style="font-family: sans-serif;">
            <h2>新しいお問い合わせがありました</h2>
            
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5; width: 150px;"><strong>お名前</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${name}（${furigana || ""}）</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>メールアドレス</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>お問い合わせ内容</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${message}</td>
              </tr>
            </table>
            
            <p style="margin-top: 20px;">
              <a href="mailto:${email}" style="background: #4A90D9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">返信する</a>
            </p>
          </div>
        `,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ success: false, error: "メール送信に失敗しました" });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 5000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
