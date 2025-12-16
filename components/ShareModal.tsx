import React, { useState, useEffect } from 'react';
import { AccessLevel, User, TreeData } from '../types';
import { shareTree, getUsersByIds, setPublicAccess } from '../services/api';
import { X, UserPlus, Shield, Globe, Lock, Copy, Check } from 'lucide-react';

interface ShareModalProps {
  tree: TreeData;
  currentUser: User;
  onClose: () => void;
  onUpdate: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ tree, currentUser, onClose, onUpdate }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccessLevel>('VIEWER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [collaboratorDetails, setCollaboratorDetails] = useState<User[]>([]);

  useEffect(() => {
    const fetchCollaborators = async () => {
        const ids = tree.collaborators.map(c => c.userId);
        if (tree.meta.ownerId) ids.push(tree.meta.ownerId);
        
        if (ids.length > 0) {
            try {
                const users = await getUsersByIds(ids);
                setCollaboratorDetails(users);
            } catch (e) { console.error("Could not fetch users", e); }
        }
    };
    fetchCollaborators();
  }, [tree.collaborators, tree.meta.ownerId]);

  const handleShare = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await shareTree(tree.id, email, role);
      setSuccess(`Доступ предоставлен для ${email}`);
      setEmail('');
      onUpdate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublicAccessChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      const newAccess = val === 'RESTRICTED' ? null : (val as AccessLevel);
      try {
          await setPublicAccess(tree.id, newAccess);
          onUpdate();
      } catch (e: any) { console.error(e); }
  };

  const copyLink = () => {
      if (!tree.meta.publicToken) return;
      const link = `${window.location.origin}?token=${tree.meta.publicToken}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  // Resolve user details
  const collaboratorsList = tree.collaborators.map(c => {
    const u = collaboratorDetails.find(user => user.id === c.userId);
    return { ...u, role: c.role };
  }).filter(u => u.id); // Filter out unresolved

  const owner = collaboratorDetails.find(u => u.id === tree.meta.ownerId);
  const publicLinkUrl = tree.meta.publicToken ? `${window.location.origin}?token=${tree.meta.publicToken}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <UserPlus size={18} />
                Настройки доступа
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
            </button>
        </div>
        
        <div className="p-6 space-y-6">
            <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex gap-2">
                    <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Введите email..."
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    />
                    <select 
                        value={role}
                        onChange={e => setRole(e.target.value as AccessLevel)}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm outline-none dark:text-white"
                    >
                        <option value="VIEWER">Просмотр</option>
                        <option value="EDITOR">Редактор</option>
                    </select>
                </div>
                <button 
                    onClick={handleShare}
                    disabled={loading || !email}
                    className="w-full bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
                >
                    {loading ? 'Отправка...' : 'Отправить'}
                </button>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                {success && <p className="text-green-500 text-xs">{success}</p>}
            </div>

            <div className="space-y-3">
                 <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Общий доступ</h4>
                 <div className="flex items-start gap-3">
                     <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-300 mt-1">
                         {tree.meta.publicAccess ? <Globe size={20} /> : <Lock size={20} />}
                     </div>
                     <div className="flex-1">
                         <select 
                            value={tree.meta.publicAccess || 'RESTRICTED'}
                            onChange={handlePublicAccessChange}
                            className="block w-full text-sm font-medium text-gray-800 dark:text-gray-100 bg-transparent dark:bg-gray-800 border-none focus:ring-0 p-0 mb-1 cursor-pointer"
                         >
                             <option className="text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800" value="RESTRICTED">Доступ ограничен</option>
                             <option className="text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800" value="VIEWER">Все, у кого есть ссылка (Просмотр)</option>
                             <option className="text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800" value="EDITOR">Все, у кого есть ссылка (Редактор)</option>
                         </select>
                         <p className="text-xs text-gray-500 dark:text-gray-400">
                             {tree.meta.publicAccess 
                                ? 'Любой пользователь в интернете, имеющий эту ссылку, может ' + (tree.meta.publicAccess === 'EDITOR' ? 'редактировать' : 'просматривать')
                                : 'Доступ только у добавленных пользователей'
                             }
                         </p>
                     </div>
                 </div>

                 {tree.meta.publicAccess && (
                     <div className="flex items-center gap-2 mt-2">
                         <div className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-500 truncate select-all">
                             {publicLinkUrl}
                         </div>
                         <button 
                            onClick={copyLink}
                            className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-colors"
                         >
                             {copied ? <Check size={14} /> : <Copy size={14} />}
                             {copied ? 'Скопировано' : 'Копировать'}
                         </button>
                     </div>
                 )}
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                 <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Пользователи с доступом</label>
                 <div className="space-y-2 max-h-40 overflow-y-auto">
                    {owner && (
                        <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full ${owner.color || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-bold`}>
                                    {owner.name[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{owner.name}</p>
                                    <p className="text-xs text-gray-500">{owner.email}</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-gray-500">Владелец</span>
                        </div>
                    )}
                    {collaboratorsList.map((collab: any) => (
                        <div key={collab.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full ${collab.color || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-bold`}>
                                    {collab.name?.[0] || '?'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{collab.name}</p>
                                    <p className="text-xs text-gray-500">{collab.email}</p>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">
                                {collab.role === 'EDITOR' ? 'Редактор' : 'Просмотр'}
                            </span>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;