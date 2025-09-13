// esbuildビルドスクリプト
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// distディレクトリをクリーンアップ
if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist');

// 共通のビルド設定
const commonConfig = {
    entryPoints: ['src/index.js'],
    // bundle: trueでソース全体を1ファイルにバンドル
    // 現在このライブラリにはランタイム依存がないため、external: []で問題なし
    // 将来的に外部依存を追加する場合は、externalリストに追加すること
    bundle: true,
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    external: [], // すべての依存関係をバンドル
};

// CommonJS形式でビルド
esbuild.buildSync({
    ...commonConfig,
    format: 'cjs',
    outfile: 'dist/index.cjs',
});

// ES Module形式でビルド
esbuild.buildSync({
    ...commonConfig,
    format: 'esm',
    outfile: 'dist/index.mjs',
});

// TypeScript型定義ファイルをコピー
fs.copyFileSync('src/index.d.ts', 'dist/index.d.ts');

console.log('✓ Build completed successfully');
console.log('  - dist/index.cjs (CommonJS)');
console.log('  - dist/index.mjs (ES Module)');
console.log('  - dist/index.d.ts (TypeScript definitions)');
