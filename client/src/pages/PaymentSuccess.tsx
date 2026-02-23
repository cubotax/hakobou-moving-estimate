import { CheckCircle } from 'lucide-react';

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-black mb-4">お支払いが完了しました</h1>
        <p className="text-gray-600 mb-6">
          ご入金ありがとうございます。<br />
          引越し当日までしばらくお待ちください。<br />
          ご不明点がございましたらLINEにてお問い合わせください。
        </p>
        <a
          href="https://line.me/R/ti/p/@602epmvz"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#00B900] hover:bg-[#009D00] text-white font-bold rounded-xl transition-colors"
        >
          LINEでお問い合わせ
        </a>
      </div>
    </div>
  );
}
