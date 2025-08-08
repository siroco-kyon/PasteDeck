import { useState, useEffect, useCallback } from 'react';
import type { Snippet, SearchFilters, CreateSnippetInput, UpdateSnippetInput } from '@/shared/types';

// === スニペット管理フック ===
// 何をする部分か：スニペットデータのCRUD操作と検索機能を統括管理
// なぜ必要か：複数のコンポーネントで共通するスニペット操作ロジックを再利用するため

interface UseSnippetsReturn {
  snippets: Snippet[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSnippet: (input: CreateSnippetInput) => Promise<Snippet | null>;
  updateSnippet: (id: number, input: UpdateSnippetInput) => Promise<Snippet | null>;
  deleteSnippet: (id: number) => Promise<boolean>;
  copyToClipboard: (id: number) => Promise<boolean>;
}

/**
 * スニペット管理カスタムフック
 * @param filters 検索・絞り込み条件
 * @returns UseSnippetsReturn スニペット操作に必要な状態と関数群
 */
export function useSnippets(filters: SearchFilters = {}): UseSnippetsReturn {
  // === 状態管理 ===
  // 何をする部分か：スニペット一覧、ローディング、エラー状態を管理
  // なぜ必要か：UIの状態表示とデータフロー制御のため
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // === スニペット検索・取得処理 ===
  // 何をする部分か：検索条件に基づいてスニペットを取得
  // なぜ必要か：カテゴリ切り替えや検索に応じたデータ表示のため
  const fetchSnippets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      
      // === 検索条件の有無による分岐 ===
      // 何をする部分か：フィルター有無で適切なAPIエンドポイントを選択
      // なぜ必要か：パフォーマンス最適化と機能分離のため
      if (Object.keys(filters).some(key => filters[key as keyof SearchFilters] !== undefined)) {
        // 検索条件あり：検索APIを使用
        response = await window.electronAPI.snippet.search(filters);
      } else {
        // 検索条件なし：全件取得APIを使用
        response = await window.electronAPI.snippet.getAll();
      }
      
      if (response.success) {
        setSnippets(response.data);
      } else {
        throw new Error(response.message || 'スニペット取得に失敗しました');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'スニペット取得で不明なエラーが発生しました';
      setError(errorMessage);
      console.error('スニペット取得エラー:', err);
      
      // === エラー時のフォールバック ===
      setSnippets([]);
      
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // === スニペット作成処理 ===
  // 何をする部分か：新しいスニペットを作成してstate更新
  // なぜ必要か：リアルタイムなUIの反映と楽観的更新のため
  const createSnippet = useCallback(async (input: CreateSnippetInput): Promise<Snippet | null> => {
    try {
      setError(null);

      // === 入力検証 ===
      // 何をする部分か：クライアント側での事前バリデーション
      // なぜ必要か：明らかな入力ミスを早期発見するため
      if (!input.title?.trim()) {
        throw new Error('タイトルは必須です');
      }

      if (!input.content?.trim()) {
        throw new Error('内容は必須です');
      }

      const response = await window.electronAPI.snippet.create(input);

      if (response.success) {
        // === 楽観的更新 ===
        // 何をする部分か：作成成功後に即座にローカル状態を更新
        // なぜ必要か：API再取得を待たずにUIに反映するため
        const newSnippet = response.data;
        
        // 現在の検索条件にマッチする場合のみローカルに追加
        if (shouldIncludeSnippet(newSnippet, filters)) {
          setSnippets(prev => [newSnippet, ...prev]);
        }
        
        return newSnippet;
      } else {
        throw new Error(response.message || 'スニペット作成に失敗しました');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'スニペット作成で不明なエラーが発生しました';
      setError(errorMessage);
      console.error('スニペット作成エラー:', err);
      return null;
    }
  }, [filters]);

  // === スニペット更新処理 ===
  const updateSnippet = useCallback(async (id: number, input: UpdateSnippetInput): Promise<Snippet | null> => {
    try {
      setError(null);

      const response = await window.electronAPI.snippet.update(id, input);

      if (response.success) {
        const updatedSnippet = response.data;
        
        // === ローカル状態の更新戦略 ===
        // 何をする部分か：更新されたスニペットがフィルター条件にマッチするかチェック
        // なぜ必要か：カテゴリ変更等で表示対象外になった場合の適切な処理のため
        setSnippets(prev => {
          const filteredPrev = prev.filter(s => s.id !== id);
          
          if (shouldIncludeSnippet(updatedSnippet, filters)) {
            // 更新後もフィルター条件にマッチする場合は配列内で更新
            return prev.map(s => s.id === id ? updatedSnippet : s);
          } else {
            // フィルター条件から外れた場合は配列から除去
            return filteredPrev;
          }
        });
        
        return updatedSnippet;
      } else {
        throw new Error(response.message || 'スニペット更新に失敗しました');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'スニペット更新で不明なエラーが発生しました';
      setError(errorMessage);
      console.error('スニペット更新エラー:', err);
      return null;
    }
  }, [filters]);

  // === スニペット削除処理 ===
  const deleteSnippet = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null);

      const response = await window.electronAPI.snippet.delete(id);

      if (response.success) {
        // === ローカル状態から除去 ===
        // 何をする部分か：削除されたスニペットを配列から取り除く
        // なぜ必要か：削除後の状態をUIに即座に反映するため
        setSnippets(prev => prev.filter(snippet => snippet.id !== id));
        return true;
      } else {
        throw new Error(response.message || 'スニペット削除に失敗しました');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'スニペット削除で不明なエラーが発生しました';
      setError(errorMessage);
      console.error('スニペット削除エラー:', err);
      return false;
    }
  }, []);

  // === クリップボードコピー処理 ===
  // 何をする部分か：スニペット内容をクリップボードにコピーし使用統計を更新
  // なぜ必要か：スニペットの主要機能であるコピー操作の実行と統計管理のため
  const copyToClipboard = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null);

