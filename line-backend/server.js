import express from "express";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ========== In-Memory Estimate Storage (TTL: 30分) ==========
const estimateStore = new Map();
const ESTIMATE_TTL_MS = 30 * 60 * 1000; // 30分

function saveEstimate(estimate) {
  const estimateId = randomUUID();
  estimateStore.set(estimateId, {
    estimate,
    createdAt: Date.now(),
  });
  console.log(
    `[EstimateStore] Saved estimate ${estimateId}, store size: ${estimateStore.size}`
  );
  return estimateId;
}

function getEstimate(estimateId) {
  const entry = estimateStore.get(estimateId);
  if (!entry) {
    console.log(`[EstimateStore] Estimate ${estimateId} not found`);
    return null;
  }
  if (Date.now() - entry.createdAt > ESTIMATE_TTL_MS) {
    estimateStore.delete(estimateId);
    console.log(`[EstimateStore] Estimate ${estimateId} expired`);
    return null;
  }
  console.log(`[EstimateStore] Retrieved estimate ${estimateId}`);
  return entry.estimate;
}

// 定期クリーンアップ
setInterval(
  () => {
    const now = Date.now();
    let deleted = 0;
    for (const [id, entry] of estimateStore.entries()) {
      if (now - entry.createdAt > ESTIMATE_TTL_MS) {
        estimateStore.delete(id);
        deleted++;
      }
    }
    if (deleted > 0) {
      console.log(
        `[EstimateStore] Cleaned up ${deleted} expired entries, remaining: ${estimateStore.size}`
      );
    }
  },
  5 * 60 * 1000
);

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LIFF_ID = process.env.LIFF_ID || "";
const APP_BASE_URL =
  process.env.APP_BASE_URL ||
  "https://hakobou-moving-estimate--cubotax.replit.app";

/* ===== 中略（ここまで完全に元コードと同一）===== */

/* ===========================
   🔴 ここが唯一の変更箇所
   =========================== */
async function sendLineMessage(lineUserId, messages) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN is not set, skipping message send");
    return;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: messages,
      }),
    });

    const text = await response.text(); // 成功・失敗どちらでも取得

    console.log("=== LINE API RESULT ===");
    console.log("status:", response.status);
    console.log("body:", text);

    if (!response.ok) {
      console.error("LINE API error (not ok)");
    } else {
      console.log("LINE API success");
    }
  } catch (error) {
    console.error("Failed to send LINE message:", error);
  }
}
/* ===========================
   🔴 変更ここまで
   =========================== */

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// JSON parser
app.use(express.json());

// /api/estimates
app.post("/api/estimates", (req, res) => {
  console.log("[/api/estimates] Called");
  const { estimate } = req.body;
  if (!estimate) {
    return res.status(400).json({ error: "estimate is required" });
  }
  const estimateId = saveEstimate(estimate);
  const cleanLiffId = LIFF_ID.replace(/^https?:\/\/liff\.line\.me\//, "");
  const liffUrl = `https://liff.line.me/${cleanLiffId}?estimateId=${estimateId}`;
  res.json({ estimateId, liffUrl });
});

// /api/link
app.post("/api/link", async (req, res) => {
  console.log("=== /api/link が呼ばれました ===");
  console.log("body:", req.body);

  const { lineUserId, estimateId } = req.body;
  if (!lineUserId || !estimateId) {
    return res
      .status(400)
      .json({ error: "lineUserId and estimateId are required" });
  }

  const estimate = getEstimate(estimateId);
  if (!estimate) {
    return res.status(404).json({ error: "Estimate not found or expired" });
  }

  const messages = [{ type: "text", text: "見積もりテスト送信" }];

  await sendLineMessage(lineUserId, messages);
  res.json({ ok: true });
});

// static
const liffPublicPath = path.join(__dirname, "public");
app.use(express.static(liffPublicPath));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
