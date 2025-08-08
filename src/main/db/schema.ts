import Database from 'better-sqlite3';
import { join } from 'path';
import { app } from 'electron';
import log from 'electron-log';
import type { SampleData } from '@/shared/types';

// === データベーススキーマ管理 ===
// 何をする部分か：SQLiteデータベースの初期化とテーブル作成を管理
// なぜ必要か：アプリのデータ永続化とスキーマバージョン管理のため

/**
 * データベース接続インスタンス
 * アプリケーション全体で共有される単一のDB接続
 */
let db: Database.Database | null = null;

/**
 * データベース初期化
 * アプリ起動時に一度だけ実行される初期化処理
 * @returns Promise<Database.Database> 初期化されたデータベースインスタンス
 */
export async function initializeDatabase(): Promise<Database.Database> {
  try {
    // === データベースファイルパスの決定 ===
    // 何をする部分か：OSの適切なデータディレクトリにDB配置
    // なぜ必要か：ユーザーデータを適切な場所に永続化するため
    const dbPath = join(app.getPath('userData'), 'clipboard-manager.db');
    log.info(`データベースを初期化: ${dbPath}`);

    // === データベース接続の確立 ===
    // 何をする部分か：SQLiteデータベースへの接続を開く
    // なぜ必要か：データの読み書きを可能にするため
    db = new Database(dbPath);
    
    // === WAL モードの有効化 ===
    // 何をする部分か：Write-Ahead Loggingによる並行性を向上
    // なぜ必要か：読み書きパフォーマンスを向上させるため
    db.pragma('journal_mode = WAL');
    
    // === 外部キー制約の有効化 ===
    // 何をする部分か：テーブル間の参照整合性を保証
    // なぜ必要か：データの一貫性を維持するため
    db.pragma('foreign_keys = ON');

    // === テーブルスキーマの作成 ===
    // 何をする部分か：アプリに必要なテーブル構造を定義
    // なぜ必要か：データを適切に格納するための器を用意するため
    await createTables(db);
    
    // === 初期データの挿入 ===
    // 何をする部分か：初回起動時にサンプルデータを挿入
    // なぜ必要か：ユーザーにアプリの使い方を示すため
    await insertSampleData(db);

    log.info('データベース初期化が完了しました');
    return db;

  } catch (error) {
    log.error('データベース初期化でエラーが発生:', error);
    throw error;
  }
}

/**
 * テーブル作成処理
 * 全ての必要なテーブルを作成する
 * @param database データベースインスタンス
 */
async function createTables(database: Database.Database): Promise<void> {
  try {
    // === カテゴリテーブル作成 ===
    // 何をする部分か：スニペットのグループ分け用テーブル定義
    // なぜ必要か：スニペットを整理・分類するため
    database.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // === スニペットテーブル作成 ===
    // 何をする部分か：コピペ用テキスト・画像の保存テーブル定義
    // なぜ必要か：ユーザーのスニペットデータを永続化するため
    database.exec(`
      CREATE TABLE IF NOT EXISTS snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT CHECK(content_type IN ('text', 'html', 'image')) DEFAULT 'text',
        thumbnail TEXT,
        tags TEXT,
        use_count INTEGER DEFAULT 0,
        is_favorite BOOLEAN DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    // === 設定テーブル作成 ===
    // 何をする部分か：アプリの設定情報を保存するテーブル定義
    // なぜ必要か：ユーザーの環境設定を永続化するため
    database.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // === インデックス作成 ===
    // 何をする部分か：検索性能向上のためのインデックス設定
    // なぜ必要か：大量のスニペットでも高速検索を実現するため
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_snippets_category ON snippets(category_id);
      CREATE INDEX IF NOT EXISTS idx_snippets_favorite ON snippets(is_favorite);
      CREATE INDEX IF NOT EXISTS idx_snippets_use_count ON snippets(use_count DESC);
      CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
      CREATE INDEX IF NOT EXISTS idx_snippets_sort_order ON snippets(sort_order);
    `);

    // === トリガー作成（updated_atの自動更新） ===
    // 何をする部分か：レコード更新時の日時自動更新処理
    // なぜ必要か：最終更新日時を正確に記録するため
    database.exec(`
      CREATE TRIGGER IF NOT EXISTS update_categories_timestamp 
      AFTER UPDATE ON categories
      BEGIN
        UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
      
      CREATE TRIGGER IF NOT EXISTS update_snippets_timestamp 
      AFTER UPDATE ON snippets
      BEGIN
        UPDATE snippets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
      
      CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
      AFTER UPDATE ON settings
      BEGIN
        UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
      END;
    `);

    log.info('データベーステーブルの作成が完了しました');

  } catch (error) {
    log.error('テーブル作成でエラーが発生:', error);
    throw error;
  }
}

