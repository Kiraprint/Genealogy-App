import { User, TreeData, AccessLevel, Gender, RelationshipType, Person, Relationship } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIGURATION ---
// Set this to TRUE to connect to a real Node.js server (see server.js code)
// Set this to FALSE to use LocalStorage (Demo mode)
const USE_REAL_API = false; 
const API_BASE_URL = 'http://localhost:3000/api';

// --- HELPERS ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- TYPES ---
interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// ==========================================
// MOCK IMPLEMENTATION (LocalStorage)
// ==========================================
const USERS_KEY = 'genai_users';
const TREES_KEY = 'genai_trees';
const SESSION_KEY = 'genai_session';

const MockBackend = {
    registerUser: async (email: string, password: string, name: string): Promise<User> => {
        await delay(500);
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        if (users.find((u: User) => u.email === email)) throw new Error("Пользователь существует");
        const newUser = { 
            id: generateId(), email, name, password, 
            color: ['bg-red-500', 'bg-blue-500', 'bg-green-500'][Math.floor(Math.random() * 3)] 
        };
        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
        return newUser;
    },
    loginUser: async (email: string, password: string): Promise<User> => {
        await delay(500);
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const user = users.find((u: User) => u.email === email && u.password === password);
        if (!user) throw new Error("Неверные данные");
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
    },
    logoutUser: async () => {
        localStorage.removeItem(SESSION_KEY);
    },
    getSession: (): User | null => {
        const s = localStorage.getItem(SESSION_KEY);
        return s ? JSON.parse(s) : null;
    },
    createGuestUser: (): User => ({ id: 'guest_user', email: '', name: 'Гость', isGuest: true, color: 'bg-gray-400' }),
    
    getUserTrees: async (userId: string): Promise<TreeData[]> => {
        await delay(300);
        const all = JSON.parse(localStorage.getItem(TREES_KEY) || '[]');
        return all.filter((t: TreeData) => t.meta.ownerId === userId || t.collaborators.some(c => c.userId === userId));
    },
    getTreeByToken: async (token: string): Promise<TreeData | null> => {
        const all = JSON.parse(localStorage.getItem(TREES_KEY) || '[]');
        return all.find((t: TreeData) => t.meta.publicToken === token) || null;
    },
    saveTree: async (tree: TreeData): Promise<void> => {
        const all = JSON.parse(localStorage.getItem(TREES_KEY) || '[]');
        const idx = all.findIndex((t: TreeData) => t.id === tree.id);
        if (idx !== -1) all[idx] = { ...tree, meta: { ...tree.meta, lastModified: Date.now() } };
        else all.push(tree);
        localStorage.setItem(TREES_KEY, JSON.stringify(all));
    },
    createTree: async (userId: string, name: string): Promise<TreeData> => {
        const newTree: TreeData = {
            id: generateId(),
            people: [{ id: '1', firstName: 'Основатель', lastName: 'Рода', gender: Gender.Male, biography: '# Глава семьи', birthDate: '1950-01-01' }],
            relationships: [],
            meta: { name, lastModified: Date.now(), ownerId: userId, publicToken: null, publicAccess: null },
            collaborators: []
        };
        await MockBackend.saveTree(newTree);
        return newTree;
    },
    updateUserProfile: async (userId: string, data: any): Promise<User> => {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const idx = users.findIndex((u: User) => u.id === userId);
        if (idx === -1) throw new Error("User not found");
        users[idx] = { ...users[idx], ...data };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(SESSION_KEY, JSON.stringify(users[idx]));
        return users[idx];
    },
    changePassword: async (userId: string, oldP: string, newP: string) => {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const user = users.find((u: User) => u.id === userId);
        if (user.password !== oldP) throw new Error("Неверный старый пароль");
        user.password = newP;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    },
    shareTree: async (treeId: string, email: string, role: AccessLevel) => {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const target = users.find((u: User) => u.email === email);
        if (!target) throw new Error("Пользователь не найден");
        
        const allTrees = JSON.parse(localStorage.getItem(TREES_KEY) || '[]');
        const tree = allTrees.find((t: TreeData) => t.id === treeId);
        if (!tree) throw new Error("Tree not found");

        const existing = tree.collaborators.find((c: any) => c.userId === target.id);
        if (existing) existing.role = role;
        else tree.collaborators.push({ userId: target.id, role });
        
        localStorage.setItem(TREES_KEY, JSON.stringify(allTrees));
    },
    setPublicAccess: async (treeId: string, level: AccessLevel | null) => {
        const allTrees = JSON.parse(localStorage.getItem(TREES_KEY) || '[]');
        const tree = allTrees.find((t: TreeData) => t.id === treeId);
        if (!tree) throw new Error("Tree not found");
        
        tree.meta.publicAccess = level;
        tree.meta.publicToken = level ? (tree.meta.publicToken || uuidv4()) : null;
        localStorage.setItem(TREES_KEY, JSON.stringify(allTrees));
    },
    migrateGuestData: async (realUserId: string) => {
        const allTrees = JSON.parse(localStorage.getItem(TREES_KEY) || '[]');
        let changed = false;
        allTrees.forEach((t: TreeData) => {
            if (t.meta.ownerId === 'guest_user') {
                t.meta.ownerId = realUserId;
                changed = true;
            }
        });
        if (changed) localStorage.setItem(TREES_KEY, JSON.stringify(allTrees));
    },
    getUsersByIds: async (ids: string[]): Promise<User[]> => {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        return users.filter((u: User) => ids.includes(u.id));
    }
};