      const response = await window.electronAPI.snippet.copyToClipboard(id);

      if (response.success) {
        // === 使用統計の楽観的更新 ===
        // 何をする部分か：コピー成功後にローカルの使用回数を即座に増加
        // なぜ必要か：統計情報の即座反映とユーザビリティ向上のため
        setSnippets(prev =>
          prev.map(snippet =>
            snippet.id === id
              ? { ...snippet, useCount: snippet.useCount + 1 }
              : snippet
          )
        );
        
        return true;
      } else {
        throw new Error(response.message || 'クリップボードコピーに失敗しました');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'クリップボードコピーで不明なエラーが発生しました';
      setError(errorMessage);
      console.error('クリップボードコピーエラー:', err);
      return false;
    }
  }, []);

  // === フィルター条件変更時のデータ再取得 ===
  // 何をする部分か：検索条件が変更された際の自動再取得
  // なぜ必要か：フィルター変更に応じた表示内容の更新のため
  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  return {
    snippets,
    loading,
    error,
    refetch: fetchSnippets,
    createSnippet,
    updateSnippet,
    deleteSnippet,
    copyToClipboard,
  };
}

/**
 * スニペットがフィルター条件にマッチするかの判定
 * @param snippet 判定対象のスニペット
 * @param filters フィルター条件
 * @returns boolean マッチするかどうか
 */
function shouldIncludeSnippet(snippet: Snippet, filters: SearchFilters): boolean {
  // === カテゴリフィルターの判定 ===
  // 何をする部分か：指定されたカテゴリIDと一致するかチェック
  // なぜ必要か：カテゴリ切り替え時の表示制御のため
  if (filters.categoryId !== undefined && snippet.categoryId !== filters.categoryId) {
    return false;
  }

  // === コンテンツタイプフィルターの判定 ===
  if (filters.contentType && snippet.contentType !== filters.contentType) {
    return false;
  }

  // === お気に入りフィルターの判定 ===
  if (filters.isFavorite !== undefined && snippet.isFavorite !== filters.isFavorite) {
    return false;
  }

  // === テキスト検索の判定 ===
  // 何をする部分か：タイトル・内容・タグに検索キーワードが含まれるかチェック
  // なぜ必要か：文字列検索機能の実現のため
  if (filters.query) {
    const query = filters.query.toLowerCase();
    const searchTargets = [
      snippet.title.toLowerCase(),
      snippet.content.toLowerCase(),
      ...snippet.tags.map(tag => tag.toLowerCase()),
    ];
    
    const matchesQuery = searchTargets.some(target => target.includes(query));
    if (!matchesQuery) {
      return false;
    }
  }

  // === タグフィルターの判定 ===
  if (filters.tags && filters.tags.length > 0) {
    const hasMatchingTag = filters.tags.some(filterTag =>
      snippet.tags.some(snippetTag =>
        snippetTag.toLowerCase().includes(filterTag.toLowerCase())
      )
    );
    if (!hasMatchingTag) {
      return false;
    }
  }

  return true;
}