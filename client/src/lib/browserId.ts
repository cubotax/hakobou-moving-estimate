/**
 * ブラウザIDを生成・取得するユーティリティ
 * LINE連携前のユニークユーザー識別に使用
 */

const BROWSER_ID_KEY = 'hakobou_browser_id';

/**
 * UUIDを生成
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * ブラウザIDを取得（なければ生成して保存）
 */
export function getBrowserId(): string {
    let browserId = localStorage.getItem(BROWSER_ID_KEY);

    if (!browserId) {
        browserId = generateUUID();
        localStorage.setItem(BROWSER_ID_KEY, browserId);
    }

    return browserId;
}
