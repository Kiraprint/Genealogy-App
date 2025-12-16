import React, { useState, useRef } from 'react';
import { Upload, X, AlertTriangle, FileJson, GitMerge, RefreshCw } from 'lucide-react';
import { TreeData } from '../types';

interface ImportModalProps {
  onImport: (data: Partial<TreeData>, strategy: 'MERGE' | 'REPLACE') => void;
  onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<'MERGE' | 'REPLACE'>('MERGE');
  const [error, setError] = useState<string>('');
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Пожалуйста, выберите файл.");
      return;
    }

    setIsReading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        // Basic validation
        if (!Array.isArray(json.people)) {
           throw new Error("Неверный формат файла: отсутствует список людей.");
        }

        onImport(json, strategy);
        onClose();
      } catch (err: any) {
        setError("Ошибка чтения файла: " + err.message);
      } finally {
        setIsReading(false);
      }
    };

    reader.onerror = () => {
      setError("Ошибка при чтении файла.");
      setIsReading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
           <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
             <Upload size={20} className="text-indigo-600 dark:text-indigo-400" />
             Импорт древа
           </h3>
           <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
             <X size={20} />
           </button>
        </div>

        <div className="p-6 space-y-6">
           {/* File Input */}
           <div 
             className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-700/30"
             onClick={() => fileInputRef.current?.click()}
           >
             <input 
               type="file" 
               ref={fileInputRef}
               className="hidden"
               accept=".json"
               onChange={handleFileChange}
             />
             <div className="flex flex-col items-center gap-2">
                <FileJson size={32} className="text-gray-400" />
                {file ? (
                    <span className="font-medium text-indigo-600 dark:text-indigo-400 break-all">{file.name}</span>
                ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">Нажмите, чтобы выбрать .json файл</span>
                )}
             </div>
           </div>

           {/* Strategies */}
           <div className="space-y-3">
               <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Стратегия импорта</label>
               
               <div 
                 onClick={() => setStrategy('MERGE')}
                 className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${strategy === 'MERGE' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
               >
                   <div className="mt-1 text-indigo-600 dark:text-indigo-400"><GitMerge size={18} /></div>
                   <div>
                       <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Слияние (Безопасно)</div>
                       <div className="text-xs text-gray-500 dark:text-gray-400">Добавляет новых людей и связи к текущему древу. Совпадения проверяются по ID.</div>
                   </div>
               </div>

               <div 
                 onClick={() => setStrategy('REPLACE')}
                 className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${strategy === 'REPLACE' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
               >
                   <div className="mt-1 text-red-600 dark:text-red-400"><RefreshCw size={18} /></div>
                   <div>
                       <div className="font-medium text-sm text-red-700 dark:text-red-300">Полная замена (Опасно)</div>
                       <div className="text-xs text-red-600/80 dark:text-red-400/80">Удаляет текущее древо и заменяет его данными из файла.</div>
                   </div>
               </div>
           </div>

           {error && (
             <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                 <AlertTriangle size={16} />
                 {error}
             </div>
           )}

           <div className="flex justify-end gap-3 pt-2">
               <button 
                 onClick={onClose}
                 className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
               >
                 Отмена
               </button>
               <button 
                 onClick={handleSubmit}
                 disabled={!file || isReading}
                 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-md disabled:opacity-50 transition-colors"
               >
                 {isReading ? 'Чтение...' : 'Импортировать'}
               </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;