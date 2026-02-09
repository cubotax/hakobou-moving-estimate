import { usePageTitle } from '@/hooks/usePageTitle';
import { Layout } from '@/components/Layout';

export default function Company() {
  usePageTitle('会社概要');

    const companyInfo = [
        { label: '屋号', value: 'ハコボウ' },
        { label: '代表者', value: '久保田 泰寛' },
        { label: '所在地', value: '青森県弘前市撫牛子3-6-7' },
        { label: '開業日', value: '2025年8月1日' },
        { label: '事業内容', value: '引越しサービス、運送業' },
        { label: '電話番号', value: '050-6862-8994' },
        { label: 'メールアドレス', value: 'info@hakobou.com' },
    ];

    return (
        <Layout>
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">会社概要</h1>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                        <tbody>
                            {companyInfo.map((item, index) => (
                                <tr
                                    key={item.label}
                                    className={index !== companyInfo.length - 1 ? 'border-b border-gray-100' : ''}
                                >
                                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600 bg-gray-50 w-1/3 sm:w-1/4">
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
