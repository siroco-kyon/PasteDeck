import { useState, useEffect, useCallback } from 'react';
import type { Category } from '@/shared/types';

// === カテゴリ管理フック ===
// 何をする部分か：カテゴリデータの取得・更新・エラー処理を統括管理
// なぜ必要か：複数のコンポーネントで共通するカテゴリ操作ロジックを再利用するため

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCategory: (name: string, icon?: string, color?: string) => Promise<Category | null>;
  updateCategory: (id: number, updates: Partial<Category>) => Promise<Category | null>;
  deleteCategory: (id: number) => Promise<boolean>;
}

/**
 * カテゴリ管理カスタムフック
 * @returns UseCategoriesReturn カテゴリ操作に必要な状態と関数群
 */
export function useCategories(): UseCategoriesReturn {
  // === 状態管理 ===
  // 何をする部分か：カテゴリ一覧、ローディング、エラー状態を管理
  // なぜ必要か：UIの状態表示とデータフロー制御のため
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // === カテゴリ一覧取得処理 ===
  // 何をする部分か：Electronから全カテゴリを取得してstateに設定
  // なぜ必要か：UI初期化とデータ変更後の最新化のため
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Electron APIの利用可能性をチェック
      if (!window.electronAPI || !window.electronAPI.category) {
        throw new Error('Electron APIが利用できません');
      }

      const response = await window.electronAPI.category.getAll();
      
      if (response.success) {
        setCategories(response.data);
      } else {
        throw new Error(response.message || 'カテゴリ取得に失敗しました');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カテゴリ取得で不明なエラーが発生しました';
      setError(errorMessage);
      console.error('カテゴリ取得エラー:', err);
      
      // === エラー時のフォールバック ===
      // 何をする部分か：エラー発生時に空の配列を設定
      // なぜ必要か：UIクラッシュを防ぎ、部分的な動作継続を可能にするため
      setCategories([]);
      
    } finally {
      setLoading(false);
    }
  }, []);

  // === カテゴリ作成処理 ===
  // 何をする部分か：新しいカテゴリを作成してstate更新
  // なぜ必要か：リアルタイムなUIの反映と楽観的更新のため
  const createCategory = useCallback(async (name: string, icon?: string, color?: string): Promise<Category | null> => {
    try {
      setError(null);

      // === 入力検証 ===
      // 何をする部分か：クライアント側での事前バリデーション
      // なぜ必要か：サーバー往復前に明らかな問題を検出するため
      if (!name.trim()) {
        throw new Error('カテゴリ名は必須です');
      }

      const response = await window.electronAPI.category.create({
        name: name.trim(),
        icon,
        color,
      });

      if (response.success) {
        // === 楽観的更新 ===
        // 何をする部分か：作成成功後に即座にローカル状態を更新
        // なぜ必要か：APIの再取得を待たずにUI反映するため
        setCategories(prev => [...prev, response.data]);
        return response.data;
      } else {
        throw new Error(response.message || 'カテゴリ作成に失敗しました');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カテゴリ作成で不明なエラーが発生しました';
      setError(errorMessage);
      console.error('カテゴリ作成エラー:', err);
      return null;
    }
  }, []);

  // === カテゴリ更新処理 ===
  const updateCategory = useCallback(async (id: number, updates: Partial<Category>): Promise<Category | null> => {
    try {
      setError(null);

      const response = await window.electronAPI.category.update(id, updates);

      if (response.success) {
        // === ローカル状態の即座更新 ===
        // 何をする部分か：更新されたカテゴリ情報で配列内の該当項目を置換
        // なぜ必要か：全データ再取得なしで変更を画面反映するため
        setCategories(prev => 
          prev.map(category => 
            category.id === id ? response.data : category
          )
        );
        return response.data;
      } else {
        throw new Error(response.message || 'カテゴリ更新に失敗しました');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カテゴリ更新で不明なエラーが発生しました';
      setError(errorMessage);
      console.error('カテゴリ更新エラー:', err);
      return null;
    }
  }, []);

  // === カテゴリ削除処理 ===
  const deleteCategory = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null);

      // === 削除前確認 ===
      // 何をする部分か：削除対象カテゴリに含まれるスニペット数を確認
      // なぜ必要か：ユーザーに影響範囲を提示し、誤削除を防ぐため
      const targetCategory = categories.find(cat => cat.id === id);
      if (!targetCategory) {
        throw new Error('削除対象のカテゴリが見つかりません');
      }

      const response = await window.electronAPI.category.delete(id);

      if (response.success) {
        // === ローカル状態から除去 ===
        // 何をする部分か：削除されたカテゴリを配列から取り除く
        // なぜ必要か：削除後の状態をUIに即座に反映するため
        setCategories(prev => prev.filter(category => category.id !== id));
        return true;
      } else {
        throw new Error(response.message || 'カテゴリ削除に失敗しました');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カテゴリ削除で不明なエラーが発生しました';
      setError(errorMessage);
      console.error('カテゴリ削除エラー:', err);
      return false;
    }
  }, [categories]);

  // === 初期データ読み込み ===
  // 何をする部分か：コンポーネントマウント時の自動データ取得
  // なぜ必要か：アプリ起動時に必要なデータを準備するため
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // === フック戻り値の提供 ===
  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}