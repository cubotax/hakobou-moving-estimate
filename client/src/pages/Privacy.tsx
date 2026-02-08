import { Layout } from '@/components/Layout';

export default function Privacy() {
    return (
        <Layout>
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">プライバシーポリシー</h1>

                <div className="space-y-6">
                    {/* 前文 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <p className="text-sm text-gray-600 leading-relaxed">
                            ハコボウ（以下「当社」といいます）は、お客様の個人情報の保護を重要な責務と考え、以下のとおりプライバシーポリシーを定め、適切に管理いたします。
                        </p>
                    </div>

                    {/* 収集する個人情報 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">1. 収集する個人情報</h2>
                        <p className="text-sm text-gray-600 mb-2">
                            当社は、サービス提供にあたり以下の個人情報を収集することがあります。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>氏名</li>
                            <li>住所</li>
                            <li>電話番号</li>
                            <li>メールアドレス</li>
                            <li>LINE ID</li>
                        </ul>
                    </div>

                    {/* 利用目的 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">2. 利用目的</h2>
                        <p className="text-sm text-gray-600 mb-2">
                            収集した個人情報は、以下の目的で利用いたします。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>見積もり作成</li>
                            <li>サービス提供</li>
                            <li>お問い合わせ対応</li>
                        </ul>
                    </div>

                    {/* 第三者提供 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">3. 第三者への提供</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            当社は、お客様の個人情報を第三者に提供することは原則としていたしません。
                            ただし、配送業務の遂行上必要な場合に限り、お客様の同意を得た上で提供することがあります。
                        </p>
                    </div>

                    {/* 個人情報の安全管理 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">4. 個人情報の安全管理</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            当社は、個人情報の漏洩、滅失またはき損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
                        </p>
                    </div>

                    {/* お問い合わせ先 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">5. お問い合わせ先</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。
                        </p>
                        <p className="text-sm text-gray-800 mt-2">
                            メールアドレス：
                            <a
                                href="mailto:info@hakobou.com"
                                className="text-blue-600 hover:underline"
                            >
                                info@hakobou.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </Layout >
    );
}
