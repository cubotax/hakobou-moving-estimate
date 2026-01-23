/**
 * 管理画面 - 料金設定ページ
 */

import { useState, useEffect } from 'react';
import { RequireAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
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
    time_slot_fee: string;
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
    time_slot_fee: '1000',
    omakase_base_fee: '8000',
    omakase_additional_fee: '4000',
};

// 入力フィールドコンポーネント
interface FieldProps {
    label: string;
    id: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'number' | 'text';
    placeholder?: string;
    prefix?: string;
    suffix?: string;
}

function Field({ label, id, value, onChange, type = 'number', placeholder, prefix, suffix }: FieldProps) {
    return (
        <div className="mb-6">
            <label htmlFor={id} className="text-sm text-gray-600 mb-2 block">
                {label}
            </label>
            <div className="flex items-center gap-2">
                {prefix && <span className="text-gray-500 text-base">{prefix}</span>}
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    min={type === 'number' ? '0' : undefined}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {suffix && <span className="text-gray-500 text-base whitespace-nowrap">{suffix}</span>}
            </div>
        </div>
    );
}

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
                <div className="max-w-2xl mx-auto pb-28">
                    {/* ページタイトル */}
                    <h1 className="text-2xl font-bold mb-6">料金設定</h1>

                    {/* ヘルパープラン設定 */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-200">
                            ヘルパープラン設定
                        </h2>

                        <Field
                            label="基本料金（30kmまで）"
                            id="base_fee"
                            value={settings.base_fee}
                            onChange={(v) => handleChange('base_fee', v)}
                            prefix="¥"
                        />

                        <Field
                            label="繁忙期加算率"
                            id="busy_season_rate"
                            value={rateToPercent(settings.busy_season_rate)}
                            onChange={(v) => handleChange('busy_season_rate', percentToRate(v))}
                            suffix="%"
                        />

                        <Field
                            label="繁忙期開始日（MM-DD）"
                            id="busy_season_start"
                            value={settings.busy_season_start}
                            onChange={(v) => handleChange('busy_season_start', v)}
                            type="text"
                            placeholder="03-01"
                        />

                        <Field
                            label="繁忙期終了日（MM-DD）"
                            id="busy_season_end"
                            value={settings.busy_season_end}
                            onChange={(v) => handleChange('busy_season_end', v)}
                            type="text"
                            placeholder="04-10"
                        />

                        <Field
                            label="土日祝加算率"
                            id="weekend_holiday_rate"
                            value={rateToPercent(settings.weekend_holiday_rate)}
                            onChange={(v) => handleChange('weekend_holiday_rate', percentToRate(v))}
                            suffix="%"
                        />

                        <Field
                            label="積み置き料金（1日あたり）"
                            id="storage_fee_per_day"
                            value={settings.storage_fee_per_day}
                            onChange={(v) => handleChange('storage_fee_per_day', v)}
                            prefix="¥"
                        />

                        <Field
                            label="梱包サービス料金"
                            id="packing_fee"
                            value={settings.packing_fee}
                            onChange={(v) => handleChange('packing_fee', v)}
                            prefix="¥"
                        />

                        <Field
                            label="階段作業料金（1階あたり）"
                            id="floor_fee"
                            value={settings.floor_fee}
                            onChange={(v) => handleChange('floor_fee', v)}
                            prefix="¥"
                        />

                        <Field
                            label="階段作業無料階数"
                            id="free_floor_limit"
                            value={settings.free_floor_limit}
                            onChange={(v) => handleChange('free_floor_limit', v)}
                            suffix="階まで無料"
                        />

                        <Field
                            label="時間指定料金（午前・午後指定時）"
                            id="time_slot_fee"
                            value={settings.time_slot_fee}
                            onChange={(v) => handleChange('time_slot_fee', v)}
                            prefix="¥"
                        />
                    </div>

                    {/* お任せプラン設定 */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-200">
                            お任せプラン設定
                        </h2>

                        <Field
                            label="基本料金（50kmまで）"
                            id="omakase_base_fee"
                            value={settings.omakase_base_fee}
                            onChange={(v) => handleChange('omakase_base_fee', v)}
                            prefix="¥"
                        />

                        <Field
                            label="距離追加料金（50kmごと）"
                            id="omakase_additional_fee"
                            value={settings.omakase_additional_fee}
                            onChange={(v) => handleChange('omakase_additional_fee', v)}
                            prefix="¥"
                        />
                    </div>

                    {/* 注意事項 */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                            ※ 設定を変更すると、次回以降の新規見積もりに反映されます。既存の見積もりには影響しません。
                        </p>
                    </div>
                </div>

                {/* フローティング保存ボタン */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 shadow-lg px-8 py-6 text-lg rounded-full"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                保存中...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5 mr-2" />
                                保存
                            </>
                        )}
                    </Button>
                </div>
            </AdminLayout>
        </RequireAuth>
    );
}

export default PricingSettingsPage;
