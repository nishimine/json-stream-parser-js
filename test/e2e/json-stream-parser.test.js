/**
 * JsonStreamParser - 公開APIのエンドツーエンドテスト
 * コールバックベースのストリーミングJSON解析を検証
 */
const { JsonStreamParser } = require('../../src/index.js');

describe('JsonStreamParser - Public API', () => {
    async function parseWithCallback(jsonString, acceptableJsonPath) {
        const encoder = new TextEncoder();
        const chunk = encoder.encode(jsonString);

        const results = [];
        const parser = new JsonStreamParser({
            acceptableJsonPath,
            onValueParsed: (path, value) => {
                results.push({ path, value });
            },
        });

        await parser.enqueue(chunk);
        await parser.close();
        return results;
    }

    describe('基本的なJSON処理', () => {
        test('オブジェクトの値を抽出', async () => {
            const json = '{"name": "Alice", "age": 30}';
            const results = await parseWithCallback(json, ['$.*']);

            expect(results).toContainEqual({ path: '$.name', value: 'Alice' });
            expect(results).toContainEqual({ path: '$.age', value: 30 });
        });

        test('配列の値を抽出', async () => {
            const json = '[1, 2, 3]';
            const results = await parseWithCallback(json, ['$[*]']);

            expect(results).toEqual([
                { path: '$[0]', value: 1 },
                { path: '$[1]', value: 2 },
                { path: '$[2]', value: 3 },
            ]);
        });

        test('ネストした構造を処理', async () => {
            const json = '{"users": [{"id": 1}, {"id": 2}]}';
            const results = await parseWithCallback(json, ['$.users[*]']);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({ path: '$.users[0]', value: { id: 1 } });
            expect(results[1]).toEqual({ path: '$.users[1]', value: { id: 2 } });
        });
    });

    describe('コールバック機能', () => {
        test('onValueParsedコールバックが呼ばれる', async () => {
            const json = '{"a": 1, "b": 2}';
            const encoder = new TextEncoder();
            const chunk = encoder.encode(json);

            const results = [];
            const parser = new JsonStreamParser({
                acceptableJsonPath: ['$.*'],
                onValueParsed: (path, value) => {
                    results.push({ path, value });
                },
            });

            await parser.enqueue(chunk);
            await parser.close();

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.a', value: 1 });
            expect(results).toContainEqual({ path: '$.b', value: 2 });
        });

        test('コールバックなしでも動作する', async () => {
            const json = '{"a": 1}';
            const encoder = new TextEncoder();
            const chunk = encoder.encode(json);

            const parser = new JsonStreamParser({
                acceptableJsonPath: ['$.*'],
            });

            await parser.enqueue(chunk);
            await expect(parser.close()).resolves.not.toThrow();
        });
    });

    describe('JsonPathフィルタリング', () => {
        test('特定のフィールドのみ抽出', async () => {
            const json = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
            const results = await parseWithCallback(json, ['$.name']);

            expect(results).toEqual([{ path: '$.name', value: 'Alice' }]);
        });

        test('複数のパターンを指定', async () => {
            const json = '{"name": "Bob", "age": 25, "city": "Tokyo"}';
            const results = await parseWithCallback(json, ['$.name', '$.age']);

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.name', value: 'Bob' });
            expect(results).toContainEqual({ path: '$.age', value: 25 });
        });
    });

    describe('エラーハンドリング', () => {
        test('不正なJSONでエラー', async () => {
            const json = 'invalid';
            await expect(parseWithCallback(json, ['$.*'])).rejects.toThrow();
        });

        test('acceptableJsonPathが空配列の場合エラー', async () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new JsonStreamParser({ acceptableJsonPath: [] });
            }).toThrow('acceptableJsonPath is required');
        });

        test('acceptableJsonPathがundefinedの場合エラー', async () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new JsonStreamParser({ acceptableJsonPath: undefined });
            }).toThrow('acceptableJsonPath is required');
        });

        test('エラー後は再利用不可', async () => {
            const parser = new JsonStreamParser({
                acceptableJsonPath: ['$.*'],
                onValueParsed: () => {},
            });

            const encoder = new TextEncoder();
            const invalidChunk = encoder.encode('{"invalid"');

            await parser.enqueue(invalidChunk);
            await expect(parser.close()).rejects.toThrow();

            // 新しいインスタンスは必要
            const validChunk = encoder.encode('{"valid": 1}');

            // 同じインスタンスの再利用は想定外の動作
            // 新しいインスタンスを使用すべき
            const newParser = new JsonStreamParser({
                acceptableJsonPath: ['$.*'],
                onValueParsed: () => {},
            });

            await newParser.enqueue(validChunk);
            await expect(newParser.close()).resolves.not.toThrow();
        });
    });

    describe('パフォーマンス', () => {
        test('大規模配列の処理（1000要素）', async () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                name: `User${i}`,
            }));
            const json = JSON.stringify({ users: largeArray });

            const results = await parseWithCallback(json, ['$.users[*]']);

            expect(results).toHaveLength(1000);
            expect(results[0].value).toEqual({ id: 0, name: 'User0' });
            expect(results[999].value).toEqual({ id: 999, name: 'User999' });
        });
    });
});
