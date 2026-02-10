import { usePageTitle } from '@/hooks/usePageTitle';
import { Layout } from '@/components/Layout';

export default function Privacy() {
    usePageTitle('プライバシーポリシー');

    return (
        <Layout>
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">プライバシーポリシー</h1>
                <p className="text-sm text-gray-500 text-center mb-6">個人情報保護方針</p>

                <div className="space-y-6">
                    {/* 前文 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <p className="text-sm text-gray-600 leading-relaxed">
                            ハコボウ（以下「当社」といいます）は、お客様の個人情報の保護を重要な責務と考え、個人情報の保護に関する法律（以下「個人情報保護法」といいます）その他の関連法令・ガイドラインを遵守し、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定め、適切に管理いたします。
                        </p>
                    </div>

                    {/* 1. 事業者情報 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">1. 事業者情報</h2>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>屋号：ハコボウ</p>
                            <p>代表者：久保田 泰寛</p>
                            <p>所在地：青森県弘前市撫牛子3-6-7</p>
                            <p>メールアドレス：<a href="mailto:info@hakobou.com" className="text-blue-600 hover:underline">info@hakobou.com</a></p>
                        </div>
                    </div>

                    {/* 2. 収集する個人情報 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">2. 収集する個人情報</h2>
                        <p className="text-sm text-gray-600 mb-3">
                            当社は、サービス提供にあたり以下の個人情報を収集することがあります。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>氏名、ふりがな</li>
                            <li>住所（集荷先・お届け先）</li>
                            <li>電話番号</li>
                            <li>メールアドレス</li>
                            <li>LINE ID・LINEユーザーID</li>
                            <li>お支払い情報（クレジットカード情報等）</li>
                            <li>引越しに関する情報（荷物量、希望日時等）</li>
                            <li>お問い合わせ内容</li>
                            <li>当社ウェブサイトの閲覧履歴、アクセスログ</li>
                            <li>Cookie情報</li>
                        </ul>
                    </div>

                    {/* 3. 個人情報の収集方法 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">3. 個人情報の収集方法</h2>
                        <p className="text-sm text-gray-600 mb-3">
                            当社は、以下の方法により個人情報を収集いたします。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>オンライン見積もりフォームへの入力</li>
                            <li>お申込みフォームへの入力</li>
                            <li>お問い合わせフォームへの入力</li>
                            <li>LINE公式アカウントでのやり取り</li>
                            <li>電話・メールでのお問い合わせ</li>
                            <li>Cookieによる自動取得</li>
                        </ul>
                    </div>

                    {/* 4. 利用目的 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">4. 利用目的</h2>
                        <p className="text-sm text-gray-600 mb-3">
                            収集した個人情報は、以下の目的で利用いたします。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>引越しサービスの見積もり作成・提供</li>
                            <li>引越しサービスの予約・実施</li>
                            <li>料金の請求・決済処理</li>
                            <li>お問い合わせへの対応</li>
                            <li>サービスに関するご連絡・ご案内</li>
                            <li>サービスの改善・新サービスの開発</li>
                            <li>利用状況の分析・統計データの作成</li>
                            <li>不正利用の防止・セキュリティの確保</li>
                            <li>法令に基づく対応</li>
                        </ul>
                    </div>

                    {/* 5. 第三者提供 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">5. 第三者への提供</h2>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            当社は、以下の場合を除き、お客様の個人情報を第三者に提供することはいたしません。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>お客様の同意がある場合</li>
                            <li>法令に基づく場合</li>
                            <li>人の生命、身体または財産の保護のために必要がある場合であって、お客様の同意を得ることが困難であるとき</li>
                            <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、お客様の同意を得ることが困難であるとき</li>
                            <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
                        </ul>
                    </div>

                    {/* 6. 業務委託 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">6. 業務委託先への提供</h2>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            当社は、サービス提供のため、以下の業務を外部に委託する場合があります。この場合、個人情報の取り扱いについて適切な監督を行います。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>決済代行サービス（Stripe, Inc.）</li>
                            <li>メール配信サービス（Resend）</li>
                            <li>データベースサービス（Supabase）</li>
                            <li>ホスティングサービス（Fly.io）</li>
                        </ul>
                    </div>

                    {/* 7. 個人情報の安全管理 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">7. 個人情報の安全管理</h2>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            当社は、個人情報の漏洩、滅失またはき損の防止その他の個人情報の安全管理のために、以下の措置を講じます。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>SSL/TLS暗号化通信の使用</li>
                            <li>アクセス権限の適切な管理</li>
                            <li>セキュリティソフトウェアの導入・更新</li>
                            <li>個人情報を取り扱う機器の物理的な保護</li>
                        </ul>
                    </div>

                    {/* 8. 個人情報の保存期間 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">8. 個人情報の保存期間</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            当社は、個人情報を利用目的の達成に必要な期間保存いたします。ただし、法令により保存が義務付けられている場合は、当該法令に定める期間保存いたします。保存期間経過後は、速やかに個人情報を削除または匿名化いたします。
                        </p>
                    </div>

                    {/* 9. Cookieの使用 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">9. Cookieの使用について</h2>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            当社ウェブサイトでは、サービス向上のためCookieを使用しています。Cookieとは、ウェブサイトがお客様のブラウザに送信する小さなテキストファイルです。
                        </p>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            Cookieは以下の目的で使用されます。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-3">
                            <li>ウェブサイトの利便性向上</li>
                            <li>アクセス状況の分析</li>
                            <li>見積もり情報の一時保存</li>
                        </ul>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            お客様はブラウザの設定によりCookieの受け入れを拒否することができますが、その場合、一部のサービスがご利用いただけなくなる可能性があります。
                        </p>
                    </div>

                    {/* 10. 開示・訂正・削除等の請求 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">10. 開示・訂正・削除等の請求</h2>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            お客様は、当社に対し、個人情報保護法に基づき、以下の請求をすることができます。
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-3">
                            <li>個人情報の利用目的の通知</li>
                            <li>個人情報の開示</li>
                            <li>個人情報の訂正、追加または削除</li>
                            <li>個人情報の利用の停止または消去</li>
                            <li>個人情報の第三者への提供の停止</li>
                        </ul>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            上記の請求をされる場合は、下記のお問い合わせ先までご連絡ください。ご本人確認をさせていただいた上で、合理的な期間内に対応いたします。
                        </p>
                    </div>

                    {/* 11. 未成年者の個人情報 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">11. 未成年者の個人情報</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            未成年のお客様が当社サービスをご利用になる場合は、保護者の方の同意を得た上でご利用ください。
                        </p>
                    </div>

                    {/* 12. プライバシーポリシーの変更 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">12. プライバシーポリシーの変更</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            当社は、法令の改正や社会情勢の変化等により、本ポリシーを変更することがあります。変更した場合は、当社ウェブサイトにて公表いたします。重要な変更がある場合は、お客様に個別にお知らせする場合があります。
                        </p>
                    </div>

                    {/* 13. お問い合わせ先 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">13. お問い合わせ先</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            本ポリシーに関するお問い合わせ、個人情報の開示・訂正・削除等のご請求は、<a href="/contact" className="text-blue-600 hover:underline font-semibold">お問い合わせページ</a>からご連絡ください。
                        </p>
                    </div>


                    {/* 制定日・改定日 */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="text-sm text-gray-600 text-right">
                            <p>制定日：2025年8月1日</p>
                            <p>最終改定日：2026年2月9日</p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
