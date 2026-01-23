/**
 * 管理画面 - 料金設定ページ
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { API_CONFIG } from '../../lib/config';

interface PricingSettings {
    base_fee: string;
    busy_season_rate: string;
    busy_season_start_month: string;
    busy_season_start_day: string;
    busy_season_end_month: string;
    busy_season_end_day: string;
    weekend_holiday_rate: string;
    storage_fee_per_day: string;
    packing_fee: string;
    floor_fee: string;
    free_floor_limit: string;
    time_slot_fee: string;
    omakase_base_fee: string;
    omakase_additional_fee: string;
}

const defaultSettings: PricingSettings = {
    base_fee: '19800',
    busy_season_rate: '0.3',
    busy_season_start_month: '3',
    busy_season_start_day: '1',
    busy_season_end_month: '4',
    busy_season_end_day: '10',
    weekend_holiday_rate: '0.1',
    storage_fee_per_day: '3000',
    packing_fee: '5000',
    floor_fee: '3000',
    free_floor_limit: '2',
    time_slot_fee: '1000',
    omakase_base_fee: '8000',
    omakase_additional_fee: '4000',
};

const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

function Field({ label, id, value, onChange, type = 'number', prefix, suffix }: any) {
    return (
        <div className="mb-4">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex items-center gap-2">
                {prefix && <span className="text-gray-500 shrink-0">{prefix}</span>}
                <input type={type} id={id} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} min={type === 'number' ? '0' : undefined} className="w-24 sm:w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-right" />
                {suffix && <span className="text-gray-500 shrink-0">{suffix}</span>}
            </div>
        </div>
    );
}

function DateSelect({ label, monthValue, dayValue, onMonthChange, onDayChange }: any) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex items-center gap-1 sm:gap-2">
                <select value={monthValue} onChange={(e) => onMonthChange(e.target.value)} className="w-16 sm:w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-2 border">
                    {months.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
                <span className="text-gray-500">月</span>
                <select value={dayValue} onChange={(e) => onDayChange(e.target.value)} className="w-16 sm:w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-2 border">
                    {days.map((d) => (<option key={d} value={d}>{d}</option>))}
                </select>
                <span className="text-gray-500">日</span>
            </div>
        </div>
    );
}

function rateToPercent(rate: string): string {
    const num = parseFloat(rate);
    return isNaN(num) ? '0' : String(Math.round(num * 100));
}

function percentToRate(percent: string): string {
    const num = parseFloat(percent);
    return isNaN(num) ? '0' : String(num / 100);
}

export default function PricingSettingsPage() {
    const [settings, setSettings] = useState<PricingSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const res = await fetch(`${API_CONFIG.BASE_URL}/api/admin/pricing-settings`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.success && data.settings) {
                    const startParts = (data.settings.busy_season_start || '03-01').split('-');
                    const endParts = (data.settings.busy_season_end || '04-10').split('-');
                    setSettings({ ...defaultSettings, ...data.settings, busy_season_start_month: String(parseInt(startParts[0] || '3')), busy_season_start_day: String(parseInt(startParts[1] || '1')), busy_season_end_month: String(parseInt(endParts[0] || '4')), busy_season_end_day: String(parseInt(endParts[1] || '10')) });
                }
            } catch (err) { console.error('Failed to fetch pricing settings:', err); }
            finally { setLoading(false); }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('adminToken');
            const busySeasonStart = `${settings.busy_season_start_month.padStart(2, '0')}-${settings.busy_season_start_day.padStart(2, '0')}`;
            const busySeasonEnd = `${settings.busy_season_end_month.padStart(2, '0')}-${settings.busy_season_end_day.padStart(2, '0')}`;
            const res = await fetch(`${API_CONFIG.BASE_URL}/api/admin/pricing-settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ ...settings, busy_season_start: busySeasonStart, busy_season_end: busySeasonEnd }) });
            const data = await res.json();
            data.success ? toast.success('設定を保存しました') : toast.error('保存に失敗しました');
        } catch (err) { console.error('Failed to save pricing settings:', err); toast.error('保存に失敗しました'); }
        finally { setSaving(false); }
    };

    const handleChange = (key: keyof PricingSettings, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

    const busySeasonAmount = Math.round(Number(settings.base_fee) * Number(settings.busy_season_rate));
    const weekendHolidayAmount = Math.round(Number(settings.base_fee) * Number(settings.weekend_holiday_rate));

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="max-w-md mx-auto p-4 pb-24">
            <h1 className="text-xl font-bold mb-4">料金設定</h1>

            {/* 基本設定 */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-base font-semibold mb-3 border-b pb-2">基本設定</h2>
                <Field label="基本料金（30kmまで）" id="base_fee" value={settings.base_fee} onChange={(v: string) => handleChange('base_fee', v)} suffix="円" />
                <Field label="土日祝加算率" id="weekend_holiday_rate" value={rateToPercent(settings.weekend_holiday_rate)} onChange={(v: string) => handleChange('weekend_holiday_rate', percentToRate(v))} suffix="%" />
                <p className="text-xs text-gray-500 -mt-3 mb-4 ml-1">（基本料金 × {rateToPercent(settings.weekend_holiday_rate)}% = {weekendHolidayAmount.toLocaleString()}円）</p>
                <Field label="積み置き料金（1日あたり）" id="storage_fee_per_day" value={settings.storage_fee_per_day} onChange={(v: string) => handleChange('storage_fee_per_day', v)} suffix="円" />
                <Field label="梱包サービス料金" id="packing_fee" value={settings.packing_fee} onChange={(v: string) => handleChange('packing_fee', v)} suffix="円" />
                <Field label="階段作業料金（1階あたり）" id="floor_fee" value={settings.floor_fee} onChange={(v: string) => handleChange('floor_fee', v)} suffix="円" />
                <Field label="階段作業無料階数" id="free_floor_limit" value={settings.free_floor_limit} onChange={(v: string) => handleChange('free_floor_limit', v)} suffix="階まで無料" />
                <Field label="時間指定料金（午前・午後）" id="time_slot_fee" value={settings.time_slot_fee} onChange={(v: string) => handleChange('time_slot_fee', v)} suffix="円" />
            </div>

            {/* お任せプラン設定 */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-base font-semibold mb-3 border-b pb-2">お任せプラン設定</h2>
                <Field label="お任せプラン料金" id="omakase_base_fee" value={settings.omakase_base_fee} onChange={(v: string) => handleChange('omakase_base_fee', v)} suffix="円" />
                <Field label="追加料金（50km超過ごと）" id="omakase_additional_fee" value={settings.omakase_additional_fee} onChange={(v: string) => handleChange('omakase_additional_fee', v)} suffix="円" />
            </div>

            {/* 繁忙期料金 */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-base font-semibold mb-3 border-b pb-2">繁忙期料金</h2>
                <DateSelect label="繁忙期開始日" monthValue={settings.busy_season_start_month} dayValue={settings.busy_season_start_day} onMonthChange={(v: string) => handleChange('busy_season_start_month', v)} onDayChange={(v: string) => handleChange('busy_season_start_day', v)} />
                <DateSelect label="繁忙期終了日" monthValue={settings.busy_season_end_month} dayValue={settings.busy_season_end_day} onMonthChange={(v: string) => handleChange('busy_season_end_month', v)} onDayChange={(v: string) => handleChange('busy_season_end_day', v)} />
                <Field label="繁忙期加算率" id="busy_season_rate" value={rateToPercent(settings.busy_season_rate)} onChange={(v: string) => handleChange('busy_season_rate', percentToRate(v))} suffix="%" />
                <p className="text-xs text-gray-500 -mt-3 mb-4 ml-1">（基本料金 × {rateToPercent(settings.busy_season_rate)}% = {busySeasonAmount.toLocaleString()}円）</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800"><p>※ 設定変更は次回以降の新規見積もりに反映されます。</p></div>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg disabled:opacity-50 flex items-center gap-2">
                    {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>保存中...</> : <>保存</>}
                </button>
            </div>
        </div>
    );
}
