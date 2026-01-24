/**
 * 公開APIルート（認証不要）
 * クーポン検証、料金設定、距離計算などのエンドポイント
 */

import express from 'express';
import { validateCoupon, getPricingSettings } from './adminDb.js';

const router = express.Router();

// ============================================
// NAVITIME API 距離計算
// ============================================

/**
 * 郵便番号から住所を取得（zipcloud API）
 */
async function getAddressFromPostalCode(postalCode) {
    const cleanCode = postalCode.replace('-', '');
    const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanCode}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 200 || !data.results || data.results.length === 0) {
        throw new Error(`郵便番号が見つかりません: ${postalCode}`);
    }

    const result = data.results[0];
    return {
        prefecture: result.address1,
        city: result.address2,
        town: result.address3,
        fullAddress: `${result.address1}${result.address2}${result.address3}`
    };
}

/**
 * 住所から緯度経度を取得（国土地理院API）
 */
async function getCoordinatesFromAddress(address) {
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.length === 0) {
        throw new Error(`住所から座標を取得できません: ${address}`);
    }

    // 国土地理院APIは [経度, 緯度] の順で返す
    const [lon, lat] = data[0].geometry.coordinates;
    return { lat, lon };
}

/**
 * NAVITIME APIで距離を取得
 */
async function getDistanceFromNavitime(startCoord, goalCoord) {
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
        throw new Error('RAPIDAPI_KEY is not configured');
    }

    // etc=use でETC料金取得、car_type=2 で普通車、condition=toll_time で高速優先
    const url = `https://navitime-route-car.p.rapidapi.com/route_car?start=${startCoord.lat},${startCoord.lon}&goal=${goalCoord.lat},${goalCoord.lon}&datum=wgs84&coord_unit=degree&etc=use&car_type=2&condition=toll_time`;

    console.log('[NAVITIME] Request URL:', url);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'navitime-route-car.p.rapidapi.com',
            'x-rapidapi-key': apiKey
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NAVITIME API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // ルート情報から距離を取得
    if (!data.items || data.items.length === 0) {
        throw new Error('ルートが見つかりません');
    }

    const route = data.items[0];
    const summary = route.summary;

    // 距離（メートル→キロメートル）
    const distanceMeters = summary?.move?.distance || 0;
    const distanceKm = Math.round(distanceMeters / 100) / 10;

    // 所要時間（秒→分）
    const durationSeconds = summary?.move?.time || 0;
    const durationMinutes = Math.round(durationSeconds / 60);

    // 高速料金を取得（軽自動車ETC: unit_1064_1 または unit_1025_1）
    let highwayFee = null;

    if (route.fares && route.fares.length > 0) {
        for (const fare of route.fares) {
            // type="move" のエントリから料金を取得
            if (fare.type === 'move' && fare.detail?.fare) {
                const fareData = fare.detail.fare;
                // 軽自動車ETC料金を優先（unit_1064_1 または unit_1025_1）
                const amount = fareData.unit_1064_1 || fareData.unit_1025_1 || 0;
                if (amount > 0) {
                    highwayFee = (highwayFee || 0) + amount;
                }
            }
        }
    }

    // summaryにtoll情報がある場合（フォールバック）
    if (highwayFee === null || highwayFee === 0) {
        if (summary?.move?.toll_road_distance > 0 && summary?.move?.fare) {
            highwayFee = summary.move.fare;
        }
    }

    // 0の場合はnullに変換
    if (highwayFee === 0) {
        highwayFee = null;
    }

    console.log(`[NAVITIME] Result - Distance: ${distanceKm}km, Duration: ${durationMinutes}min, Highway: ${highwayFee}`);

    return {
        distanceKm,
        highwayFee,
        durationMinutes
    };
}

/**
 * 距離計算API
 * POST /api/distance
 */
router.post('/distance', async (req, res) => {
    try {
        const { originPostalCode, destinationPostalCode } = req.body;

        if (!originPostalCode || !destinationPostalCode) {
            return res.status(400).json({
                success: false,
                error: '出発地と目的地の郵便番号が必要です'
            });
        }

        console.log(`[Distance API] Calculating: ${originPostalCode} → ${destinationPostalCode}`);

        // 1. 郵便番号から住所を取得
        const [originAddress, destAddress] = await Promise.all([
            getAddressFromPostalCode(originPostalCode),
            getAddressFromPostalCode(destinationPostalCode)
        ]);

        console.log(`[Distance API] Addresses: ${originAddress.fullAddress} → ${destAddress.fullAddress}`);

        // 2. 住所から緯度経度を取得
        const [originCoord, destCoord] = await Promise.all([
            getCoordinatesFromAddress(originAddress.fullAddress),
            getCoordinatesFromAddress(destAddress.fullAddress)
        ]);

        console.log(`[Distance API] Coordinates: (${originCoord.lat}, ${originCoord.lon}) → (${destCoord.lat}, ${destCoord.lon})`);

        // 3. NAVITIME APIで距離を取得
        const navitimeResult = await getDistanceFromNavitime(originCoord, destCoord);

        console.log(`[Distance API] Result: ${navitimeResult.distanceKm}km, highway fee: ${navitimeResult.highwayFee}`);

        // 4. 県外判定
        const isInterPrefecture = originAddress.prefecture !== destAddress.prefecture;

        res.json({
            success: true,
            distanceKm: navitimeResult.distanceKm,
            highwayFee: navitimeResult.highwayFee,
            durationMinutes: navitimeResult.durationMinutes,
            isInterPrefecture,
            origin: {
                postalCode: originPostalCode,
                address: originAddress.fullAddress,
                prefecture: originAddress.prefecture
            },
            destination: {
                postalCode: destinationPostalCode,
                address: destAddress.fullAddress,
                prefecture: destAddress.prefecture
            }
        });

    } catch (err) {
        console.error('[Distance API] Error:', err);
        res.status(500).json({
            success: false,
            error: err.message || '距離の計算中にエラーが発生しました'
        });
    }
});

// ============================================
// クーポン検証
// ============================================

router.post('/validate', async (req, res) => {
    try {
        const { code, estimateId, lineUserId } = req.body;

        if (!code) {
            return res.status(400).json({
                valid: false,
                error: 'クーポンコードを入力してください'
            });
        }

        if (!estimateId) {
            return res.status(400).json({
                valid: false,
                error: '見積もりIDが必要です'
            });
        }

        const result = await validateCoupon(code, estimateId, lineUserId || '');
        res.json(result);
    } catch (err) {
        console.error('Error validating coupon:', err);
        res.status(500).json({
            valid: false,
            error: 'クーポンの検証中にエラーが発生しました'
        });
    }
});

// ============================================
// 料金設定
// ============================================

router.get('/pricing', async (req, res) => {
    try {
        const settings = await getPricingSettings();
        res.json({ success: true, settings });
    } catch (err) {
        console.error('Error fetching pricing settings:', err);
        res.status(500).json({
            success: false,
            error: '料金設定の取得に失敗しました'
        });
    }
});

export default router;
