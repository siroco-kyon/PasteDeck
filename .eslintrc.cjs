// === ESLint設定ファイル ===
// 何をする部分か：TypeScript・React・Electronプロジェクトの静的解析ルール定義
// なぜ必要か：コード品質の維持とチーム開発での一貫性確保のため

module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
    // === Electron環境の追加 ===
    // 何をする部分か：Electronのメインプロセスとレンダラープロセス両方に対応
    // なぜ必要か：contextIsolationやIPCなどElectron固有APIの使用を許可するため
    commonjs: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  
  // === TypeScript・React・Electron向けルール設定 ===
  rules: {
    // React Refresh関連
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    
    // === TypeScript関連の緩和 ===
    // 何をする部分か：開発効率とElectron環境での柔軟性を考慮
    // なぜ必要か：IPCやプリロードスクリプトで必要な柔軟性を確保するため
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    
    // === Console使用の許可 ===
    // 何をする部分か：開発・デバッグ時のconsole.log等を許可
    // なぜ必要か：Electronアプリでのログ出力とデバッグ支援のため
    'no-console': 'warn',
    
    // === 未使用変数の警告レベル調整 ===
    'no-unused-vars': 'off', // TypeScriptルールを優先
  },
  
  // === ファイル種別ごとの個別設定 ===
  overrides: [
    {
      // === メインプロセス用設定 ===
      // 何をする部分か：src/main/配下のNode.js環境用ルール
      // なぜ必要か：ブラウザAPIを使用せずNode.js APIを使用するため
      files: ['src/main/**/*.ts'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        // Node.js環境では require() を許可
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      // === プリロードスクリプト用設定 ===
      // 何をする部分か：src/preload/配下の特殊環境用ルール
      // なぜ必要か：Node.jsとブラウザ両方のAPIが混在するため
      files: ['src/preload/**/*.ts'],
      env: {
        node: true,
        browser: true,
      },
    },
    {
      // === レンダラープロセス用設定 ===
      // 何をする部分か：src/renderer/配下のブラウザ環境用ルール
      // なぜ必要か：React・ブラウザAPIの使用が中心となるため
      files: ['src/renderer/**/*.{ts,tsx}'],
      env: {
        browser: true,
        node: false,
      },
      rules: {
        // ブラウザ環境でのDOM操作許可
        'no-undef': 'off', // TypeScriptで型チェック済み
      },
    },
  ],
};