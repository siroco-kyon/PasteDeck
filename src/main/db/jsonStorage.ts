import { join } from 'path';
import { promises as fs } from 'fs';
import { app } from 'electron';
import log from 'electron-log';
import type { Snippet, Category } from '../../shared/types';

// === JSON ファイルベースのデータストレージ ===
// 何をする部分か：better-sqlite3の代替として簡易的なデータ永続化を提供
// なぜ必要か：SQLiteの互換性問題が発生した場合の代替手段として

interface StorageData {
  categories: Category[];
  snippets: Snippet[];
  version: string;
}

let dataFilePath: string;
let storageData: StorageData | null = null;

/**
 * JSON ストレージの初期化
 */
export async function initializeJsonStorage(): Promise<void> {
  try {
    dataFilePath = join(app.getPath('userData'), 'clipboard-manager-data.json');
    log.info(`JSON ストレージを初期化: ${dataFilePath}`);

    try {
      const fileContent = await fs.readFile(dataFilePath, 'utf8');
      storageData = JSON.parse(fileContent);
      log.info('既存のデータファイルを読み込みました');
    } catch (error) {
      // ファイルが存在しない場合は初期データを作成
      storageData = {
        categories: [
          {
            id: 1,
            name: '一般',
            color: '#2196f3',
            icon: 'folder',
            sortOrder: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        snippets: [
          {
            id: 1,
            title: 'サンプルスニペット',
            content: 'これはサンプルのテキストスニペットです。',
            contentType: 'text',
            categoryId: 1,
            tags: ['サンプル', 'テスト'],
            isFavorite: false,
            useCount: 0,
            sortOrder: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        version: '1.0.0',
      };
      await saveData();
      log.info('初期データを作成しました');
    }
  } catch (error) {
    log.error('JSON ストレージ初期化でエラーが発生:', error);
    throw error;
  }
}

/**
 * データをファイルに保存
 */
async function saveData(): Promise<void> {
  if (!storageData) return;
  
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(storageData, null, 2), 'utf8');
  } catch (error) {
    log.error('データ保存でエラーが発生:', error);
    throw error;
  }
}

/**
 * カテゴリ操作（JSON版）
 */
export class JsonCategoryOperations {
  static async getAll(): Promise<Category[]> {
    if (!storageData) throw new Error('ストレージが初期化されていません');
    return [...storageData.categories];
  }

  static async getById(id: number): Promise<Category | null> {
    if (!storageData) throw new Error('ストレージが初期化されていません');
    return storageData.categories.find(c => c.id === id) || null;
  }
}

/**
 * スニペット操作（JSON版）
 */
export class JsonSnippetOperations {
  static async getAll(): Promise<Snippet[]> {
    if (!storageData) throw new Error('ストレージが初期化されていません');
    return [...storageData.snippets];
  }

  static async getById(id: number): Promise<Snippet | null> {
    if (!storageData) throw new Error('ストレージが初期化されていません');
    return storageData.snippets.find(s => s.id === id) || null;
  }

  static async search(filters: any): Promise<Snippet[]> {
    if (!storageData) throw new Error('ストレージが初期化されていません');
    
    let results = [...storageData.snippets];
    
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(s => 
        s.title.toLowerCase().includes(query) || 
        s.content.toLowerCase().includes(query)
      );
    }
    
    if (filters.categoryId) {
      results = results.filter(s => s.categoryId === filters.categoryId);
    }
    
    if (filters.isFavorite) {
      results = results.filter(s => s.isFavorite);
    }
    
    return results;
  }
}