/**
 * サンプルデータ挿入処理
 * 初回起動時のみ、使い方を示すサンプルを挿入
 * @param database データベースインスタンス
 */
async function insertSampleData(database: Database.Database): Promise<void> {
  try {
    // === 既存データの確認 ===
    // 何をする部分か：既にデータが存在するかチェック
    // なぜ必要か：重複挿入を防ぎ、初回起動のみサンプルを提供するため
    const existingCategories = database.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    
    if (existingCategories.count > 0) {
      log.info('既存データが見つかりました。サンプルデータの挿入をスキップします。');
      return;
    }

    // === サンプルデータの定義 ===
    // 何をする部分か：初期カテゴリとスニペットの内容を定義
    // なぜ必要か：ユーザーにアプリの機能を理解してもらうため
    const sampleData: SampleData = {
      categories: [
        {
          name: '開発用',
          icon: 'Code',
          color: '#2196f3',
          sortOrder: 0,
        },
        {
          name: 'メール定型文',
          icon: 'Email',
          color: '#4caf50',
          sortOrder: 1,
        },
        {
          name: 'その他',
          icon: 'Folder',
          color: '#ff9800',
          sortOrder: 2,
        },
      ],
      snippets: [],
    };

    // === トランザクション実行 ===
    // 何をする部分か：データ挿入をトランザクションで実行
    // なぜ必要か：途中でエラーが発生した場合の整合性を保つため
    const insertTransaction = database.transaction(() => {
      // カテゴリの挿入
      const insertCategory = database.prepare(`
        INSERT INTO categories (name, icon, color, sort_order)
        VALUES (?, ?, ?, ?)
      `);

      const categoryIds: number[] = [];
      sampleData.categories.forEach(category => {
        const result = insertCategory.run(
          category.name,
          category.icon,
          category.color,
          category.sortOrder
        );
        categoryIds.push(result.lastInsertRowid as number);
      });

      // サンプルスニペットの定義と挿入
      const sampleSnippets = [
        {
          categoryId: categoryIds[0], // 開発用
          title: 'console.log デバッグ',
          content: 'console.log("{cursor}:", {cursor});',
          contentType: 'text' as const,
          tags: ['javascript', 'debug'],
          isFavorite: true,
          sortOrder: 0,
        },
        {
          categoryId: categoryIds[0], // 開発用
          title: 'React useState',
          content: 'const [{cursor}, set{cursor}] = useState();',
          contentType: 'text' as const,
          tags: ['react', 'hook'],
          isFavorite: false,
          sortOrder: 1,
        },
        {
          categoryId: categoryIds[1], // メール定型文
          title: '会議お疲れ様メール',
          content: 'お疲れ様です。\n\n本日の会議ありがとうございました。\n議事録を共有いたします。\n\n{date}\n{username}',
          contentType: 'text' as const,
          tags: ['メール', 'ビジネス'],
          isFavorite: false,
          sortOrder: 0,
        },
      ];

      const insertSnippet = database.prepare(`
        INSERT INTO snippets (category_id, title, content, content_type, tags, is_favorite, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      sampleSnippets.forEach(snippet => {
        insertSnippet.run(
          snippet.categoryId,
          snippet.title,
          snippet.content,
          snippet.contentType,
          JSON.stringify(snippet.tags),
          snippet.isFavorite ? 1 : 0,
          snippet.sortOrder
        );
      });
    });

    insertTransaction();
    log.info('サンプルデータの挿入が完了しました');

  } catch (error) {
    log.error('サンプルデータ挿入でエラーが発生:', error);
    throw error;
  }
}

/**
 * データベースインスタンス取得
 * 既に初期化されたデータベース接続を取得
 * @returns Database.Database データベースインスタンス
 * @throws Error 未初期化の場合にエラー
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('データベースが初期化されていません。initializeDatabase()を先に実行してください。');
  }
  return db;
}

/**
 * データベース接続クローズ
 * アプリ終了時に呼び出してリソースを解放
 */
export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
      log.info('データベース接続を終了しました');
    } catch (error) {
      log.error('データベース終了でエラーが発生:', error);
    }
    db = null;
  }
}