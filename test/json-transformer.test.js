/**
 * JsonTransformer のテスト
 * object、arrayを除くプリミティブ値を {path, value} 形式で出力
 */
const { JsonTransformer } = require('../src/index.js');
const { createStreamFromString, collectAllValues } = require('./helpers');

describe('JsonTransformer - Primitive Value Extraction', () => {
    describe('基本的なプリミティブ値の抽出', () => {
        test('単純なオブジェクトからプリミティブ値を抽出', async () => {
            const json = '{"name": "Alice", "age": 30}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.name', value: 'Alice' });
            expect(results).toContainEqual({ path: '$.age', value: 30 });
        });

        test('配列からプリミティブ値を抽出', async () => {
            const json = '[1, 2, 3]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(3);
            expect(results).toContainEqual({ path: '$[0]', value: 1 });
            expect(results).toContainEqual({ path: '$[1]', value: 2 });
            expect(results).toContainEqual({ path: '$[2]', value: 3 });
        });

        test('文字列配列からプリミティブ値を抽出', async () => {
            const json = '["apple", "banana", "cherry"]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(3);
            expect(results[0]).toEqual({ path: '$[0]', value: 'apple' });
            expect(results[1]).toEqual({ path: '$[1]', value: 'banana' });
            expect(results[2]).toEqual({ path: '$[2]', value: 'cherry' });
        });

        test('真偽値とnullを含むオブジェクト', async () => {
            const json = '{"active": true, "deleted": false, "data": null}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(3);
            expect(results).toContainEqual({ path: '$.active', value: true });
            expect(results).toContainEqual({ path: '$.deleted', value: false });
            expect(results).toContainEqual({ path: '$.data', value: null });
        });
    });

    describe('ネストした構造からのプリミティブ値抽出', () => {
        test('ネストしたオブジェクト', async () => {
            const json = '{"user": {"name": "Bob", "age": 25}}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({
                path: '$.user.name',
                value: 'Bob',
            });
            expect(results).toContainEqual({ path: '$.user.age', value: 25 });
        });

        test('オブジェクトの配列', async () => {
            const json = '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(4);
            expect(results).toContainEqual({ path: '$.users[0].id', value: 1 });
            expect(results).toContainEqual({
                path: '$.users[0].name',
                value: 'Alice',
            });
            expect(results).toContainEqual({ path: '$.users[1].id', value: 2 });
            expect(results).toContainEqual({
                path: '$.users[1].name',
                value: 'Bob',
            });
        });

        test('深くネストした構造', async () => {
            const json = '{"a": {"b": {"c": {"d": "deep"}}}}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$.a.b.c.d', value: 'deep' });
        });

        test('配列を含むネスト', async () => {
            const json = '{"items": [{"tags": ["a", "b"]}, {"tags": ["c"]}]}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(3);
            expect(results).toContainEqual({
                path: '$.items[0].tags[0]',
                value: 'a',
            });
            expect(results).toContainEqual({
                path: '$.items[0].tags[1]',
                value: 'b',
            });
            expect(results).toContainEqual({
                path: '$.items[1].tags[0]',
                value: 'c',
            });
        });
    });

    describe('チャンク分割ストリーム処理', () => {
        test('小さなチャンクで分割して処理', async () => {
            const json = '{"name": "Alice", "age": 30}';
            const stream = createStreamFromString(json, 5); // 5バイトずつ分割

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.name', value: 'Alice' });
            expect(results).toContainEqual({ path: '$.age', value: 30 });
        });

        test('配列を小さなチャンクで処理', async () => {
            const json = '[1, 2, 3, 4, 5]';
            const stream = createStreamFromString(json, 3); // 3バイトずつ分割

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(5);
            expect(results[0]).toEqual({ path: '$[0]', value: 1 });
            expect(results[1]).toEqual({ path: '$[1]', value: 2 });
            expect(results[2]).toEqual({ path: '$[2]', value: 3 });
            expect(results[3]).toEqual({ path: '$[3]', value: 4 });
            expect(results[4]).toEqual({ path: '$[4]', value: 5 });
        });

        test('複雑なオブジェクトを1バイトずつ処理', async () => {
            const json = '{"a": 1, "b": 2}';
            const stream = createStreamFromString(json, 1); // 1バイトずつ分割

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.a', value: 1 });
            expect(results).toContainEqual({ path: '$.b', value: 2 });
        });
    });

    describe('空の構造とエッジケース', () => {
        test('空のオブジェクト - プリミティブ値なし', async () => {
            const json = '{}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(0);
        });

        test('空の配列 - プリミティブ値なし', async () => {
            const json = '[]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(0);
        });

        test('空のネストしたオブジェクト', async () => {
            const json = '{"empty": {}}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(0);
        });

        test('空の配列を含むオブジェクト', async () => {
            const json = '{"items": []}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(0);
        });
    });

    describe('特殊文字とエスケープ', () => {
        test('エスケープ文字を含む文字列', async () => {
            const json = '{"message": "Hello\\nWorld"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                path: '$.message',
                value: 'Hello\nWorld',
            });
        });

        test('特殊文字を含むキー名', async () => {
            const json = '{"user-name": "Alice", "user.email": "alice@example.com"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({
                path: '$.user-name',
                value: 'Alice',
            });
            expect(results).toContainEqual({
                path: '$.user.email',
                value: 'alice@example.com',
            });
        });

        test('Unicode文字を含む値', async () => {
            const json = '{"name": "太郎", "emoji": "😀"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.name', value: '太郎' });
            expect(results).toContainEqual({ path: '$.emoji', value: '😀' });
        });
    });

    describe('数値のバリエーション', () => {
        test('様々な数値形式', async () => {
            const json = '{"int": 42, "float": 3.14, "exp": 1e5, "negative": -100}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(4);
            expect(results).toContainEqual({ path: '$.int', value: 42 });
            expect(results).toContainEqual({ path: '$.float', value: 3.14 });
            expect(results).toContainEqual({ path: '$.exp', value: 1e5 });
            expect(results).toContainEqual({ path: '$.negative', value: -100 });
        });

        test('ゼロと小数', async () => {
            const json = '{"zero": 0, "decimal": 0.5}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.zero', value: 0 });
            expect(results).toContainEqual({ path: '$.decimal', value: 0.5 });
        });
    });

    describe('実践的なユースケース', () => {
        test('ユーザープロファイル', async () => {
            const json = JSON.stringify({
                id: 12345,
                username: 'alice_dev',
                email: 'alice@example.com',
                verified: true,
                profile: {
                    firstName: 'Alice',
                    lastName: 'Smith',
                    age: 30,
                },
                tags: ['developer', 'designer'],
            });
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results.length).toBeGreaterThan(0);
            expect(results).toContainEqual({ path: '$.id', value: 12345 });
            expect(results).toContainEqual({
                path: '$.username',
                value: 'alice_dev',
            });
            expect(results).toContainEqual({
                path: '$.email',
                value: 'alice@example.com',
            });
            expect(results).toContainEqual({ path: '$.verified', value: true });
            expect(results).toContainEqual({
                path: '$.profile.firstName',
                value: 'Alice',
            });
            expect(results).toContainEqual({
                path: '$.profile.lastName',
                value: 'Smith',
            });
            expect(results).toContainEqual({
                path: '$.profile.age',
                value: 30,
            });
            expect(results).toContainEqual({
                path: '$.tags[0]',
                value: 'developer',
            });
            expect(results).toContainEqual({
                path: '$.tags[1]',
                value: 'designer',
            });
        });

        test('API レスポンス形式', async () => {
            const json = JSON.stringify({
                status: 200,
                success: true,
                data: {
                    items: [
                        { id: 1, name: 'Item 1', price: 100 },
                        { id: 2, name: 'Item 2', price: 200 },
                    ],
                    total: 2,
                },
            });
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.status', value: 200 });
            expect(results).toContainEqual({ path: '$.success', value: true });
            expect(results).toContainEqual({
                path: '$.data.items[0].id',
                value: 1,
            });
            expect(results).toContainEqual({
                path: '$.data.items[0].name',
                value: 'Item 1',
            });
            expect(results).toContainEqual({
                path: '$.data.items[0].price',
                value: 100,
            });
            expect(results).toContainEqual({ path: '$.data.total', value: 2 });
        });
    });
});
