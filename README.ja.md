# json-stream-parser

JSONデータを逐次処理するためのJSONストリーミングパーサー

## 特徴

- **ゼロ依存**: ランタイム依存ライブラリなし - ビルドツール用のdevDependenciesのみ
- **Streams API対応**: Streams API（TransformStream）ベースで、モダンなストリーミングワークフローに対応
- **ストリーミング処理**: 大きなJSONデータをメモリに全体を読み込むことなく逐次処理
- **JsonPathフィルタリング**: JsonPathパターンマッチング（制限付き - ワイルドカードはパス末尾のみ可）で必要な値のみを抽出
- **TypeScriptサポート**: 型定義ファイルを提供
- **クロスプラットフォーム**: ブラウザとNode.js環境の両方で動作

## インストール

```bash
npm install @nishimine/json-stream-parser
```

## クイックスタート

### 利用パターンA: JsonTransformStreamとStreams APIの使用

```javascript
// CommonJS
const { JsonTransformStream } = require('@nishimine/json-stream-parser');
// ES Modules: import { JsonTransformStream } from '@nishimine/json-stream-parser';

// fetch()と一緒に使用
const response = await fetch('https://api.example.com/users.json');

// JsonPathパターンでユーザーオブジェクトを抽出（制限付きサブセット：ワイルドカードはパス末尾のみ可）
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.users[*]'], // 必須: 抽出するパスを指定
});
const resultStream = response.body.pipeThrough(transformer);

// for-await-ofで結果を処理
// 指定したパターンにマッチする値のみが出力されます
for await (const { path, value } of resultStream) {
    console.log(`${path}: ${value.email}`); // オブジェクトからemailを取得
    // 出力例: $.users[0]: alice@example.com
    //         $.users[1]: bob@example.com
    //         ...
}
```

### 利用パターンB: JsonStreamParserの使用（コールバック利用）

```javascript
// CommonJS
const { JsonStreamParser } = require('@nishimine/json-stream-parser');
// ES Modules: import { JsonStreamParser } from '@nishimine/json-stream-parser';

const response = await fetch('https://api.example.com/data.json');
const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.users[*]'], // 必須: 抽出するパスを指定（制限付きサブセット）
    onValueParsed: (path, value) => {
        // valueはユーザーオブジェクト全体
        console.log(`${path} = ${JSON.stringify(value)}`);
        console.log(`Email: ${value.email}`); // プロパティにアクセス
    },
    onError: error => {
        console.error(`パースに失敗: ${error.message}`);
    },
});

// チャンクを処理
const reader = response.body.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await parser.enqueue(value);
}
await parser.close();
```

## APIリファレンス

完全なAPIドキュメントについては、[API Reference](doc/spec/api-reference.md)を参照してください。

### `JsonTransformStream`

Streams APIベースのTransformStreamインターフェースです。指定されたJsonPathパターンにマッチする値を `{path: <jsonpath>, value: <value>}` 形式で変換してストリーミング出力します。

#### コンストラクタ

```javascript
const transformer = new JsonTransformStream(options);
```

**パラメータ:**

- `options`: Object（必須）
    - `acceptableJsonPath`: string[]（必須） - 出力する値をフィルタリングするJsonPathパターンの配列
        - **制限付きJsonPath**: ワイルドカード（`*`）はパス末尾のみ配置可能
        - サポートされるパターン:
            - 完全一致: `$.field`, `$.user.email`
            - パス末尾のワイルドカード: `$.*`, `$.config.*`, `$[*]`, `$.users[*]`
        - 例:
            - `['$.users[*]']` - 全ユーザーオブジェクトを抽出（`.email`などはアプリ側でアクセス）
            - `['$.config.*']` - configオブジェクトの全プロパティを抽出
            - `['$.*']` - ルートレベルの全プロパティを抽出

#### 使い方

`JsonTransformStream`は`TransformStream<Uint8Array, {path: string, value: any}>`を継承しているため、`pipeThrough()`で直接使用できます。

```javascript
const { JsonTransformStream } = require('@nishimine/json-stream-parser');

// 抽出するパスを指定
// 注意: ワイルドカードはパスの末尾のみサポートされます
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.users[*]', '$.config.*'],
});

// ReadableStreamと接続
const resultStream = inputStream.pipeThrough(transformer);

// 結果を処理
const reader = resultStream.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value); // { path: '$.users[0]', value: { name: 'Alice', email: 'alice@example.com' } }
}
```

#### 出力形式

JsonTransformStreamは以下の形式で値を出力します：

```javascript
{
    path: string,   // JsonPath形式のパス（例: '$.users[0]', '$.name'）
    value: any      // 任意のJSON値（プリミティブ、オブジェクト、配列）
}
```

**注意:** すべてのJSON値が出力されます - プリミティブ、オブジェクト、配列。出力される値の型は`acceptableJsonPath`パターンに依存します。

#### 使用例

