import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Shield, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Member {
    id: string;
    email: string;
    name: string | null;
    role: string;
    created_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AdminMembers() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [addModal, setAddModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<Member | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('admin');
    const [saving, setSaving] = useState(false);

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_BASE}/api/admin/members`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setMembers(data.members);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMembers(); }, []);

    const handleAdd = async () => {
        if (!newEmail) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_BASE}/api/admin/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email: newEmail, name: newName, role: newRole }),
            });
            const data = await res.json();
            if (data.success) {
                setAddModal(false);
                setNewEmail('');
                setNewName('');
                setNewRole('admin');
                fetchMembers();
            } else {
                alert(data.error || '追加に失敗しました');
            }
        } catch (err) {
            alert('追加に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_BASE}/api/admin/members/${deleteModal.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setDeleteModal(null);
                fetchMembers();
            } else {
                alert(data.error || '削除に失敗しました');
            }
        } catch (err) {
            alert('削除に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">メンバー管理</h1>
                    <Button onClick={() => setAddModal(true)} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
                        <Plus className="w-4 h-4 mr-2" />
                        メンバー追加
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">読み込み中...</div>
                ) : members.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">メンバーが登録されていません</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {members.map((member, i) => (
                            <div key={member.id} className={`flex items-center justify-between px-4 py-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.role === 'owner' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                                        {member.role === 'owner' ? <ShieldCheck className="w-5 h-5 text-yellow-600" /> : <Shield className="w-5 h-5 text-gray-500" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{member.name || '名前未設定'}</p>
                                        <p className="text-xs text-gray-500">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${member.role === 'owner' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {member.role === 'owner' ? 'オーナー' : '管理者'}
                                    </span>
                                    {member.role !== 'owner' && (
                                        <button onClick={() => setDeleteModal(member)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 追加モーダル */}
                <Dialog open={addModal} onOpenChange={setAddModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>メンバーを追加</DialogTitle>
                            <DialogDescription>Googleアカウントのメールアドレスを入力してください</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">メールアドレス *</label>
                                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="example@gmail.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">名前</label>
                                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="表示名" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">権限</label>
                                <select className="w-full h-10 px-3 border border-gray-300 rounded-md" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                                    <option value="admin">管理者</option>
                                    <option value="owner">オーナー</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddModal(false)}>キャンセル</Button>
                            <Button onClick={handleAdd} disabled={saving || !newEmail}>{saving ? '追加中...' : '追加'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* 削除確認モーダル */}
                <Dialog open={deleteModal !== null} onOpenChange={() => setDeleteModal(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>メンバーを削除</DialogTitle>
                            <DialogDescription>{deleteModal?.email} を削除しますか？この操作は取り消せません。</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteModal(null)}>キャンセル</Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? '削除中...' : '削除'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
