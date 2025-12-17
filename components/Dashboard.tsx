import React, { useState } from 'react';
import { TreeData, User, AccessLevel } from '../types';
import { Search, Plus, Clock, User as UserIcon, Shield, LogOut, Moon, Sun, FolderOpen, MoreVertical, Trash2, X, Settings, LogIn } from 'lucide-react'; 

interface DashboardProps {
  user: User;
  trees: TreeData[];
  onSelectTree: (tree: TreeData) => void;
  onCreateTree: (name: string) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onGuestLogin: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  trees, 
  onSelectTree, 
  onCreateTree, 
  onLogout,
  onOpenSettings,
  onGuestLogin,
  isDarkMode,
  toggleTheme
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');

  const filteredTrees = trees.filter(tree => 
    tree.meta.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTreeName.trim()) {
      onCreateTree(newTreeName);
      setNewTreeName('');
      setIsCreateModalOpen(false);
    }
  };

  const getRoleBadge = (tree: TreeData) => {
    const isOwner = tree.meta.ownerId === user.id;
    if (isOwner) {
      return <span className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-1 rounded-full">Владелец</span>;
    }
    const collab = tree.collaborators.find(c => c.userId === user.id);
    const role = collab?.role || 'VIEWER';
    
    if (role === 'EDITOR') {
       return <span className="text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded-full">Редактор</span>;
    }
    return <span className="text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">Просмотр</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
             <UserIcon className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white hidden sm:block">Родословная AI</h1>
          {user.isGuest && (
              <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">
                  Гостевой режим
              </span>
          )}
        </div>

        <div className="flex-1 max-w-md mx-6">
          <div className="relative group">
            <Search className="absolute left-3 top-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Поиск по деревьям..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-transparent focus:bg-white dark:focus:bg-gray-600 border focus:border-indigo-500 rounded-xl outline-none text-gray-800 dark:text-gray-100 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={toggleTheme} 
             className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
           >
             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>
           
           {!user.isGuest ? (
               <>
                <button 
                    onClick={onOpenSettings}
                    className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
                >
                    <div className={`w-6 h-6 rounded-full ${user.color || 'bg-gray-400'} flex items-center justify-center text-white text-[10px] font-bold`}>
                        {user.name[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name}</span>
                    <Settings size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                </button>

                <button 
                    onClick={onLogout}
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Выйти"
                >
                    <LogOut size={20} />
                </button>
               </>
           ) : (
                <button 
                    onClick={onGuestLogin}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-md text-sm font-bold"
                >
                    <LogIn size={16} />
                    <span className="hidden sm:inline">Войти / Сохранить</span>
                </button>
           )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Мои деревья</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {user.isGuest 
                ? 'Ваши временные деревья. Войдите в аккаунт, чтобы не потерять их.'
                : 'Управляйте своими семейными древами и теми, к которым у вас есть доступ.'
              }
            </p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Создать древо</span>
          </button>
        </div>

        {filteredTrees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
               <FolderOpen className="text-gray-300 dark:text-gray-600" size={48} />
             </div>
             <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
               {searchQuery ? 'Ничего не найдено' : 'У вас пока нет деревьев'}
             </h3>
             <p className="text-gray-500 max-w-sm">
               {searchQuery ? 'Попробуйте изменить поисковый запрос.' : 'Создайте свое первое генеалогическое древо, чтобы начать историю вашей семьи.'}
             </p>
             {!searchQuery && (
               <button onClick={() => setIsCreateModalOpen(true)} className="mt-6 text-indigo-600 font-medium hover:underline">
                 Создать первое древо
               </button>
             )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrees.map(tree => (
              <div 
                key={tree.id}
                onClick={() => onSelectTree(tree)}
                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-indigo-600">
                     <FolderOpen size={16} />
                   </div>
                </div>

                <div className="mb-4">
                  {getRoleBadge(tree)}
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {tree.meta.name}
                </h3>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center gap-1.5">
                    <UserIcon size={14} />
                    <span>{tree.people.length} чел.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{formatDate(tree.meta.lastModified)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Tree Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-700 p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-gray-800 dark:text-white">Новое древо</h3>
               <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                 <X size={20} />
               </button>
             </div>
             <form onSubmit={handleCreateSubmit}>
               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название семьи</label>
                 <input 
                   type="text" 
                   value={newTreeName}
                   onChange={e => setNewTreeName(e.target.value)}
                   placeholder="Семья Ивановых"
                   autoFocus
                   className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
               </div>
               <div className="flex justify-end gap-2">
                 <button 
                   type="button"
                   onClick={() => setIsCreateModalOpen(false)}
                   className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                 >
                   Отмена
                 </button>
                 <button 
                   type="submit"
                   disabled={!newTreeName.trim()}
                   className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                 >
                   Создать
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;