```javascript
// 入力JSON
const json = {
    name: 'Alice',
    age: 30,
    address: {
        city: 'Tokyo',
        zip: null,
    },
    tags: ['developer', 'designer'],
};

// acceptableJsonPath: ['$.*'] の場合
// 出力される値（ルートレベルのプロパティ）:
// { path: '$.name', value: 'Alice' }
// { path: '$.age', value: 30 }
// { path: '$.address', value: { city: 'Tokyo', zip: null } }
// { path: '$.tags', value: ['developer', 'designer'] }

// acceptableJsonPath: ['$.address'] の場合
// 出力される値（オブジェクト）:
// { path: '$.address', value: { city: 'Tokyo', zip: null } }
```

### `JsonStreamParser`

コールバックベースのインターフェースでJSONストリーミング解析を行います。このクラスは`enqueue()`メソッドを使用したシンプルなチャンクベースのAPIを提供します。

#### コンストラクタオプション

```javascript
// オプション設定例
const options = {
    acceptableJsonPath: ['$.users[*]'], // 必須（制限付きサブセット）
    onValueParsed: (path, value) => {
        // function (optional)
        console.log(`${path}: ${JSON.stringify(value)}`);
        console.log(`Email: ${value.email}`); // プロパティにアクセス
    },
    onError: error => {
        // function (optional)
        console.error(`error: ${error.message}`);
    },
};
```

- **`acceptableJsonPath`**（必須）: 出力する値をフィルタリングするJsonPathパターンの配列
    - 制限付きワイルドカードをサポート: `*`（1階層のみ、パス末尾のみ配置可）
    - **注意**: `**`（再帰的ワイルドカード）は未サポート - 「制限事項」セクションを参照
    - これらのパターンにマッチする値のみが`onValueParsed`に渡されます
- **`onValueParsed`**（オプション）: マッチした値がパースされたときにトリガーされるコールバック
    - `path`: パースされた値のJsonPath文字列
    - `value`: パースされたJSON値（プリミティブ、オブジェクト、配列のいずれか）
- **`onError`**（オプション）: エラーコールバック関数
    - 提供された場合、エラーは投げられずにこのコールバックに渡されます

#### メソッド

**`enqueue(chunk: Uint8Array): Promise<void>`**

- JSONデータのチャンクを処理
- 複数回呼び出してデータを段階的に処理できます
- エラーコールバックが提供されていない場合、`JsonStreamParserError`を投げます

**`close(): Promise<void>`**

- パーサーを閉じて最終結果を待機
- すべてのチャンクをenqueueした後に呼び出す必要があります
- パース完了時に解決されるPromiseを返します
- エラーコールバックが提供されていない場合、`JsonStreamParserError`を投げます

### `JsonStreamParserError`

JSONパースエラー用のカスタムエラークラスです。プロパティ、ファクトリメソッド、使用方法の詳細については、[JsonStreamParserError仕様](doc/spec/jsonstream-parser-error.md)を参照してください。

## JsonPath形式

すべてのパースされた値にはJsonPath形式の`path`プロパティが含まれます:

| パターン例        | 説明                         | JSON例                                                  |
| ----------------- | ---------------------------- | ------------------------------------------------------- |
| `$.key`           | オブジェクトプロパティ       | `{"key": "value"}` → `$.key`                            |
| `$.a`, `$.b`      | 複数のオブジェクトプロパティ | `{"a": 1, "b": 2}` → `$.a`, `$.b`                       |
| `$[0]`, `$[1]`    | 配列要素                     | `[1, 2, 3]` → `$[0]`, `$[1]`, `$[2]`                    |
| `$.items[0]`      | プロパティ内の配列要素       | `{"items": [1, 2]}` → `$.items[0]`, `$.items[1]`        |
| `$.users[0].name` | 配列内のネストプロパティ     | `{"users": [{"name": "山田太郎"}]}` → `$.users[0].name` |

これらのパスパターンは、`onValueParsed`コールバック内で文字列マッチングや正規表現を使ってフィルタリングに使用できます。

## 高度な使用方法

### 大きなファイルの処理

```javascript
const fs = require('fs');
const { Readable } = require('stream');
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'], // 必須パラメータ（この例ではルートレベルの全プロパティを抽出）
    onValueParsed: (path, value) => {
        console.log(`${path}: ${JSON.stringify(value)}`);
    },
});

const fileStream = fs.createReadStream('large-file.json');
const webStream = Readable.toWeb(fileStream);
const reader = webStream.getReader();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await parser.enqueue(value);
}
await parser.close();
```

### Fetch APIでの使用

```javascript
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'], // 必須パラメータ（この例ではルートレベルの全プロパティを抽出）
    onValueParsed: (path, value) => {
        console.log(`${path}: ${JSON.stringify(value)}`);
    },
});

const response = await fetch('https://api.example.com/products.json');
const reader = response.body.getReader();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await parser.enqueue(value);
}
await parser.close();
```

### エラー復旧

