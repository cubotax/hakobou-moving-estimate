/**
 * 管理画面 - 料金設定ページ
 */

import { useState, useEffect } from 'react';
import { RequireAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { API_CONFIG } from '@/lib/config';

interface PricingSettings {
    // ヘルパープラン
    base_fee: string;
    busy_season_rate: string;
    busy_season_start: string;
    busy_season_end: string;
    weekend_holiday_rate: string;
    storage_fee_per_day: string;
    packing_fee: string;
    floor_fee: string;
    free_floor_limit: string;
    // お任せプラン
    omakase_base_fee: string;
    omakase_additional_fee: string;
}

const defaultSettings: PricingSettings = {
    base_fee: '19800',
    busy_season_rate: '0.3',
    busy_season_start: '03-01',
    busy_season_end: '04-10',
    weekend_holiday_rate: '0.1',
    storage_fee_per_day: '3000',
    packing_fee: '5000',
    floor_fee: '3000',
    free_floor_limit: '2',
    omakase_base_fee: '8000',
    omakase_additional_fee: '4000',
};

function PricingSettingsPage() {
    const [settings, setSettings] = useState<PricingSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 設定を読み込む
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const res = await fetch(`${API_CONFIG.BASE_URL}/api/admin/pricing-settings`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                if (data.success && data.settings) {
                    setSettings({ ...defaultSettings, ...data.settings });
                }
            } catch (err) {
                console.error('Failed to fetch pricing settings:', err);
                toast.error('設定の読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // 設定を保存
    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_CONFIG.BASE_URL}/api/admin/pricing-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('設定を保存しました');
            } else {
                toast.error('保存に失敗しました');
            }
        } catch (err) {
            console.error('Failed to save pricing settings:', err);
            toast.error('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: keyof PricingSettings, value: string) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    // パーセント表示用のヘルパー（0.3 → 30）
    const rateToPercent = (rate: string) => {
        const num = parseFloat(rate);
        return isNaN(num) ? '' : String(Math.round(num * 100));
    };

    // パーセントから小数へ（30 → 0.3）
    const percentToRate = (percent: string) => {
        const num = parseFloat(percent);
        return isNaN(num) ? '0' : String(num / 100);
    };

    if (loading) {
        return (
            <RequireAuth>
                <AdminLayout>
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                </AdminLayout>
            </RequireAuth>
        );
    }

    return (
        <RequireAuth>
            <AdminLayout>
                <div className="space-y-6">
                    {/* ヘッダー */}
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">料金設定</h1>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    保存中...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    保存
                                </>
                            )}
                        </Button>
                    </div>

                    {/* ヘルパープラン設定 */}
                    <div className="bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-6">
                        <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-200">
                            ヘルパープラン設定
                        </h2>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* 基本料金 */}
                            <div className="space-y-2">
                                <Label htmlFor="base_fee">基本料金（30kmまで）</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">¥</span>
                                    <Input
                                        id="base_fee"
                                        type="number"
                                        value={settings.base_fee}
                                        onChange={(e) => handleChange('base_fee', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* 繁忙期加算率 */}
                            <div className="space-y-2">
                                <Label htmlFor="busy_season_rate">繁忙期加算率</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="busy_season_rate"
                                        type="number"
                                        value={rateToPercent(settings.busy_season_rate)}
                                        onChange={(e) => handleChange('busy_season_rate', percentToRate(e.target.value))}
                                    />
                                    <span className="text-gray-500">%</span>
                                </div>
                            </div>

                            {/* 繁忙期開始日 */}
                            <div className="space-y-2">
                                <Label htmlFor="busy_season_start">繁忙期開始日（MM-DD）</Label>
                                <Input
                                    id="busy_season_start"
                                    type="text"
                                    placeholder="03-01"
                                    value={settings.busy_season_start}
                                    onChange={(e) => handleChange('busy_season_start', e.target.value)}
                                />
                            </div>

                            {/* 繁忙期終了日 */}
                            <div className="space-y-2">
                                <Label htmlFor="busy_season_end">繁忙期終了日（MM-DD）</Label>
                                <Input
                                    id="busy_season_end"
                                    type="text"
                                    placeholder="04-10"
                                    value={settings.busy_season_end}
                                    onChange={(e) => handleChange('busy_season_end', e.target.value)}
                                />
                            </div>

                            {/* 土日祝加算率 */}
                            <div className="space-y-2">
                                <Label htmlFor="weekend_holiday_rate">土日祝加算率</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="weekend_holiday_rate"
                                        type="number"
                                        value={rateToPercent(settings.weekend_holiday_rate)}
                                        onChange={(e) => handleChange('weekend_holiday_rate', percentToRate(e.target.value))}
                                    />
                                    <span className="text-gray-500">%</span>
                                </div>
                            </div>

                            {/* 積み置き料金 */}
                            <div className="space-y-2">
                                <Label htmlFor="storage_fee_per_day">積み置き料金（1日あたり）</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">¥</span>
                                    <Input
                                        id="storage_fee_per_day"
                                        type="number"
                                        value={settings.storage_fee_per_day}
                                        onChange={(e) => handleChange('storage_fee_per_day', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* 梱包サービス料金 */}
                            <div className="space-y-2">
                                <Label htmlFor="packing_fee">梱包サービス料金</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">¥</span>
                                    <Input
                                        id="packing_fee"
                                        type="number"
                                        value={settings.packing_fee}
                                        onChange={(e) => handleChange('packing_fee', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* 階段作業料金 */}
                            <div className="space-y-2">
                                <Label htmlFor="floor_fee">階段作業料金（1階あたり）</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">¥</span>
                                    <Input
                                        id="floor_fee"
                                        type="number"
                                        value={settings.floor_fee}
                                        onChange={(e) => handleChange('floor_fee', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* 階段作業無料階数 */}
                            <div className="space-y-2">
                                <Label htmlFor="free_floor_limit">階段作業無料階数</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="free_floor_limit"
                                        type="number"
                                        value={settings.free_floor_limit}
                                        onChange={(e) => handleChange('free_floor_limit', e.target.value)}
                                    />
                                    <span className="text-gray-500">階まで無料</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* お任せプラン設定 */}
                    <div className="bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-6">
                        <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-200">
                            お任せプラン設定
                        </h2>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* お任せプラン基本料金 */}
                            <div className="space-y-2">
                                <Label htmlFor="omakase_base_fee">基本料金（50kmまで）</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">¥</span>
                                    <Input
                                        id="omakase_base_fee"
                                        type="number"
                                        value={settings.omakase_base_fee}
                                        onChange={(e) => handleChange('omakase_base_fee', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* お任せプラン距離加算料金 */}
                            <div className="space-y-2">
                                <Label htmlFor="omakase_additional_fee">距離追加料金（50kmごと）</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">¥</span>
                                    <Input
                                        id="omakase_additional_fee"
                                        type="number"
                                        value={settings.omakase_additional_fee}
                                        onChange={(e) => handleChange('omakase_additional_fee', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 注意事項 */}
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                        <p className="text-sm text-yellow-800">
                            ※ 設定を変更すると、次回以降の新規見積もりに反映されます。既存の見積もりには影響しません。
                        </p>
                    </div>
                </div>
            </AdminLayout>
        </RequireAuth>
    );
}

export default PricingSettingsPage;
