import React, { useState } from 'react';
import { User } from '../types';
import { updateUserProfile, changePassword } from '../services/api';
import { X, User as UserIcon, Mail, Lock, CheckCircle, AlertCircle, Save } from 'lucide-react';

interface UserSettingsModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ user, onClose, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  // Profile State
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Security State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secLoading, setSecLoading] = useState(false);
  const [secMsg, setSecMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setProfileLoading(true);
      setProfileMsg(null);
      try {
          const updated = await updateUserProfile(user.id, { name, email });
          onUpdateUser(updated);
          setProfileMsg({ type: 'success', text: 'Профиль успешно обновлен' });
      } catch (e: any) {
          setProfileMsg({ type: 'error', text: e.message });
      } finally {
          setProfileLoading(false);
      }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSecMsg(null);

      if (newPassword !== confirmPassword) {
          setSecMsg({ type: 'error', text: 'Новые пароли не совпадают' });
          return;
      }

      if (newPassword.length < 6) {
           setSecMsg({ type: 'error', text: 'Пароль слишком короткий (мин. 6 символов)' });
           return;
      }

      setSecLoading(true);
      try {
          await changePassword(user.id, oldPassword, newPassword);
          setSecMsg({ type: 'success', text: 'Пароль успешно изменен' });
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
      } catch (e: any) {
          setSecMsg({ type: 'error', text: e.message });
      } finally {
          setSecLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full ${user.color || 'bg-gray-400'} flex items-center justify-center text-white text-[10px] font-bold`}>
                   {name[0]}
               </div>
                Настройки профиля
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
            </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
             <button 
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
             >
                 Основное
             </button>
             <button 
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'security' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
             >
                 Безопасность
             </button>
        </div>

        <div className="p-6 overflow-y-auto">
            {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input 
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input 
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {profileMsg && (
                        <div className={`p-2 rounded text-xs flex items-center gap-2 ${profileMsg.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                            {profileMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {profileMsg.text}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={profileLoading}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-4"
                    >
                        {profileLoading ? 'Сохранение...' : <><Save size={16} /> Сохранить изменения</>}
                    </button>
                </form>
            )}

            {activeTab === 'security' && (
                <form onSubmit={handleSecuritySubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Текущий пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input 
                                type="password"
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Новый пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input 
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Мин. 6 символов"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Подтвердите новый пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input 
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {secMsg && (
                        <div className={`p-2 rounded text-xs flex items-center gap-2 ${secMsg.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                            {secMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {secMsg.text}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={secLoading || !oldPassword || !newPassword}
                        className="w-full bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2"
                    >
                        {secLoading ? 'Обновление...' : 'Сменить пароль'}
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;