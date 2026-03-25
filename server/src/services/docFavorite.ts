/**
 * 文档收藏服务
 * 用户收藏文档、查看收藏列表、访问历史
 * 数据持久化到 JSON 文件
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DocFavorite {
  favoriteId: string;
  docId: string;
  userId: string;
  createdAt: string;
}

export interface DocAccessRecord {
  docId: string;
  userId: string;
  accessedAt: string;
}

export interface FavoriteWithDoc extends DocFavorite {
  docName: string;
  docType: string;
  docSize: number;
}

// ========== 持久化 ==========
const DATA_DIR = path.join(process.cwd(), 'data');
const PERSIST_FILE = path.join(DATA_DIR, 'doc_favorites.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface PersistData {
  favorites: [string, DocFavorite[]][]; // [userId, favorites[]]
  accessHistory: DocAccessRecord[];
}

function persistData() {
  try {
    ensureDataDir();
    const data: PersistData = {
      favorites: Array.from(favorites.entries()),
      accessHistory: accessHistory,
    };
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(data), 'utf-8');
  } catch {
    // Ignore
  }
}

function loadData(): PersistData | null {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      return JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf-8')) as PersistData;
    }
  } catch {
    // Ignore
  }
  return null;
}

// ========== 内存存储 ==========
const favorites = new Map<string, DocFavorite[]>(); // key: userId
let accessHistory: DocAccessRecord[] = [];
const MAX_ACCESS_HISTORY = 200;

// 加载持久化数据
const saved = loadData();
if (saved) {
  for (const [userId, favs] of saved.favorites) {
    favorites.set(userId, favs);
  }
  accessHistory = saved.accessHistory;
}

class DocFavoriteService {
  /**
   * 添加收藏
   */
  addFavorite(docId: string, userId: string = 'default'): DocFavorite | null {
    const userFavorites = favorites.get(userId) || [];

    // 已收藏则跳过
    if (userFavorites.some(f => f.docId === docId)) {
      return null;
    }

    const favorite: DocFavorite = {
      favoriteId: generateId('fav'),
      docId,
      userId,
      createdAt: new Date().toISOString(),
    };
    userFavorites.push(favorite);
    favorites.set(userId, userFavorites);
    persistData();
    return favorite;
  }

  /**
   * 取消收藏
   */
  removeFavorite(docId: string, userId: string = 'default'): boolean {
    const userFavorites = favorites.get(userId) || [];
    const idx = userFavorites.findIndex(f => f.docId === docId);
    if (idx === -1) return false;
    userFavorites.splice(idx, 1);
    favorites.set(userId, userFavorites);
    persistData();
    return true;
  }

  /**
   * 获取用户收藏列表
   */
  getFavorites(
    userId: string = 'default',
    docNameMap?: Map<string, { name: string; type: string; size: number }>
  ): FavoriteWithDoc[] {
    const userFavorites = favorites.get(userId) || [];
    return userFavorites.map(f => {
      const docInfo = docNameMap?.get(f.docId) || { name: '未知文档', type: '', size: 0 };
      return { ...f, docName: docInfo.name, docType: docInfo.type, docSize: docInfo.size };
    });
  }

  /**
   * 检查是否已收藏
   */
  isFavorite(docId: string, userId: string = 'default'): boolean {
    const userFavorites = favorites.get(userId) || [];
    return userFavorites.some(f => f.docId === docId);
  }

  /**
   * 记录文档访问
   */
  recordAccess(docId: string, userId: string = 'default'): void {
    // 移除同一用户的同文档旧记录
    accessHistory = accessHistory.filter(r => !(r.docId === docId && r.userId === userId));
    // 添加新记录
    accessHistory.unshift({
      docId,
      userId,
      accessedAt: new Date().toISOString(),
    });
    // 限制历史长度
    if (accessHistory.length > MAX_ACCESS_HISTORY) {
      accessHistory = accessHistory.slice(0, MAX_ACCESS_HISTORY);
    }
    persistData();
  }

  /**
   * 获取最近访问的文档
   */
  getRecentAccess(
    userId: string = 'default',
    limit: number = 10,
    docNameMap?: Map<string, { name: string; type: string; size: number }>
  ): Array<{ docId: string; docName: string; docType: string; accessedAt: string }> {
    const records = accessHistory.filter(r => r.userId === userId).slice(0, limit);

    return records.map(r => {
      const docInfo = docNameMap?.get(r.docId) || { name: '未知文档', type: '' };
      return {
        docId: r.docId,
        docName: docInfo.name,
        docType: docInfo.type,
        accessedAt: r.accessedAt,
      };
    });
  }
}

export const docFavoriteService = new DocFavoriteService();
