# json-stream-parser

JSONデータを逐次処理するためのJSONストリーミングパーサー

## 特徴

- **ゼロ依存**: ランタイム依存ライブラリなし - ビルドツール用のdevDependenciesのみ
- **Streams API対応**: Streams API（TransformStream）ベースで、モダンなストリーミングワークフローに対応
- **ストリーミング処理**: 大きなJSONデータをメモリに全体を読み込むことなく逐次処理
- **TypeScriptサポート**: 型定義ファイルを提供
- **クロスプラットフォーム**: ブラウザとNode.js環境の両方で動作

## インストール

```bash
npm install @nishimine/json-stream-parser
```

## クイックスタート

### 利用パターンA: JsonTransformerとStreams APIの使用

```javascript
// CommonJS
const { JsonTransformer } = require('@nishimine/json-stream-parser');
// ES Modules: import { JsonTransformer } from '@nishimine/json-stream-parser';

// fetch()と一緒に使用
const response = await fetch('https://api.example.com/data.json');
const transformer = new JsonTransformer();
const resultStream = response.body.pipeThrough(transformer);

// for-await-ofで結果を処理
// object、arrayを除くプリミティブ値（string、number、boolean、null）のみが出力されます
for await (const { path, value } of resultStream) {
    console.log(`${path}: ${value}`);
}
```

### 利用パターンB: JsonStreamParserの使用（コールバック利用）

```javascript
// CommonJS
const { JsonStreamParser } = require('@nishimine/json-stream-parser');
// ES Modules: import { JsonStreamParser } from '@nishimine/json-stream-parser';

const response = await fetch('https://api.example.com/data.json');
const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path} = ${JSON.stringify(value)}`);
    },
    onError: error => {
        console.error(`${error.path}のパースに失敗: ${error.message}`);
    },
});

await parser.parseStream(response.body);
```

## APIリファレンス

完全なAPIドキュメントについては、[API Reference](doc/spec/api-reference.md)を参照してください。

### `JsonTransformer`

Streams APIベースのTransformStreamインターフェースです。object、arrayを除くプリミティブ値（string、number、boolean、null）が見つかるたびに `{path: <jsonpath>, value: <value>}` 形式で変換してストリーミング出力します。

#### コンストラクタ

```javascript
const transformer = new JsonTransformer(options);
```

**パラメータ:**

- `options`: Object（省略可）
    - 現在のバージョンでは特別なオプションはありません

#### 使い方

`JsonTransformer`は`TransformStream<Uint8Array, {path: string, value: any}>`を継承しているため、`pipeThrough()`で直接使用できます。

```javascript
const { JsonTransformer } = require('@nishimine/json-stream-parser');

const transformer = new JsonTransformer();

// ReadableStreamと接続
const resultStream = inputStream.pipeThrough(transformer);

// 結果を処理
const reader = resultStream.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value); // { path: '$.key', value: 'someValue' }
}
```

#### 出力形式

JsonTransformerは以下の形式でプリミティブ値を出力します：

```javascript
{
    path: string,   // JsonPath形式のパス（例: '$.users[0].name'）
    value: any      // プリミティブ値（string、number、boolean、null）
}
```

**注意:** object型とarray型の値は出力されません。これらの構造内のプリミティブ値のみが個別に出力されます。

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

// 出力される値
// { path: '$.name', value: 'Alice' }
// { path: '$.age', value: 30 }
// { path: '$.address.city', value: 'Tokyo' }
// { path: '$.address.zip', value: null }
// { path: '$.tags[0]', value: 'developer' }
// { path: '$.tags[1]', value: 'designer' }
```

### `JsonStreamParser`

コールバックベースのインターフェースでJSONストリーミング解析を行います。このクラスはJsonTransformerをラップし、よりシンプルなコールバックベースのAPIを提供します。

#### コンストラクタオプション

```javascript
// オプション設定例
const options = {
    onValueParsed: (path, value) => {
        // function (optional)
        console.log(`${path}: ${value}`);
    },
    onError: error => {
        // function (optional)
        console.error(`error: ${error.message}`);
    },
};
```

- **`onValueParsed`** (オプション): 値がパースされたときにトリガーされるコールバック
    - `path`: パースされた値のJsonPath文字列
    - `value`: パースされたJSON値（string、number、boolean、null）
    - **注意**: このコールバックはすべてのパースされた値に対して呼び出されます。必要に応じてコールバック内にフィルタリングロジックを実装してください。
- **`onError`** (オプション): エラーコールバック関数
    - 提供された場合、エラーは投げられずにこのコールバックに渡されます

#### メソッド

**`parseStream(readableStream: ReadableStream): Promise<void>`**

- JSONデータを含むReadableStreamを処理
- パース完了時に解決されるPromiseを返します
- エラーコールバックが提供されていない場合、`JsonStreamParserError`を投げます

### `JsonStreamParserError`

JSONパースエラー用のカスタムエラークラスです。プロパティ、ファクトリメソッド、使用方法の詳細については、[JsonStreamParserError仕様](doc/spec/jsonstream-parser-error.md)を参照してください。

## JsonPath形式

すべてのパースされた値にはJsonPath形式の`path`プロパティが含まれます:

| パターン例        | 説明                         | JSON例                                              |
| ----------------- | ---------------------------- | --------------------------------------------------- |
| `$.key`           | オブジェクトプロパティ       | `{"key": "value"}` → `$.key`                        |
| `$.a`, `$.b`      | 複数のオブジェクトプロパティ | `{"a": 1, "b": 2}` → `$.a`, `$.b`                   |
| `$[0]`, `$[1]`    | 配列要素                     | `[1, 2, 3]` → `$[0]`, `$[1]`, `$[2]`                |
| `$.items[0]`      | プロパティ内の配列要素       | `{"items": [1, 2]}` → `$.items[0]`, `$.items[1]`    |
| `$.users[0].name` | 配列内のネストプロパティ     | `{"users": [{"name": "太郎"}]}` → `$.users[0].name` |

これらのパスパターンは、`onValueParsed`コールバック内で文字列マッチングや正規表現を使ってフィルタリングに使用できます。

## 高度な使用方法

### 大きなファイルの処理

```javascript
const fs = require('fs');
const { Readable } = require('stream');
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    },
});

const fileStream = fs.createReadStream('large-file.json');
const webStream = Readable.toWeb(fileStream);
await parser.parseStream(webStream);
```

### Fetch APIでの使用

```javascript
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    },
});

const response = await fetch('https://api.example.com/products.json');
await parser.parseStream(response.body);
```

### エラー復旧

```javascript
const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`Parsed: ${path} = ${JSON.stringify(value)}`);
    },
    onError: error => {
        console.error('エラーが発生しました:', error.message);
        // エラーハンドリングまたは新しいパーサーインスタンスでリトライ
    },
});

try {
    await parser.parseStream(stream);
} catch (error) {
    console.error('致命的なエラー:', error);
}
```

## エラータイプと復旧方法

詳細なエラーハンドリング方法とベストプラクティスについては、[エラーハンドリング仕様](doc/spec/error-handling.md)をご覧ください。

## 制限事項

- **ルートレベルのプリミティブ値は非対応**: ルート値としてサポートされるのはJSONオブジェクト（`{}`）と配列（`[]`）のみです。`42`、`"string"`、`true`、`false`、`null`のようなルートレベルのプリミティブ値はエラーとなります。これは構造化されたJSONデータに焦点を当てるための設計判断です。

## 動作環境

- ほとんどのモダンブラウザ
- Node.js 20.0.0以上
- ES modulesとCommonJSの完全サポート
