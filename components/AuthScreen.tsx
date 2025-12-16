import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser } from '../services/api';
import { Users, Lock, Mail, User as UserIcon, CheckCircle, X } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
  isModal?: boolean;
  onClose?: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, isModal, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) return "Пароль должен быть не менее 6 символов";
    if (!/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) return "Пароль должен содержать буквы и цифры";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
        if (password !== confirmPassword) {
            setError("Пароли не совпадают");
            return;
        }
        const pwdError = validatePassword(password);
        if (pwdError) {
            setError(pwdError);
            return;
        }
    }

    setLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await loginUser(email, password);
      } else {
        if (!name) throw new Error("Введите имя");
        user = await registerUser(email, password, name);
      }
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  const containerClass = isModal 
    ? "fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" 
    : "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4";

  return (
    <div className={containerClass}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-100 dark:border-gray-700 transition-all duration-500 relative animate-in fade-in zoom-in-95 duration-200">
        
        {isModal && onClose && (
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
                <X size={24} />
            </button>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <Users className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {isModal ? 'Сохраните прогресс' : 'Родословная AI'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {isModal 
                ? 'Войдите или зарегистрируйтесь, чтобы экспортировать данные и сохранить доступ к вашему дереву.' 
                : (isLogin ? 'Войдите в свой аккаунт' : 'Создайте новое семейное древо')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Иван Иванов"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="ivan@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {!isLogin && (
             <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Подтвердите пароль</label>
                <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <div className="absolute right-3 top-3">
                    {confirmPassword && password === confirmPassword ? 
                        <CheckCircle className="text-green-500 w-5 h-5" /> : null
                    }
                </div>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="••••••••"
                    required
                />
                </div>
                <p className="text-xs text-gray-500 mt-1">Минимум 6 символов, буквы и цифры</p>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-50 mt-4"
          >
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm border-t border-gray-100 dark:border-gray-700 pt-4">
          <span className="text-gray-500 dark:text-gray-400">
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          </span>
          <button
            onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setPassword('');
                setConfirmPassword('');
            }}
            className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            {isLogin ? 'Создать' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;