// ==========================================
// REAL API IMPLEMENTATION (Fetch)
// ==========================================
const apiRequest = async (endpoint: string, method: string, body?: any) => {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method, headers, body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server Error');
    return data;
};

const RealBackend = {
    registerUser: async (email: string, password: string, name: string) => {
        const { user, token } = await apiRequest('/auth/register', 'POST', { email, password, name });
        localStorage.setItem('auth_token', token);
        return user;
    },
    loginUser: async (email: string, password: string) => {
        const { user, token } = await apiRequest('/auth/login', 'POST', { email, password });
        localStorage.setItem('auth_token', token);
        return user;
    },
    logoutUser: async () => {
        localStorage.removeItem('auth_token');
    },
    getSession: async (): Promise<User | null> => {
        if (!localStorage.getItem('auth_token')) return null;
        try {
            return await apiRequest('/users/me', 'GET');
        } catch {
            return null;
        }
    },
    createGuestUser: MockBackend.createGuestUser, // Guests are local-only until migration
    getUserTrees: async (userId: string) => {
        if (userId === 'guest_user') return MockBackend.getUserTrees(userId);
        return await apiRequest('/trees', 'GET');
    },
    getTreeByToken: async (token: string) => {
        return await apiRequest(`/trees/public/${token}`, 'GET');
    },
    createTree: async (userId: string, name: string) => {
        if (userId === 'guest_user') return MockBackend.createTree(userId, name);
        return await apiRequest('/trees', 'POST', { name });
    },
    saveTree: async (tree: TreeData) => {
        if (tree.meta.ownerId === 'guest_user') return MockBackend.saveTree(tree);
        return await apiRequest(`/trees/${tree.id}`, 'PUT', tree);
    },
    updateUserProfile: async (userId: string, data: any) => {
        return await apiRequest('/users/me', 'PUT', data);
    },
    changePassword: async (userId: string, oldP: string, newP: string) => {
        return await apiRequest('/users/password', 'PUT', { oldPassword: oldP, newPassword: newP });
    },
    shareTree: async (treeId: string, email: string, role: AccessLevel) => {
        return await apiRequest(`/trees/${treeId}/share`, 'POST', { email, role });
    },
    setPublicAccess: async (treeId: string, level: AccessLevel | null) => {
        return await apiRequest(`/trees/${treeId}/public`, 'POST', { accessLevel: level });
    },
    migrateGuestData: async (realUserId: string) => {
        // Get local guest trees
        const localTrees = await MockBackend.getUserTrees('guest_user');
        // Push them to server
        for (const tree of localTrees) {
            tree.meta.ownerId = realUserId;
            // Create clean copy on server
            await apiRequest('/trees', 'POST', { ...tree, forceId: tree.id }); 
        }
        // Clean local
        localStorage.removeItem(TREES_KEY); 
    },
    getUsersByIds: async (ids: string[]) => {
        // In real API, we might use a specific batch endpoint
        return await apiRequest('/users/batch', 'POST', { ids });
    }
};

// ==========================================
// EXPORTS
// ==========================================

const ActiveBackend = USE_REAL_API ? RealBackend : MockBackend;

export const {
    registerUser,
    loginUser,
    logoutUser,
    createGuestUser,
    getUserTrees,
    getTreeByToken,
    createTree,
    saveTree,
    updateUserProfile,
    changePassword,
    shareTree,
    setPublicAccess,
    migrateGuestData,
    getUsersByIds
} = ActiveBackend;

// Special case: getSession in real API is async, in Mock it was sync.
// We wrap it to always be async for the app consistency or handle it in App.tsx
export const getSession = async () => {
    if (USE_REAL_API) return await RealBackend.getSession();
    return MockBackend.getSession();
};

export const getTreePermission = (tree: TreeData, userId?: string): AccessLevel => {
    if (userId && tree.meta.ownerId === userId) return 'OWNER';
    if (userId) {
        const collab = tree.collaborators.find(c => c.userId === userId);
        if (collab) return collab.role;
    }
    if (tree.meta.publicAccess) return tree.meta.publicAccess;
    if (userId === 'guest_user' && tree.meta.ownerId === 'guest_user') return 'OWNER';
    return 'VIEWER';
};

export const mergeTrees = (currentTree: TreeData, importedTree: Partial<TreeData>): TreeData => {
    const peopleMap = new Map<string, Person>();
    currentTree.people.forEach(p => peopleMap.set(p.id, p));
    const relMap = new Map<string, Relationship>();
    currentTree.relationships.forEach(r => relMap.set(r.id, r));

    if (importedTree.people) importedTree.people.forEach(p => peopleMap.set(p.id, p));
    if (importedTree.relationships) {
        importedTree.relationships.forEach(r => {
            if (peopleMap.has(r.source) && peopleMap.has(r.target)) relMap.set(r.id, r);
        });
    }

    return {
        ...currentTree,
        people: Array.from(peopleMap.values()),
        relationships: Array.from(relMap.values()),
        meta: { ...currentTree.meta, lastModified: Date.now() }
    };
};
