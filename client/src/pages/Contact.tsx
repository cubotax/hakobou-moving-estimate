import React, { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Layout } from '@/components/Layout';
import { MessageCircle } from 'lucide-react';

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
  usePageTitle('お問い合わせ');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange(e);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
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

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          furigana: formData.furigana,
          email: formData.email,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitSuccess(true);
      } else {
        alert('送信に失敗しました。時間をおいて再度お試しください。');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      alert('送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lineUrl = 'https://line.me/R/ti/p/@602epmvz';

  if (submitSuccess) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="pop-card p-8">
            <h2 className="text-2xl font-black text-gray-800 mb-4">送信完了</h2>
            <p className="text-gray-600">
              お問い合わせありがとうございます。<br />
              1〜2営業日以内に担当者よりご連絡いたします。
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
          <h1 className="text-3xl font-black text-gray-800 mb-2">お問い合わせ</h1>
          <p className="text-sm text-gray-500">CONTACT</p>
        </div>

        {/* LINE お問い合わせセクション */}
        <div
          className="bg-[#06C755] rounded-2xl p-6 mb-6 text-center text-white"
          style={{ border: '3px solid black', boxShadow: '4px 4px 0px 0px rgba(0, 0, 0, 1)' }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-black">
              <MessageCircle className="w-5 h-5 text-[#06C755]" />
            </div>
            <span className="font-black text-lg">LINEでのお問い合わせ</span>
          </div>
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#FFE14D] text-black font-black py-3 px-8 rounded-full border-2 border-black hover:bg-[#FFD700] transition-colors"
            style={{ boxShadow: '3px 3px 0px 0px rgba(0, 0, 0, 1)' }}
          >
            LINEで友だち追加
          </a>
        </div>

        {/* メールお問い合わせフォーム */}
        <div className="pop-card p-6 mb-6">
          <h2 className="text-xl font-black mb-6">メールでのお問い合わせ</h2>

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* お名前 */}
            <div>
              <label htmlFor="name" className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">必須</span>
                お名前
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-black outline-none transition-all"
                style={{ boxShadow: '3px 3px 0px 0px rgba(0, 0, 0, 1)' }}
                placeholder="山田太郎"
              />
            </div>

            {/* ふりがな */}
            <div>
              <label htmlFor="furigana" className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">必須</span>
                ふりがな
              </label>
              <input
                type="text"
                id="furigana"
                name="furigana"
                value={formData.furigana}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-black outline-none transition-all"
                style={{ boxShadow: '3px 3px 0px 0px rgba(0, 0, 0, 1)' }}
                placeholder="やまだたろう"
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">必須</span>
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-black outline-none transition-all"
                style={{ boxShadow: '3px 3px 0px 0px rgba(0, 0, 0, 1)' }}
                placeholder="info@example.com"
              />
            </div>

            {/* お問い合わせ内容 */}
            <div>
              <label htmlFor="message" className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">必須</span>
                お問い合わせ内容
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleTextareaChange}
                required
                rows={3}
                className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-black outline-none transition-all resize-none overflow-hidden"
                style={{ boxShadow: '3px 3px 0px 0px rgba(0, 0, 0, 1)' }}
                placeholder="お問い合わせ内容をご記入ください"
              />
            </div>

            {/* 個人情報の取り扱い */}
            <div className="bg-gray-50 rounded-xl border-2 border-gray-200 p-4">
              <h3 className="font-black text-gray-800 mb-3">個人情報の取り扱い</h3>
              <div className="text-sm text-gray-600 space-y-3 max-h-40 overflow-y-auto pr-2">
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
                </div>

                <div>
                  <p className="font-semibold text-gray-700">個人情報の第三者への開示・提供の禁止</p>
                  <p>
                    当社は、お客さまよりお預かりした個人情報を適切に管理し、次のいずれかに該当する場合を除き、個人情報を第三者に開示いたしません。
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700">個人情報の安全対策</p>
                  <p>
                    当社は、個人情報の正確性及び安全性確保のために、セキュリティに万全の対策を講じています。
                  </p>
                </div>
              </div>
            </div>

            {/* 同意チェックボックス */}
            <div className="flex items-center justify-center py-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreeToPrivacy}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 rounded border-2 border-black text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-gray-700">「個人情報の取り扱い」について同意する</span>
              </label>
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.agreeToPrivacy}
              className="w-full bg-[#FFE14D] hover:bg-[#FFD700] disabled:bg-gray-300 disabled:border-gray-400 text-black font-black py-4 px-6 rounded-full border-2 border-black transition-colors"
              style={{ boxShadow: formData.agreeToPrivacy ? '4px 4px 0px 0px rgba(0, 0, 0, 1)' : 'none' }}
            >
              {isSubmitting ? '送信中...' : '送信する'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
