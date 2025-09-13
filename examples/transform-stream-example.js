/**
 * JsonTransformer & JsonStreamParser 使用例
 *
 * ReadableStreamからJSONをパースし、コールバックでフィルタリングする例
 */

const { JsonTransformer, JsonStreamParser } = require('../src/index.js');
const { ReadableStream } = require('stream/web');

// サンプルJSONデータ
const jsonData = JSON.stringify({
  users: [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
    { id: 3, name: "Charlie", email: "charlie@example.com" }
  ],
  metadata: {
    total: 3,
    page: 1
  }
});

// 例1: JsonTransformer - 基本的な使い方
async function example1() {
  console.log('\n=== 例1: JsonTransformer - 基本的な使い方 ===');

  // ReadableStreamを作成（実際にはfetch()等のレスポンスボディを使用）
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(jsonData);

      // チャンクに分割して送信
      const chunkSize = 50;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.slice(i, i + chunkSize));
      }
      controller.close();
    }
  });

  // JsonTransformerでパイプ
  const transformer = new JsonTransformer();
  const resultStream = stream.pipeThrough(transformer);

  const reader = resultStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log('Path:', value.path);
      console.log('Value:', value.value);
      console.log('---');
    }
  } finally {
    reader.releaseLock();
  }
}

// 例2: JsonStreamParser - ユーザー名のみ抽出
async function example2() {
  console.log('\n=== 例2: JsonStreamParser - ユーザー名のみ抽出 ===');

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(jsonData));
      controller.close();
    }
  });

  // ユーザー名のみをコールバックでフィルタリング
  const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
      // 正規表現でユーザー名のパスにマッチ
      if (path.match(/^\$\.users\[\d+\]\.name$/)) {
        console.log(`ユーザー名: ${value}`);
      }
    }
  });

  await parser.parseStream(stream);
}

// 例3: for-await-of構文での使用
async function example3() {
  console.log('\n=== 例3: for-await-of構文での使用 ===');

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(jsonData));
      controller.close();
    }
  });

  const transformer = new JsonTransformer();
  const resultStream = stream.pipeThrough(transformer);

  // for-await-of構文で簡潔に処理 & フィルタリング
  for await (const { path, value } of resultStream) {
    // メールアドレスのみ表示
    if (path.match(/^\$\.users\[\d+\]\.email$/)) {
      console.log(`メールアドレス: ${value}`);
    }
  }
}

// 例4: 複数のパスパターンでフィルタリング
async function example4() {
  console.log('\n=== 例4: 複数のパスパターンでフィルタリング ===');

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(jsonData));
      controller.close();
    }
  });

  // ユーザー名とメタデータの合計値のみ抽出
  const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
      // 複数パターンでマッチング
      if (path.match(/^\$\.users\[\d+\]\.name$/) || path === '$.metadata.total') {
        console.log(`${path}: ${value}`);
      }
    }
  });

  await parser.parseStream(stream);
}

// 例5: データ収集とバッチ処理
async function example5() {
  console.log('\n=== 例5: データ収集とバッチ処理 ===');

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(jsonData));
      controller.close();
    }
  });

  // すべてのユーザーIDを収集
  const userIds = [];
  const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
      if (path.match(/^\$\.users\[\d+\]\.id$/)) {
        userIds.push(value);
      }
    }
  });

  await parser.parseStream(stream);

  console.log('収集したユーザーID:', userIds);
  console.log('合計:', userIds.length, '件');
}

// 例6: エラーハンドリング
async function example6() {
  console.log('\n=== 例6: エラーハンドリング ===');

  const invalidJson = '{"users": [{"name": "Alice"'; // 不正なJSON

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(invalidJson));
      controller.close();
    }
  });

  // onErrorコールバックでエラーをハンドリング
  const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
      console.log(`${path}: ${value}`);
    },
    onError: (error) => {
      console.error('パースエラーが発生:');
      console.error('  メッセージ:', error.message);
      console.error('  タイプ:', error.type);
      console.error('  位置:', error.position);
    }
  });

  await parser.parseStream(stream);
  console.log('エラーハンドリング完了（エラーコールバックで処理済み）');
}

// 全ての例を実行
async function runAllExamples() {
  await example1();
  await example2();
  await example3();
  await example4();
  await example5();
  await example6();
}

// Node.js環境でモジュールとして実行された場合
if (require.main === module) {
  runAllExamples().catch(console.error);
}

module.exports = {
  example1,
  example2,
  example3,
  example4,
  example5,
  example6
};
