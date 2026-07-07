// === ウィンドウサイズ定数 ===
// 何をする部分か：通常モード・コンパクトモードのウィンドウサイズを一元管理
// なぜ必要か：main.ts（起動時の復元）とipc/handlers.ts（モード切替時）が
//           同じ値を参照する必要があり、値の重複によるズレを防ぐため

export const NORMAL_WINDOW_SIZE = { width: 1000, height: 700 };
export const NORMAL_WINDOW_MIN_SIZE = { minWidth: 800, minHeight: 600 };
export const COMPACT_WINDOW_SIZE = { width: 360, height: 520, minWidth: 320, minHeight: 420 };
