import React, { useState, useEffect } from 'react';
import { Person, Relationship, RelationshipType, Gender, TreeData, User, AccessLevel } from './types';
import GraphVisualizer from './components/GraphVisualizer';
import EditorPanel from './components/EditorPanel';
import AuthScreen from './components/AuthScreen';
import ShareModal from './components/ShareModal';
import Dashboard from './components/Dashboard';
import UserSettingsModal from './components/UserSettingsModal';
import ImportModal from './components/ImportModal';
import { getSession, getUserTrees, createTree, saveTree, logoutUser, getTreePermission, getTreeByToken, createGuestUser, migrateGuestData, mergeTrees } from './services/api';
import { Plus, Download, Share2, Users, Moon, Sun, X, HelpCircle, Link as LinkIcon, LogOut, ChevronLeft, Globe, LogIn, Upload } from 'lucide-react';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // App State
  const [trees, setTrees] = useState<TreeData[]>([]);
  const [currentTree, setCurrentTree] = useState<TreeData | null>(null);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Filters
  const [visibleRelTypes, setVisibleRelTypes] = useState<RelationshipType[]>([
    RelationshipType.Parent,
    RelationshipType.Spouse,
    RelationshipType.Sibling
  ]);

  // Proximity Modal State
  const [proximityTarget, setProximityTarget] = useState<{source: string, target: string} | null>(null);

  // --- Auth & Init Logic ---

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      const user = await getSession(); // Now async
      if (user) {
        await handleLoginSuccess(user, false);
        
        if (token) {
            try {
                const sharedTree = await getTreeByToken(token);
                if (sharedTree) {
                    const existing = await getUserTrees(user.id).then(list => list.find(t => t.id === sharedTree.id));
                    setCurrentTree(existing || sharedTree);
                }
            } catch (e) { console.error("Error loading token tree", e); }
        } 
      } else if (token) {
          try {
            const sharedTree = await getTreeByToken(token);
            if (sharedTree) {
                const guest = createGuestUser();
                setCurrentUser(guest);
                setCurrentTree(sharedTree);
            } else {
                await initGuest();
            }
          } catch { await initGuest(); }
      } else {
         await initGuest();
      }

      setIsLoadingAuth(false);
    };
    init();

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  const initGuest = async () => {
     const guest = createGuestUser();
     setCurrentUser(guest);
     const userTrees = await getUserTrees(guest.id);
     setTrees(userTrees);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // --- Permission Helpers ---
  const currentAccessLevel: AccessLevel = currentTree
    ? getTreePermission(currentTree, currentUser?.id)
    : 'VIEWER';

  const canEdit = currentAccessLevel === 'OWNER' || currentAccessLevel === 'EDITOR';

  const selectedPerson = currentTree?.people.find(p => p.id === selectedId);

  // --- Handlers ---

  const handleLoginSuccess = async (user: User, migrate = true) => {
      if (migrate) {
         try {
             await migrateGuestData(user.id);
         } catch (e) { console.error("Migration failed", e); }
      }
      setCurrentUser(user);
      const userTrees = await getUserTrees(user.id);
      setTrees(userTrees);
      setShowAuthModal(false);
      
      if (currentTree) {
         const refreshed = userTrees.find(t => t.id === currentTree.id);
         if (refreshed) setCurrentTree(refreshed);
      }
  };

  const handleLogout = async () => {
      await logoutUser();
      await initGuest();
      setCurrentTree(null);
      if (window.location.search.includes('token')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          window.history.pushState({}, '', url);
      }
  };

  const handleCreateTree = async (name: string) => {
      if (!currentUser) return;
      const newTree = await createTree(currentUser.id, name);
      setTrees(prev => [...prev, newTree]);
      setCurrentTree(newTree);
  };

  const handleUpdateTreeData = async (updatedTree: TreeData) => {
      setCurrentTree(updatedTree);
      // Optimistic update
      setTrees(prev => {
          const exists = prev.find(t => t.id === updatedTree.id);
          if (exists) return prev.map(t => t.id === updatedTree.id ? updatedTree : t);
          return prev;
      });
      await saveTree(updatedTree);
  };

  const handleSelectPerson = (id: string) => {
    setSelectedId(id);
    setIsPanelOpen(true);
  };

  const handleAddPerson = () => {
    if (!currentTree || !canEdit) return;
    const newPerson: Person = {
      id: generateId(),
      firstName: 'Новый',
      lastName: 'Человек',
      gender: Gender.Male,
      biography: ''
    };
    const updatedTree = {
        ...currentTree,
        people: [...currentTree.people, newPerson]
    };
    handleUpdateTreeData(updatedTree);
    handleSelectPerson(newPerson.id);
  };

  const handleUpdatePerson = (updated: Person) => {
    if (!currentTree || !canEdit) return;
    const updatedTree = {
        ...currentTree,
        people: currentTree.people.map(p => p.id === updated.id ? updated : p)
    };
    handleUpdateTreeData(updatedTree);
  };

  const handleDeletePerson = (id: string) => {
    if (!currentTree || !canEdit) return;
    if (confirm("Вы уверены? Все связи будут удалены.")) {
      const updatedTree = {
          ...currentTree,
          people: currentTree.people.filter(p => p.id !== id),
          relationships: currentTree.relationships.filter(r => r.source !== id && r.target !== id)
      };
      handleUpdateTreeData(updatedTree);
      setSelectedId(null);
      setIsPanelOpen(false);
    }
  };

  const handleAddRelationship = (source: string, target: string, type: RelationshipType) => {
    if (!currentTree || !canEdit) return;
    const exists = currentTree.relationships.find(r => 
      (r.source === source && r.target === target && r.type === type) ||
      (type === RelationshipType.Spouse && r.source === target && r.target === source)
    );
    if (!exists) {
      const updatedTree = {
          ...currentTree,
          relationships: [...currentTree.relationships, { id: generateId(), source, target, type }]
      };
      handleUpdateTreeData(updatedTree);
    }
  };

  const handleRemoveRelationship = (id: string) => {
    if (!currentTree || !canEdit) return;
    const updatedTree = {
        ...currentTree,
        relationships: currentTree.relationships.filter(r => r.id !== id)
    };
    handleUpdateTreeData(updatedTree);
  };

  const checkGuestAction = (action: () => void) => {
      if (currentUser?.isGuest) {
          setShowAuthModal(true);
      } else {
          action();
      }
  };

  const handleExport = () => {
    if (!currentTree) return;
    checkGuestAction(() => {
        const blob = new Blob([JSON.stringify(currentTree, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tree_${currentTree.meta.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
  };

  const handleImportTree = (importedData: Partial<TreeData>, strategy: 'MERGE' | 'REPLACE') => {
     if (!currentTree) return;
     let finalTree: TreeData;
     if (strategy === 'REPLACE') {
        finalTree = {
            ...currentTree,
            people: importedData.people || [],
            relationships: importedData.relationships || [],
            meta: { ...currentTree.meta, lastModified: Date.now() }
        };
     } else {
         finalTree = mergeTrees(currentTree, importedData);
     }
     handleUpdateTreeData(finalTree);
  };

  const handleProximityDrop = (sourceId: string, targetId: string) => {
      if (!canEdit) return;
      if (sourceId === targetId) return;
      if (!currentTree) return;

      const connected = currentTree.relationships.some(r => 
        (r.source === sourceId && r.target === targetId) || 
        (r.source === targetId && r.target === sourceId)
      );
      if (!connected) {
        setProximityTarget({ source: sourceId, target: targetId });
      }
  };

  const confirmProximityConnection = (type: string) => {
      if (!proximityTarget) return;
      const { source, target } = proximityTarget;
      if (type === 'PARENT') handleAddRelationship(source, target, RelationshipType.Parent);
      else if (type === 'CHILD') handleAddRelationship(target, source, RelationshipType.Parent);
      else if (type === 'SPOUSE') handleAddRelationship(source, target, RelationshipType.Spouse);
      else if (type === 'SIBLING') handleAddRelationship(source, target, RelationshipType.Sibling);
      setProximityTarget(null);
  };

  const handleBackToDashboard = () => {
      setCurrentTree(null);
      if (window.location.search.includes('token')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          window.history.pushState({}, '', url);
      }
  };

  if (isLoadingAuth) return <div className="h-screen flex items-center justify-center dark:bg-gray-900 text-gray-500">Загрузка...</div>;

  return (
      <div className="h-screen w-screen overflow-hidden">
          {showAuthModal && (
              <AuthScreen 
                  onSuccess={(u) => handleLoginSuccess(u, true)} 
                  isModal 
                  onClose={() => setShowAuthModal(false)}
              />
          )}

          {isSettingsModalOpen && currentUser && !currentUser.isGuest && (
              <UserSettingsModal 
                  user={currentUser} 
                  onClose={() => setIsSettingsModalOpen(false)}
                  onUpdateUser={setCurrentUser}
              />
          )}

          {isImportModalOpen && (
              <ImportModal 
                  onClose={() => setIsImportModalOpen(false)}
                  onImport={handleImportTree}
              />
          )}

          {!currentTree && currentUser ? (
              <Dashboard 
                user={currentUser}
                trees={trees}
                onSelectTree={setCurrentTree}
                onCreateTree={handleCreateTree}
                onLogout={handleLogout}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onGuestLogin={() => setShowAuthModal(true)}
                isDarkMode={isDarkMode}
                toggleTheme={() => setIsDarkMode(!isDarkMode)}
              />
          ) : (
            <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
              <nav className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm z-10 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleBackToDashboard}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors"
                        title="Вернуться к списку"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight">
                            {currentTree?.meta.name}
                        </span>
                         <div className="flex items-center gap-2">
                            {currentUser?.isGuest && (
                                <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit uppercase font-bold">
                                    Гость
                                </span>
                            )}
                            {currentTree?.meta.publicAccess && (
                                 <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                                     <Globe size={8} /> Ссылка
                                 </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setIsDarkMode(!isDarkMode)} 
                     className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                   >
                     {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                   </button>

                   {canEdit && (
                       <button onClick={handleAddPerson} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
                         <Plus size={16} />
                         <span className="hidden sm:inline">Добавить</span>
                       </button>
                   )}

                   {canEdit && (
                       <button 
                         onClick={() => setIsImportModalOpen(true)} 
                         className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" 
                         title="Импорт"
                       >
                           <Upload size={20} />
                       </button>
                   )}

                   <button onClick={handleExport} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Экспорт">
                     <Download size={20} />
                   </button>

                   {currentTree && (
                       <button 
                        onClick={() => checkGuestAction(() => setIsShareModalOpen(true))}
                        className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 rounded-lg font-medium transition-colors text-sm ml-2"
                       >
                         {currentUser?.isGuest ? <LogIn size={16} /> : <Share2 size={16} />}
                         <span className="hidden sm:inline">{currentUser?.isGuest ? 'Сохранить' : 'Доступ'}</span>
                       </button>
                   )}
                </div>
              </nav>

              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 relative">
                   {currentTree ? (
                       <GraphVisualizer 
                         people={currentTree.people} 
                         relationships={currentTree.relationships} 
                         onSelectPerson={handleSelectPerson}
                         selectedPersonId={selectedId}
                         isDarkMode={isDarkMode}
                         visibleRelTypes={visibleRelTypes}
                         onToggleRelType={type => setVisibleRelTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                         onProximityDrop={handleProximityDrop}
                       />
                   ) : (
                       <div className="w-full h-full flex items-center justify-center text-gray-400">Нет выбранного древа</div>
                   )}
                   
                   {showHelp && (
                     <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 max-w-xs transition-colors duration-300 pointer-events-auto">
                       <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Как пользоваться:</h3>
                          <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <X size={14} />
                          </button>
                       </div>
                       <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc pl-4 space-y-1">
                         <li>Колесико мыши для зума</li>
                         <li>Перетаскивайте узлы для удобства</li>
                         {canEdit ? (
                             <li><b>Поднесите один узел к другому</b>, чтобы создать связь</li>
                         ) : (
                             <li className="text-orange-500">Режим просмотра (редактирование недоступно)</li>
                         )}
                         <li>Кликните на легенду снизу, чтобы скрыть линии</li>
                       </ul>
                     </div>
                   )}
                   
                   {!showHelp && (
                      <button 
                        onClick={() => setShowHelp(true)}
                        className="absolute top-4 left-4 p-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-full shadow border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 transition-all"
                      >
                        <HelpCircle size={20} />
                      </button>
                   )}

                   {proximityTarget && currentTree && canEdit && (
                     <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 transform transition-all scale-100">
                            {(() => {
                                const sourceP = currentTree.people.find(p => p.id === proximityTarget.source);
                                const targetP = currentTree.people.find(p => p.id === proximityTarget.target);
                                if (!sourceP || !targetP) return null;
                                return (
                                    <>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
                                            Создать связь?
                                        </h3>
                                        <div className="flex items-center justify-center gap-4 mb-6">
                                            <div className="text-center">
                                                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mx-auto mb-2 text-indigo-700 dark:text-indigo-300 font-bold">
                                                    {sourceP.firstName[0]}
                                                </div>
                                                <span className="text-sm font-medium dark:text-gray-300">{sourceP.firstName}</span>
                                            </div>
                                            <div className="text-gray-400"><LinkIcon size={20} /></div>
                                            <div className="text-center">
                                                <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center mx-auto mb-2 text-pink-700 dark:text-pink-300 font-bold">
                                                    {targetP.firstName[0]}
                                                </div>
                                                <span className="text-sm font-medium dark:text-gray-300">{targetP.firstName}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 text-center mb-4">Кем является <b>{sourceP.firstName}</b> для <b>{targetP.firstName}</b>?</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => confirmProximityConnection('PARENT')} className="p-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-bold transition-colors">
                                                Родителем
                                            </button>
                                            <button onClick={() => confirmProximityConnection('CHILD')} className="p-3 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg text-sm font-bold transition-colors">
                                                Ребенком
                                            </button>
                                            <button onClick={() => confirmProximityConnection('SPOUSE')} className="p-3 bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-900/50 text-pink-700 dark:text-pink-300 rounded-lg text-sm font-bold transition-colors">
                                                Супругом(ой)
                                            </button>
                                            <button onClick={() => confirmProximityConnection('SIBLING')} className="p-3 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-lg text-sm font-bold transition-colors">
                                                Братом/Сестрой
                                            </button>
                                        </div>
                                        <button onClick={() => setProximityTarget(null)} className="mt-4 w-full py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm">
                                            Отмена
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                     </div>
                   )}
                </div>

                {isPanelOpen && selectedPerson && currentTree && (
                   <div className="w-[450px] transition-all duration-300 ease-in-out h-full z-20">
                     <EditorPanel 
                       person={selectedPerson} 
                       allPeople={currentTree.people}
                       relationships={currentTree.relationships}
                       onClose={() => setIsPanelOpen(false)}
                       onUpdate={handleUpdatePerson}
                       onDelete={handleDeletePerson}
                       onAddRelationship={handleAddRelationship}
                       onRemoveRelationship={handleRemoveRelationship}
                       readOnly={!canEdit}
                     />
                   </div>
                )}

                {isShareModalOpen && currentTree && currentUser && !currentUser.isGuest && (
                    <ShareModal 
                        tree={currentTree}
                        currentUser={currentUser}
                        onClose={() => setIsShareModalOpen(false)}
                        onUpdate={async () => {
                            const userTrees = await getUserTrees(currentUser.id);
                            setTrees(userTrees);
                            const fresh = userTrees.find(t => t.id === currentTree.id);
                            if (fresh) setCurrentTree(fresh);
                        }}
                    />
                )}
              </div>
            </div>
          )}
      </div>
  );
};

export default App;