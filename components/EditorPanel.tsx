import React, { useState, useEffect } from 'react';
import { Person, Gender, Relationship, RelationshipType } from '../types';
import { X, Sparkles, User, Calendar, Save, Trash2, Link as LinkIcon, ExternalLink, Lock } from 'lucide-react';
import { generateBiography } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface EditorPanelProps {
  person: Person;
  allPeople: Person[];
  relationships: Relationship[];
  onClose: () => void;
  onUpdate: (updated: Person) => void;
  onDelete: (id: string) => void;
  onAddRelationship: (sourceId: string, targetId: string, type: RelationshipType) => void;
  onRemoveRelationship: (id: string) => void;
  readOnly?: boolean;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
  person, 
  allPeople,
  relationships,
  onClose, 
  onUpdate, 
  onDelete,
  onAddRelationship,
  onRemoveRelationship,
  readOnly = false
}) => {
  const [formData, setFormData] = useState<Person>(person);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'bio' | 'relations'>('info');

  // Sync internal state if prop changes (e.g. user selects different node)
  useEffect(() => {
    setFormData(person);
  }, [person]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (readOnly) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (readOnly) return;
    onUpdate(formData);
  };

  const handleAiGenerate = async () => {
    if (readOnly) return;
    setIsGenerating(true);
    try {
      // First save current rudimentary data to state so AI uses latest
      onUpdate(formData); 
      const bio = await generateBiography(formData);
      const updated = { ...formData, biography: bio };
      setFormData(updated);
      onUpdate(updated);
    } catch (e) {
      alert("Ошибка при генерации биографии. Убедитесь, что ваш AI сервис настроен и работает (VITE_AI_ENDPOINT).");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddConnection = () => {
    if (readOnly) return;
    const targetSelect = document.getElementById('rel-target') as HTMLSelectElement;
    const typeSelect = document.getElementById('rel-type') as HTMLSelectElement;
    
    const targetId = targetSelect.value;
    const formType = typeSelect.value; // 'PARENT', 'CHILD', or 'SPOUSE'

    if (!targetId || !formType) return;

    // Check for existing relationship conflicts
    const existing = relationships.find(r => 
        (r.source === person.id && r.target === targetId) ||
        (r.source === targetId && r.target === person.id)
    );

    if (existing) {
        const isExistingSpouse = existing.type === RelationshipType.Spouse;
        const isExistingParent = existing.type === RelationshipType.Parent; // Covers both parent and child logic in graph terms
        
        const isNewSpouse = formType === 'SPOUSE';
        const isNewParentChild = formType === 'PARENT' || formType === 'CHILD';

        if (isExistingSpouse && isNewParentChild) {
            alert("Ошибка: Невозможно добавить родительскую связь, так как эти люди являются супругами.");
            return;
        }

        if (isExistingParent && isNewSpouse) {
            alert("Ошибка: Невозможно добавить супружескую связь, так как это прямые родственники (родитель/ребенок).");
            return;
        }
    }

    // Execution Logic
    if (formType === 'CHILD') {
        // Logic: "Current Person" is CHILD of "Target".
        // Data Model: Source is Parent. So Source = Target, Target = Current Person.
        onAddRelationship(targetId, person.id, RelationshipType.Parent);
    } else if (formType === 'PARENT') {
        // Logic: "Current Person" is PARENT of "Target".
        // Data Model: Source = Current Person, Target = Target.
        onAddRelationship(person.id, targetId, RelationshipType.Parent);
    } else {
        // SPOUSE
        onAddRelationship(person.id, targetId, RelationshipType.Spouse);
    }
  };

  // Filter relationships relevant to this person
  const myRelationships = relationships.filter(r => r.source === person.id || r.target === person.id);

  const inputClass = `w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`;
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${formData.gender === Gender.Female ? 'bg-pink-400' : 'bg-blue-400'}`}>
                <User size={16} />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {formData.firstName} {formData.lastName}
            </h2>
        </div>
        <div className="flex gap-2">
            {readOnly ? (
               <div className="flex items-center gap-1 text-xs text-orange-500 font-bold bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                 <Lock size={12} /> Только чтение
               </div>
            ) : (
                <>
                <button onClick={handleSave} className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full transition-colors" title="Сохранить">
                    <Save size={18} />
                </button>
                <button onClick={() => onDelete(person.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full transition-colors" title="Удалить">
                    <Trash2 size={18} />
                </button>
                </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full transition-colors">
                <X size={18} />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'info' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
              Основное
          </button>
          <button 
            onClick={() => setActiveTab('relations')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'relations' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
              Связи
          </button>
          <button 
            onClick={() => setActiveTab('bio')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'bio' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
              Биография
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {activeTab === 'info' && (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Имя</label>
                        <input 
                            name="firstName" 
                            value={formData.firstName} 
                            onChange={handleChange} 
                            disabled={readOnly}
                            className={inputClass} 
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Фамилия</label>
                        <input 
                            name="lastName" 
                            value={formData.lastName} 
                            onChange={handleChange} 
                            disabled={readOnly}
                            className={inputClass} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Дата рождения</label>
                        <input 
                            type="date"
                            name="birthDate" 
                            value={formData.birthDate || ''} 
                            onChange={handleChange} 
                            disabled={readOnly}
                            className={inputClass} 
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Дата смерти</label>
                        <input 
                            type="date"
                            name="deathDate" 
                            value={formData.deathDate || ''} 
                            onChange={handleChange} 
                            disabled={readOnly}
                            className={inputClass} 
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Место рождения</label>
                    <input 
                        name="birthPlace" 
                        value={formData.birthPlace || ''} 
                        onChange={handleChange} 
                        disabled={readOnly}
                        className={inputClass} 
                        placeholder="г. Москва"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Пол</label>
                        <select 
                            name="gender" 
                            value={formData.gender} 
                            onChange={handleChange} 
                            disabled={readOnly}
                            className={inputClass}
                        >
                            <option value={Gender.Male}>Мужской</option>
                            <option value={Gender.Female}>Женский</option>
                            <option value={Gender.Other}>Другое</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Род деятельности</label>
                        <input 
                            name="occupation" 
                            value={formData.occupation || ''} 
                            onChange={handleChange} 
                            disabled={readOnly}
                            className={inputClass} 
                        />
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'relations' && (
             <div className="space-y-6">
                {!readOnly && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Добавить связь</h4>
                        <div className="space-y-2">
                            <select id="rel-target" className={inputClass}>
                                <option value="">Выберите родственника...</option>
                                {allPeople.filter(p => p.id !== person.id).map(p => (
                                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                                ))}
                            </select>
                            <select id="rel-type" className={inputClass}>
                                <option value="PARENT">Является родителем для выбранного</option>
                                <option value="CHILD">Является ребенком выбранного</option>
                                <option value="SPOUSE">Супруг(а)</option>
                            </select>
                            <button 
                                onClick={handleAddConnection}
                                className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 text-sm font-medium transition-colors"
                            >
                                Связать
                            </button>
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b dark:border-gray-700 pb-2">Существующие связи</h4>
                    {myRelationships.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Связей нет</p>
                    ) : (
                        <ul className="space-y-2">
                            {myRelationships.map(r => {
                                const isSource = r.source === person.id;
                                const otherId = isSource ? r.target : r.source;
                                const other = allPeople.find(p => p.id === otherId);
                                if (!other) return null;

                                let desc = '';
                                if (r.type === RelationshipType.Spouse) desc = 'Супруг(а)';
                                else if (r.type === RelationshipType.Parent) {
                                    desc = isSource ? 'Родитель для' : 'Ребенок';
                                }

                                return (
                                    <li key={r.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                        <div className="flex items-center gap-2">
                                            <LinkIcon size={14} className="text-gray-400"/>
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">{desc}:</span>
                                            <span className="text-gray-800 dark:text-gray-200">{other.firstName} {other.lastName}</span>
                                        </div>
                                        {!readOnly && (
                                            <button onClick={() => onRemoveRelationship(r.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
             </div>
        )}

        {activeTab === 'bio' && (
            <div className="flex flex-col h-full">
                 <div className="mb-4 flex items-center justify-between">
                     <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Биография</h3>
                     {!readOnly && (
                         <button 
                            onClick={handleAiGenerate}
                            disabled={isGenerating}
                            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                         >
                            <Sparkles size={14} />
                            {isGenerating ? 'Пишем...' : 'AI Авто-биография'}
                         </button>
                     )}
                 </div>
                 
                 {/* Split view for Markdown */}
                 <div className="flex-1 flex flex-col gap-4">
                    {!readOnly && (
                        <textarea 
                            name="biography"
                            value={formData.biography}
                            onChange={handleChange}
                            className={`${inputClass} h-64 font-mono resize-none`}
                            placeholder="# Введение..."
                        />
                    )}
                    <div className={`bg-gray-50 dark:bg-gray-700/30 p-4 rounded border border-gray-200 dark:border-gray-700 prose prose-sm dark:prose-invert max-w-none overflow-y-auto ${readOnly ? 'h-full' : 'max-h-64'}`}>
                         {!readOnly && <h4 className="text-xs font-uppercase text-gray-400 mb-2">Предпросмотр</h4>}
                         {formData.biography ? (
                            <ReactMarkdown>{formData.biography}</ReactMarkdown>
                         ) : (
                            <p className="text-gray-400 italic text-xs">Биография пуста</p>
                         )}
                    </div>
                 </div>
            </div>
        )}

      </div>
      
      {/* Footer */}
      {!readOnly && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-xs text-center text-gray-400 dark:text-gray-500">
            Изменения сохраняются локально.
        </div>
      )}
    </div>
  );
};

export default EditorPanel;