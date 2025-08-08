import { getDatabase } from './schema';
import log from 'electron-log';
import type {
  Snippet,
  Category,
  CreateSnippetInput,
  UpdateSnippetInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  SearchFilters,
} from '@/shared/types';

// === データベース操作関数群 ===
// 何をする部分か：スニペット・カテゴリのCRUD操作を提供
// なぜ必要か：UI層から呼び出されるデータアクセス機能を統一管理するため

/**
 * カテゴリ操作クラス
 * カテゴリの作成・読み取り・更新・削除を管理
 */
export class CategoryOperations {
  /**
   * 全カテゴリ取得
   * ソート順で並び替えて返す
   * @returns Promise<Category[]> カテゴリ一覧
   */
  static async getAll(): Promise<Category[]> {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM categories 
        ORDER BY sort_order ASC, created_at ASC
      `);
      
      const rows = stmt.all() as any[];
      return rows.map(this.mapRowToCategory);
      
    } catch (error) {
      log.error('カテゴリ一覧取得でエラーが発生:', error);
      throw error;
    }
  }

  /**
   * ID指定カテゴリ取得
   * @param id カテゴリID
   * @returns Promise<Category | null> カテゴリ情報
   */
  static async getById(id: number): Promise<Category | null> {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
      const row = stmt.get(id) as any;
      
      return row ? this.mapRowToCategory(row) : null;
      
    } catch (error) {
      log.error(`カテゴリ取得でエラーが発生 (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * カテゴリ新規作成
   * @param input 新規カテゴリの入力データ
   * @returns Promise<Category> 作成されたカテゴリ
   */
  static async create(input: CreateCategoryInput): Promise<Category> {
    try {
      const db = getDatabase();
      
      // === 次のソート順を計算 ===
      // 何をする部分か：新しいカテゴリを最後に配置するための順序を決定
      // なぜ必要か：ユーザーが予想する位置に新カテゴリを配置するため
      const maxOrderStmt = db.prepare('SELECT MAX(sort_order) as maxOrder FROM categories');
      const maxOrderResult = maxOrderStmt.get() as { maxOrder: number | null };
      const nextOrder = (maxOrderResult.maxOrder || -1) + 1;

      const stmt = db.prepare(`
        INSERT INTO categories (name, icon, color, sort_order)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(input.name, input.icon || null, input.color || null, nextOrder);
      
      // === 作成されたカテゴリを取得して返す ===
      // 何をする部分か：INSERT後に生成されたIDで完全なデータを取得
      // なぜ必要か：自動生成される項目を含む完全なオブジェクトを返すため
      const created = await this.getById(result.lastInsertRowid as number);
      if (!created) {
        throw new Error('カテゴリ作成後の取得に失敗しました');
      }
      
      log.info(`カテゴリを作成しました: ${created.name} (ID: ${created.id})`);
      return created;
      
    } catch (error) {
      log.error('カテゴリ作成でエラーが発生:', error);
      throw error;
    }
  }

  /**
   * カテゴリ更新
   * @param id 更新対象のカテゴリID
   * @param input 更新データ
   * @returns Promise<Category> 更新後のカテゴリ
   */
  static async update(id: number, input: UpdateCategoryInput): Promise<Category> {
    try {
      const db = getDatabase();
      
      // === 更新対象の存在確認 ===
      // 何をする部分か：更新前にカテゴリの存在をチェック
      // なぜ必要か：存在しないIDへの更新を防ぐため
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`カテゴリが見つかりません (ID: ${id})`);
      }

      // === 動的クエリ生成 ===
      // 何をする部分か：更新する項目のみを含むSQLを動的生成
      // なぜ必要か：部分更新を効率的に実行するため
      const updateFields: string[] = [];
      const values: any[] = [];

      if (input.name !== undefined) {
        updateFields.push('name = ?');
        values.push(input.name);
      }
      if (input.icon !== undefined) {
        updateFields.push('icon = ?');
        values.push(input.icon);
      }
      if (input.color !== undefined) {
        updateFields.push('color = ?');
        values.push(input.color);
      }
      if (input.sortOrder !== undefined) {
        updateFields.push('sort_order = ?');
        values.push(input.sortOrder);
      }

      if (updateFields.length === 0) {
        // 更新項目がない場合は既存データを返す
        return existing;
      }

      values.push(id); // WHERE句用のIDを追加

      const stmt = db.prepare(`
        UPDATE categories SET ${updateFields.join(', ')}
        WHERE id = ?
      `);
      
      stmt.run(...values);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('カテゴリ更新後の取得に失敗しました');
      }

      log.info(`カテゴリを更新しました: ${updated.name} (ID: ${updated.id})`);
      return updated;
      
    } catch (error) {
      log.error(`カテゴリ更新でエラーが発生 (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * カテゴリ削除
   * @param id 削除対象のカテゴリID
   * @returns Promise<boolean> 削除成功の可否
   */
  static async delete(id: number): Promise<boolean> {
    try {
      const db = getDatabase();
      
      // === CASCADE削除の確認 ===
      // 何をする部分か：削除対象カテゴリに含まれるスニペット数をチェック
      // なぜ必要か：ユーザーに削除対象の規模を伝えるため
      const snippetCountStmt = db.prepare('SELECT COUNT(*) as count FROM snippets WHERE category_id = ?');
      const snippetCount = snippetCountStmt.get(id) as { count: number };
      
      if (snippetCount.count > 0) {
        log.info(`カテゴリ削除により${snippetCount.count}個のスニペットも削除されます (カテゴリID: ${id})`);
      }

      const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
      const result = stmt.run(id);
      
      const success = result.changes > 0;
      if (success) {
        log.info(`カテゴリを削除しました (ID: ${id}, 関連スニペット: ${snippetCount.count}個)`);
      }
      
      return success;
      
    } catch (error) {
      log.error(`カテゴリ削除でエラーが発生 (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * データベース行からCategoryオブジェクトへの変換
   * @param row データベースの生の行データ
   * @returns Category 型安全なCategoryオブジェクト
   */
  private static mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      icon: row.icon || undefined,
      color: row.color || undefined,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

/**
 * スニペット操作クラス
 * スニペットの作成・読み取り・更新・削除・検索を管理
 */
export class SnippetOperations {
  /**
   * 全スニペット取得
   * @returns Promise<Snippet[]> スニペット一覧
   */
  static async getAll(): Promise<Snippet[]> {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM snippets 
        ORDER BY sort_order ASC, created_at DESC
      `);
      
      const rows = stmt.all() as any[];
      return rows.map(this.mapRowToSnippet);
      
    } catch (error) {
      log.error('スニペット一覧取得でエラーが発生:', error);
      throw error;
    }
  }

  /**
   * カテゴリ別スニペット取得
   * @param categoryId カテゴリID
   * @returns Promise<Snippet[]> 指定カテゴリのスニペット一覧
   */
  static async getByCategoryId(categoryId: number): Promise<Snippet[]> {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM snippets 
        WHERE category_id = ?
        ORDER BY sort_order ASC, created_at DESC
      `);
      
      const rows = stmt.all(categoryId) as any[];
      return rows.map(this.mapRowToSnippet);
      
    } catch (error) {
      log.error(`カテゴリ別スニペット取得でエラーが発生 (カテゴリID: ${categoryId}):`, error);
      throw error;
    }
  }

  /**
   * ID指定スニペット取得
   * @param id スニペットID
   * @returns Promise<Snippet | null> スニペット情報
   */
  static async getById(id: number): Promise<Snippet | null> {
    try {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM snippets WHERE id = ?');
      const row = stmt.get(id) as any;
      
      return row ? this.mapRowToSnippet(row) : null;
      
    } catch (error) {
      log.error(`スニペット取得でエラーが発生 (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * スニペット検索
   * @param filters 検索条件
   * @returns Promise<Snippet[]> 検索結果のスニペット一覧
   */
  static async search(filters: SearchFilters): Promise<Snippet[]> {
    try {
      const db = getDatabase();
      
      // === 動的検索クエリ生成 ===
      // 何をする部分か：検索条件に応じてWHERE句を動的生成
      // なぜ必要か：複数の検索条件を効率的に組み合わせるため
      const whereClauses: string[] = [];
      const values: any[] = [];

      if (filters.query) {
        whereClauses.push('(title LIKE ? OR content LIKE ? OR tags LIKE ?)');
        const searchPattern = `%${filters.query}%`;
        values.push(searchPattern, searchPattern, searchPattern);
      }

      if (filters.categoryId !== undefined) {
        whereClauses.push('category_id = ?');
        values.push(filters.categoryId);
      }

      if (filters.contentType) {
        whereClauses.push('content_type = ?');
        values.push(filters.contentType);
      }

      if (filters.isFavorite !== undefined) {
        whereClauses.push('is_favorite = ?');
        values.push(filters.isFavorite ? 1 : 0);
      }

      if (filters.tags && filters.tags.length > 0) {
        // タグ検索：指定されたタグのいずれかを含む
        const tagClauses = filters.tags.map(() => 'tags LIKE ?');
        whereClauses.push(`(${tagClauses.join(' OR ')})`);
        filters.tags.forEach(tag => values.push(`%"${tag}"%`));
      }

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      
      const stmt = db.prepare(`
        SELECT * FROM snippets 
        ${whereSQL}
        ORDER BY 
          CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
          use_count DESC,
          sort_order ASC,
          created_at DESC
      `);
      
      const rows = stmt.all(...values) as any[];
      return rows.map(this.mapRowToSnippet);
      
    } catch (error) {
      log.error('スニペット検索でエラーが発生:', error);
      throw error;
    }
  }

  /**
   * スニペット新規作成
   * @param input 新規スニペットの入力データ
   * @returns Promise<Snippet> 作成されたスニペット
   */
  static async create(input: CreateSnippetInput): Promise<Snippet> {
    try {
      const db = getDatabase();
      
      // === カテゴリ存在確認 ===
      // 何をする部分か：指定されたカテゴリIDが存在するかチェック
      // なぜ必要か：外部キー制約違反を事前に防ぐため
      const categoryExists = await CategoryOperations.getById(input.categoryId);
      if (!categoryExists) {
        throw new Error(`指定されたカテゴリが存在しません (ID: ${input.categoryId})`);
      }

      // === 次のソート順を計算 ===
      const maxOrderStmt = db.prepare('SELECT MAX(sort_order) as maxOrder FROM snippets WHERE category_id = ?');
      const maxOrderResult = maxOrderStmt.get(input.categoryId) as { maxOrder: number | null };
      const nextOrder = (maxOrderResult.maxOrder || -1) + 1;

      const stmt = db.prepare(`
        INSERT INTO snippets (
          category_id, title, content, content_type, 
          thumbnail, tags, is_favorite, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        input.categoryId,
        input.title,
        input.content,
        input.contentType,
        input.thumbnail || null,
        JSON.stringify(input.tags || []),
        input.isFavorite ? 1 : 0,
        nextOrder
      );
      
      const created = await this.getById(result.lastInsertRowid as number);
      if (!created) {
        throw new Error('スニペット作成後の取得に失敗しました');
      }
      
      log.info(`スニペットを作成しました: ${created.title} (ID: ${created.id})`);
      return created;
      
    } catch (error) {
      log.error('スニペット作成でエラーが発生:', error);
      throw error;
    }
  }

  /**
   * スニペット更新
   * @param id 更新対象のスニペットID
   * @param input 更新データ
   * @returns Promise<Snippet> 更新後のスニペット
   */
  static async update(id: number, input: UpdateSnippetInput): Promise<Snippet> {
    try {
      const db = getDatabase();
      
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`スニペットが見つかりません (ID: ${id})`);
      }

      // カテゴリID変更時の存在確認
      if (input.categoryId && input.categoryId !== existing.categoryId) {
        const categoryExists = await CategoryOperations.getById(input.categoryId);
        if (!categoryExists) {
          throw new Error(`指定されたカテゴリが存在しません (ID: ${input.categoryId})`);
        }
      }

      const updateFields: string[] = [];
      const values: any[] = [];

      if (input.categoryId !== undefined) {
        updateFields.push('category_id = ?');
        values.push(input.categoryId);
      }
      if (input.title !== undefined) {
        updateFields.push('title = ?');
        values.push(input.title);
      }
      if (input.content !== undefined) {
        updateFields.push('content = ?');
        values.push(input.content);
      }
      if (input.contentType !== undefined) {
        updateFields.push('content_type = ?');
        values.push(input.contentType);
      }
      if (input.thumbnail !== undefined) {
        updateFields.push('thumbnail = ?');
        values.push(input.thumbnail);
      }
      if (input.tags !== undefined) {
        updateFields.push('tags = ?');
        values.push(JSON.stringify(input.tags));
      }
      if (input.isFavorite !== undefined) {
        updateFields.push('is_favorite = ?');
        values.push(input.isFavorite ? 1 : 0);
      }
      if (input.sortOrder !== undefined) {
        updateFields.push('sort_order = ?');
        values.push(input.sortOrder);
      }

      if (updateFields.length === 0) {
        return existing;
      }

      values.push(id);

      const stmt = db.prepare(`
        UPDATE snippets SET ${updateFields.join(', ')}
        WHERE id = ?
      `);
      
      stmt.run(...values);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('スニペット更新後の取得に失敗しました');
      }

      log.info(`スニペットを更新しました: ${updated.title} (ID: ${updated.id})`);
      return updated;
      
    } catch (error) {
      log.error(`スニペット更新でエラーが発生 (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * スニペット削除
   * @param id 削除対象のスニペットID
   * @returns Promise<boolean> 削除成功の可否
   */
  static async delete(id: number): Promise<boolean> {
    try {
      const db = getDatabase();
      
      const stmt = db.prepare('DELETE FROM snippets WHERE id = ?');
      const result = stmt.run(id);
      
      const success = result.changes > 0;
      if (success) {
        log.info(`スニペットを削除しました (ID: ${id})`);
      }
      
      return success;
      
    } catch (error) {
      log.error(`スニペット削除でエラーが発生 (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * 使用回数インクリメント
   * スニペットのコピー時に呼び出される統計更新
   * @param id 対象スニペットID
   * @returns Promise<void>
   */
  static async incrementUseCount(id: number): Promise<void> {
    try {
      const db = getDatabase();
      
      const stmt = db.prepare('UPDATE snippets SET use_count = use_count + 1 WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes > 0) {
        log.info(`スニペットの使用回数を更新しました (ID: ${id})`);
      }
      
    } catch (error) {
      log.error(`使用回数更新でエラーが発生 (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * データベース行からSnippetオブジェクトへの変換
   * @param row データベースの生の行データ
   * @returns Snippet 型安全なSnippetオブジェクト
   */
  private static mapRowToSnippet(row: any): Snippet {
    return {
      id: row.id,
      categoryId: row.category_id,
      title: row.title,
      content: row.content,
      contentType: row.content_type,
      thumbnail: row.thumbnail || undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      useCount: row.use_count,
      isFavorite: Boolean(row.is_favorite),
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}