```javascript
const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'], // 必須パラメータ（この例ではルートレベルの全プロパティを抽出）
    onValueParsed: (path, value) => {
        console.log(`Parsed: ${path} = ${JSON.stringify(value)}`);
    },
    onError: error => {
        console.error('エラーが発生しました:', error.message);
        // エラーハンドリングまたは新しいパーサーインスタンスでリトライ
    },
});

try {
    const reader = stream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await parser.enqueue(value);
    }
    await parser.close();
} catch (error) {
    console.error('致命的なエラー:', error);
}
```

## エラータイプと復旧方法

詳細なエラーハンドリング方法とベストプラクティスについては、[エラーハンドリング仕様](doc/spec/error-handling.md)をご覧ください。

## 制限事項

### JsonPath フィルタリング（制限付き）

json-stream-parserは、パフォーマンスとシンプルさを重視した**制限付きJsonPath**を実装しています。標準のJsonPath仕様（RFC 9535）のサブセットとして、ワイルドカードをパス末尾のみに制限することで高速化を実現しています。

#### ✅ サポートするパターン

1. **完全一致パス**

    ```javascript
    '$.name'; // ルート直下のnameフィールド
    '$.user.email'; // ネストしたフィールド
    ```

2. **オブジェクトワイルドカード（パス末尾のみ配置可）**

    ```javascript
    '$.config.*'; // configオブジェクトの直下の全プロパティ（1階層のみ）
    '$.user.settings.*'; // ネストしたオブジェクトの全プロパティ（1階層のみ）
    ```

3. **配列ワイルドカード（パス末尾のみ配置可）**

    ```javascript
    '$[*]'; // ルート配列の全要素
    '$.users[*]'; // users配列の全要素
    ```

#### ❌ サポートしないパターン

以下のパターンはサポートされません：

1. **配列の特定インデックス指定**

    ```javascript
    // ❌ 使用不可
    '$[0]'; // 特定インデックス
    '$.users[0].name'; // 特定要素のフィールド

    // ✅ 代替: 全要素を取得してアプリ側でフィルタ
    '$.users[*]'; // 全要素を取得
    ```

2. **中間のワイルドカード**

    ```javascript
    // ❌ 使用不可
    '$.users[*].email'; // ワイルドカード後に具体的パス
    '$.departments.*.name'; // *の後に続くパス

    // ✅ 代替: 親要素を取得してアプリ側で処理
    '$.users[*]'; // 全ユーザーオブジェクトを取得、.emailにアクセス
    '$.departments.*'; // 全部署を取得、.nameにアクセス
    // 例:
    for await (const { path, value } of stream) {
        console.log(value.email); // ユーザーオブジェクトからemailプロパティにアクセス
    }
    ```

3. **再帰下降演算子（深さワイルドカード）**

    ```javascript
    // ❌ 使用不可
    '$.**'; // 全ての子孫値（再帰的）
    '$.**.email'; // **の後に具体的パス
    '$.data.**.id'; // **の前後に具体的パス

    // ✅ 代替: 具体的パスを明示的に列挙
    ['$.email', '$.user.email', '$.users[*]'];
    // 取得した各値から、コード内でネストしたプロパティにアクセス
    ```

詳細については、[JsonPathフィルタリング仕様](doc/spec/jsonpath-filtering.md)をご覧ください。

## このライブラリが役立つケース

**ほとんどの場合、標準の`JSON.parse()`の方が高速でシンプルです。** 小さなファイルでは`JSON.parse()`が圧倒的に高速です。

ただし、以下のようなケースでは`JsonTransformStream`が役立ちます：

1. **超大容量ファイルの処理** - JSONデータがメモリに収まらない場合

    ```javascript
    // ❌ 大きなファイル（100MB以上）でメモリ不足エラーの可能性
    const huge = await fetch('large-dataset.json').text();
    const data = JSON.parse(huge); // クラッシュ！

    // ✅ 逐次的にストリーミング処理 - どんなサイズでも処理可能
    const response = await fetch('large-dataset.json');
    await response.body
        .pipeThrough(new JsonTransformStream({ acceptableJsonPath: ['$.items[*]'] }))
        .pipeTo(processor); // 1アイテムずつ処理
    ```

2. **ネットワークストリーミング** - ダウンロード完了前に処理を開始したい場合

    ```javascript
    const response = await fetch('https://api.example.com/large-dataset');
    // データが到着次第処理開始、全体のダウンロード完了を待たない
    await response.body.pipeThrough(transformer).pipeTo(processor);
    ```

3. **メモリ制約のある環境** - IoTデバイス、エッジコンピューティングなど

4. **大きなJSONから選択的に抽出** - 全体をパースせず特定のパスのみ抽出
    ```javascript
    // ユーザーオブジェクトのみを抽出、他のトップレベルプロパティはスキップ
    new JsonTransformStream({ acceptableJsonPath: ['$.users[*]'] });
    // コード側で各ユーザーオブジェクトから.emailにアクセス
    ```

## 動作環境

- ほとんどのモダンブラウザ
- Node.js 20.0.0以上
- ES modulesとCommonJSの完全サポート
