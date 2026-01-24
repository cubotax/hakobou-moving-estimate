/**
 * 管理画面 - 統計ページ
 */
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { API_CONFIG } from '../../lib/config';

interface MonthlyStats {
    month: string;
    totalEstimates: number;
    uniqueUsers: number;
    lineLinked: number;
    uniqueLineUsers: number;
    applied: number;
}

export default function StatsPage() {
    const [stats, setStats] = useState<MonthlyStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const res = await fetch(`${API_CONFIG.BASE_URL}/api/admin/stats/monthly`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setStats(data.stats);
                }
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const formatMonth = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        return `${year}年${parseInt(month)}月`;
    };

    const calculateRate = (numerator: number, denominator: number) => {
        if (denominator === 0) return '0.0';
        return ((numerator / denominator) * 100).toFixed(1);
    };

    // 合計を計算
    const totals = stats.reduce(
        (acc, s) => ({
            totalEstimates: acc.totalEstimates + s.totalEstimates,
            uniqueUsers: acc.uniqueUsers + s.uniqueUsers,
            lineLinked: acc.lineLinked + s.lineLinked,
            uniqueLineUsers: acc.uniqueLineUsers + s.uniqueLineUsers,
            applied: acc.applied + s.applied,
        }),
        { totalEstimates: 0, uniqueUsers: 0, lineLinked: 0, uniqueLineUsers: 0, applied: 0 }
    );

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto">
                <h1 className="text-xl font-bold mb-4">月別統計</h1>

                {/* サマリーカード */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">ユニークユーザー</p>
                        <p className="text-2xl font-bold">{totals.uniqueUsers}</p>
                        <p className="text-xs text-gray-400">見積もり総数: {totals.totalEstimates}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">LINE連携ユーザー</p>
                        <p className="text-2xl font-bold">{totals.uniqueLineUsers}</p>
                        <p className="text-sm text-green-600">{calculateRate(totals.uniqueLineUsers, totals.uniqueUsers)}%</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">申込数</p>
                        <p className="text-2xl font-bold">{totals.applied}</p>
                        <p className="text-sm text-blue-600">{calculateRate(totals.applied, totals.uniqueLineUsers)}%</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">全体CVR</p>
                        <p className="text-2xl font-bold text-purple-600">{calculateRate(totals.applied, totals.uniqueUsers)}%</p>
                        <p className="text-xs text-gray-400">申込/ユニークユーザー</p>
                    </div>
                </div>

                {/* 月別テーブル */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">月</th>
                                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700">ユーザー</th>
                                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700">見積もり</th>
                                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700">LINE連携</th>
                                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700">連携率</th>
                                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700">申込</th>
                                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700">申込率</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stats.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                                            データがありません
                                        </td>
                                    </tr>
                                ) : (
                                    [...stats].reverse().map((s) => (
                                        <tr key={s.month} className="hover:bg-gray-50">
                                            <td className="px-3 py-3 text-sm">{formatMonth(s.month)}</td>
                                            <td className="px-3 py-3 text-sm text-right">{s.uniqueUsers}</td>
                                            <td className="px-3 py-3 text-sm text-right text-gray-500">{s.totalEstimates}</td>
                                            <td className="px-3 py-3 text-sm text-right">{s.uniqueLineUsers}</td>
                                            <td className="px-3 py-3 text-sm text-right text-green-600">
                                                {calculateRate(s.uniqueLineUsers, s.uniqueUsers)}%
                                            </td>
                                            <td className="px-3 py-3 text-sm text-right">{s.applied}</td>
                                            <td className="px-3 py-3 text-sm text-right text-blue-600">
                                                {calculateRate(s.applied, s.uniqueLineUsers)}%
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 注釈 */}
                <div className="mt-4 text-sm text-gray-500">
                    <p>※ ユーザー数はブラウザIDベースのユニークカウントです</p>
                    <p>※ 連携率 = LINE連携ユーザー ÷ ユニークユーザー</p>
                    <p>※ 申込率 = 申込数 ÷ LINE連携ユーザー</p>
                </div>
            </div>
        </AdminLayout>
    );
}
