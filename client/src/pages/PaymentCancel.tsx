import { XCircle } from 'lucide-react';

export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-black mb-4">お支払いがキャンセルされました</h1>
        <p className="text-gray-600 mb-6">
          決済が完了していません。<br />
          再度お支払いを行う場合は、LINEのメッセージから決済リンクをタップしてください。
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
