import { usePageTitle } from '@/hooks/usePageTitle';
import { Layout } from '@/components/Layout';
import { MapPin } from 'lucide-react';

export default function Tokushoho() {
    const tokushohoInfo = [
        { label: '販売業者', value: 'ハコボウ' },
        { label: '運営統括責任者', value: '久保田 泰寛' },
        { label: '所在地', value: '青森県弘前市撫牛子3-6-7' },
        { label: '電話番号', value: '050-6862-8994', type: 'tel' },
        { label: 'メールアドレス', value: 'info@hakobou.com', type: 'email' },
        { label: 'サービス料金', value: '見積もりページにて表示' },
        { label: '支払い方法', value: '銀行振込、クレジットカード、現金' },
        { label: '支払い時期', value: '本申込から3日以内' },
        { label: 'サービス提供時期', value: '本申込で契約した日' },
        { label: 'キャンセル料', value: '7日前まで：無料\n3日前まで：50%\n前日〜当日：100%' },
        { label: '返金について', value: '銀行振込での返金の場合、振込手数料はお客様のご負担となります' },
        { label: '営業時間', value: '9:00〜18:00' },
        { label: '定休日', value: 'なし' },
    ];

    usePageTitle('特定商取引法に基づく表記');

    return (
        <Layout>
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">特定商取引法に基づく表記</h1>

                {/* 基本情報テーブル */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
                    <table className="w-full">
                        <tbody>
                            {tokushohoInfo.map((item, index) => (
                                <tr
                                    key={item.label}
                                    className={index !== tokushohoInfo.length - 1 ? 'border-b border-gray-100' : ''}
                                >
                                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600 bg-gray-50 w-1/3 sm:w-1/4 align-top">
                                        {item.label}
                                    </th>
                                    <td className="px-4 py-4 text-sm text-gray-800">
                                        {item.type === 'email' ? (
                                            <a
                                                href={`mailto:${item.value}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {item.value}
                                            </a>
                                        ) : item.type === 'tel' ? (
                                            <a
                                                href={`tel:${item.value.replace(/-/g, '')}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {item.value}
                                            </a>
                                        ) : (
                                            <span className="whitespace-pre-line">{item.value}</span>
                                        )}

                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </Layout>
    );
}
