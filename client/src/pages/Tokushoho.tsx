import { Layout } from '@/components/Layout';

export default function Tokushoho() {
    const tokushohoInfo = [
        { label: '販売業者', value: 'ハコボウ' },
        { label: '運営統括責任者', value: '久保田 泰寛' },
        { label: '所在地', value: '青森県弘前市撫牛子3-6-7' },
        { label: '電話番号', value: '050-6862-8994' },
        { label: 'メールアドレス', value: 'info@hakobou.com' },
        { label: '支払い方法', value: '銀行振込、クレジットカード、現金' },
        { label: '支払い時期', value: '本申込から3日以内' },
        { label: 'サービス提供時期', value: '本申込で契約した日' },
        {
            label: 'キャンセル料',
            value: '7日前まで無料、3日前まで50%、前日〜当日100%',
        },
        {
            label: '返金について',
            value: '銀行振込での返金の場合、振込手数料はお客様のご負担となります',
        },
    ];

    return (
        <Layout>
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">特定商取引法に基づく表記</h1>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                                        {item.label === 'メールアドレス' ? (
                                            <a
                                                href={`mailto:${item.value}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {item.value}
                                            </a>
                                        ) : item.label === '電話番号' ? (
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
            </div>
        </Layout >
    );
}
