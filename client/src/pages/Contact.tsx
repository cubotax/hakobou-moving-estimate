import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Phone, Mail, MessageCircle } from 'lucide-react';

interface ContactFormData {
  name: string;
  furigana: string;
  email: string;
  message: string;
  agreeToPrivacy: boolean;
}

export default function Contact() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    furigana: '',
    email: '',
    message: '',
    agreeToPrivacy: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, agreeToPrivacy: e.target.checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreeToPrivacy) {
      alert('個人情報の取り扱いについて同意してください');
      return;
    }
    setIsSubmitting(true);
    // TODO: フォーム送信処理を実装
    console.log('Form submitted:', formData);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 1000);
  };

  const lineUrl = 'https://line.me/R/ti/p/@602epmvz';

  if (submitSuccess) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-green-800 mb-4">送信完了</h2>
            <p className="text-green-700">
              お問い合わせありがとうございます。<br />
              内容を確認の上、担当者よりご連絡いたします。
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ページタイトル */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">お問い合わせ</h1>
          <p className="text-sm text-gray-500">CONTACT</p>
        </div>

        {/* LINE お問い合わせセクション */}
        <div className="bg-[#06C755] rounded-lg p-6 mb-8 text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MessageCircle className="w-6 h-6" />
            <span className="font-bold">LINEでのお問い合わせはこちら</span>
          </div>
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-[#06C755] font-bold py-3 px-8 rounded-full hover:bg-gray-100 transition-colors mt-2"
          >
            LINEで友だち追加
          </a>
        </div>

        {/* メールお問い合わせフォーム */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            メールでのお問い合わせはこちら
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* お名前 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded mr-2">必須</span>
                お名前
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="久保田 泰寛"
              />
            </div>

            {/* ふりがな */}
            <div>
              <label htmlFor="furigana" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded mr-2">必須</span>
                ふりがな
              </label>
              <input
                type="text"
                id="furigana"
                name="furigana"
                value={formData.furigana}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="くぼた やすひろ"
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded mr-2">必須</span>
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="info@example.com"
              />
            </div>

            {/* お問い合わせ内容 */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded mr-2">必須</span>
                お問い合わせ内容
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="お問い合わせ内容をご記入ください"
              />
            </div>

            {/* 個人情報の取り扱い */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">個人情報の取り扱い</h3>
              <div className="text-sm text-gray-600 space-y-3 max-h-48 overflow-y-auto pr-2">
                <p>
                  ハコボウ（以下「当社」といいます）は、以下のとおり個人情報保護方針を定め、個人情報保護の仕組みを構築し、個人情報の保護を推進いたします。
                </p>

                <div>
                  <p className="font-semibold text-gray-700">個人情報の管理</p>
                  <p>
                    当社は、お客さまの個人情報を正確かつ最新の状態に保ち、個人情報への不正アクセス・紛失・破損・改ざん・漏洩などを防止するため、セキュリティシステムの維持・管理体制の整備等の必要な措置を講じ、安全対策を実施し個人情報の厳重な管理を行ないます。
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700">個人情報の利用目的</p>
                  <p>
                    本ウェブサイトでは、お客様からのお問い合わせ時に、お名前、メールアドレス等の個人情報をご登録いただく場合がございますが、これらの個人情報はご提供いただく際の目的以外では利用いたしません。
                  </p>
                  <p>
                    お客さまからお預かりした個人情報は、当社からのご連絡や業務のご案内やご質問に対する回答として、電子メールや資料のご送付に利用いたします。
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700">個人情報の第三者への開示・提供の禁止</p>
                  <p>
                    当社は、お客さまよりお預かりした個人情報を適切に管理し、次のいずれかに該当する場合を除き、個人情報を第三者に開示いたしません。
                  </p>
                  <ul className="list-disc list-inside ml-2">
                    <li>お客さまの同意がある場合</li>
                    <li>お客さまが希望されるサービスを行なうために当社が業務を委託する業者に対して開示する場合</li>
                    <li>法令に基づき開示することが必要である場合</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-gray-700">個人情報の安全対策</p>
                  <p>
                    当社は、個人情報の正確性及び安全性確保のために、セキュリティに万全の対策を講じています。
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700">ご本人の照会</p>
                  <p>
                    お客さまがご本人の個人情報の照会・修正・削除などをご希望される場合には、ご本人であることを確認の上、対応させていただきます。
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700">法令、規範の遵守と見直し</p>
                  <p>
                    当社は、保有する個人情報に関して適用される日本の法令、その他規範を遵守するとともに、本ポリシーの内容を適宜見直し、その改善に努めます。
                  </p>
                </div>
              </div>
            </div>

            {/* 同意チェックボックス */}
            <div className="flex items-center justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreeToPrivacy}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">「個人情報の取り扱い」について同意する</span>
              </label>
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.agreeToPrivacy}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors"
            >
              {isSubmitting ? '送信中...' : '送信する'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
