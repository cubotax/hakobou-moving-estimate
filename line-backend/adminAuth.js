/**
 * 管理画面用認証モジュール
 * Google OAuth 2.0 + JWT セッション管理
 */

import jwt from 'jsonwebtoken';

// 環境変数
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/admin/auth/callback';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

// JWT有効期限（7日）
const JWT_EXPIRES_IN = '7d';

/**
 * Google OAuth認証URLを生成
 */
export function getGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Google認証コードをトークンに交換
 */
export async function exchangeCodeForTokens(code) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_CALLBACK_URL,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

/**
 * Googleトークンからユーザー情報を取得
 */
export async function getGoogleUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

/**
 * メールアドレスが許可されているか確認
 */
export function isEmailAllowed(email) {
  if (ADMIN_EMAILS.length === 0) {
    // 開発環境: ADMIN_EMAILSが設定されていない場合は全て許可
    console.warn('Warning: ADMIN_EMAILS not configured, allowing all emails');
    return true;
  }
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * JWTトークンを生成
 */
export function generateToken(user) {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * JWTトークンを検証
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 認証ミドルウェア
 * リクエストヘッダーからJWTを検証し、req.adminUserにユーザー情報を設定
 */
export function authMiddleware(req, res, next) {
  // Authorizationヘッダーからトークンを取得
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : req.cookies?.adminToken;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }

  // メールアドレスが許可されているか確認
  if (!isEmailAllowed(decoded.email)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied',
      code: 'FORBIDDEN'
    });
  }

  req.adminUser = decoded;
  next();
}

/**
 * 認証設定が完了しているか確認
 */
export function isAuthConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}
