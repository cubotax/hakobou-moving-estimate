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
        { label: '料金以外の必要経費', value: '高速道路料金、有料道路料金（利用する場合）' },
        { label: '支払い方法', value: '銀行振込、クレジットカード、現金' },
        { label: '支払い時期', value: '本申込から3日以内' },
        { label: 'サービス提供時期', value: '本申込で契約した日' },
        { label: 'キャンセル料', value: '7日前まで無料、3日前まで50%、前日〜当日100%' },
        { label: '返金について', value: '銀行振込での返金の場合、振込手数料はお客様のご負担となります' },
        { label: 'お届け先対応エリア', value: '関東地方まで' },
        { label: '営業時間', value: '9:00〜18:00' },
        { label: '定休日', value: 'なし' },
    ];

    const pickupAreas = [
        {
            prefecture: '青森県',
            cities: [
                '青森市', '弘前市', '黒石市', '五所川原市', 'つがる市', '平川市'
            ],
            districts: [
                { name: '南津軽郡', towns: ['藤崎町', '大鰐町', '田舎館村'] },
                { name: '北津軽郡', towns: ['板柳町', '鶴田町', '中泊町'] },
                { name: '東津軽郡', towns: ['平内町', '今別町', '蓬田村', '外ヶ浜町'] },
                { name: '西津軽郡', towns: ['鰺ヶ沢町'] },
                { name: '中津軽郡', towns: ['西目屋村'] },
            ]
        },
        {
            prefecture: '秋田県',
            cities: ['大館市'],
            districts: []
        }
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
                                            item.value
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 集荷対応エリア */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        集荷対応エリア一覧
                    </h2>

                    {pickupAreas.map((area) => (
                        <div key={area.prefecture} className="mb-6 last:mb-0">
                            <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b-2 border-blue-600">
                                📍 {area.prefecture}
                            </h3>

                            {/* 市 */}
                            {area.cities.length > 0 && (
                                <div className="mb-3">
                                    <div className="flex flex-wrap gap-2">
                                        {area.cities.map((city) => (
                                            <span
                                                key={city}
                                                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                                            >
                                                {city}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 郡 */}
                            {area.districts.map((district) => (
                                <div key={district.name} className="mb-3 ml-2">
                                    <p className="text-sm font-semibold text-gray-600 mb-2">{district.name}</p>
                                    <div className="flex flex-wrap gap-2 ml-2">
                                        {district.towns.map((town) => (
                                            <span
                                                key={town}
                                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                            >
                                                {town}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                        ※ 上記以外のエリアについてはお問い合わせください。
                    </p>
                </div>
            </div>
        </Layout>
    );
}
