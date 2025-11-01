/**
 * JsonTransformStream - 公開APIのエンドツーエンドテスト
 * RFC 8259準拠のJSON処理とJsonPathフィルタリング機能を検証
 */
const { JsonTransformStream } = require('../../src/index.js');
const { createStreamFromString, collectAllValues } = require('./helpers');

describe('JsonTransformStream - Public API', () => {
    describe('基本的なJSON処理', () => {
        test('オブジェクトの値を抽出', async () => {
            const json = '{"name": "Alice", "age": 30}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toContainEqual({ path: '$.name', value: 'Alice' });
            expect(results).toContainEqual({ path: '$.age', value: 30 });
        });

        test('配列の値を抽出', async () => {
            const json = '[1, 2, 3]';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$[*]'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toEqual([
                { path: '$[0]', value: 1 },
                { path: '$[1]', value: 2 },
                { path: '$[2]', value: 3 },
            ]);
        });

        test('ネストした構造を処理', async () => {
            const json = '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.users[*]'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({ path: '$.users[0]', value: { id: 1, name: 'Alice' } });
            expect(results[1]).toEqual({ path: '$.users[1]', value: { id: 2, name: 'Bob' } });
        });
    });

    describe('JsonPathフィルタリング', () => {
        test('特定のフィールドのみ抽出', async () => {
            const json = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.name'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toEqual([{ path: '$.name', value: 'Alice' }]);
        });

        test('複数のパターンを指定', async () => {
            const json = '{"name": "Bob", "age": 25, "city": "Tokyo"}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.name', '$.age'],
            });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.name', value: 'Bob' });
            expect(results).toContainEqual({ path: '$.age', value: 25 });
        });

        test('オブジェクトワイルドカード (.*)', async () => {
            const json = '{"a": 1, "b": 2, "c": 3}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(3);
            expect(results).toContainEqual({ path: '$.a', value: 1 });
            expect(results).toContainEqual({ path: '$.b', value: 2 });
            expect(results).toContainEqual({ path: '$.c', value: 3 });
        });

        test('配列ワイルドカード ([*])', async () => {
            const json = '[10, 20, 30]';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$[*]'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(3);
            expect(results).toContainEqual({ path: '$[0]', value: 10 });
            expect(results).toContainEqual({ path: '$[1]', value: 20 });
            expect(results).toContainEqual({ path: '$[2]', value: 30 });
        });
    });

    describe('チャンク分割処理', () => {
        test('小さなチャンクで分割して処理', async () => {
            const json = '{"name": "Alice", "age": 30}';
            const stream = createStreamFromString(json, 5);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toContainEqual({ path: '$.name', value: 'Alice' });
            expect(results).toContainEqual({ path: '$.age', value: 30 });
        });

        test('1バイトずつ処理', async () => {
            const json = '{"a": 1, "b": 2}';
            const stream = createStreamFromString(json, 1);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toContainEqual({ path: '$.a', value: 1 });
            expect(results).toContainEqual({ path: '$.b', value: 2 });
        });
    });

    describe('マルチバイト文字処理', () => {
        test('日本語文字列', async () => {
            const json = '{"message": "こんにちは世界"}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toContainEqual({ path: '$.message', value: 'こんにちは世界' });
        });

        test('絵文字', async () => {
            const json = '{"emoji": "🎉🚀💻"}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toContainEqual({ path: '$.emoji', value: '🎉🚀💻' });
        });

        test('マルチバイト文字がチャンク境界で分割', async () => {
            const json = '{"name":"山田太郎"}';
            const encoder = new TextEncoder();
            const bytes = encoder.encode(json);
            const chunk1 = bytes.slice(0, 10);
            const chunk2 = bytes.slice(10);

            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(chunk1);
                    controller.enqueue(chunk2);
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toContainEqual({ path: '$.name', value: '山田太郎' });
        });
    });

    describe('エラーハンドリング', () => {
        async function expectError(json) {
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const reader = stream.pipeThrough(transformer).getReader();

            let error = null;
            try {
                while (true) {
                    const { done } = await reader.read();
                    if (done) break;
                }
            } catch (e) {
                error = e;
            } finally {
                reader.releaseLock();
            }
            return error;
        }

        test('不正なJSON', async () => {
            const error = await expectError('invalid');
            expect(error).toBeTruthy();
        });

        test('閉じ括弧の不一致', async () => {
            const error = await expectError('{"name": "Alice"');
            expect(error).toBeTruthy();
        });

        test('acceptableJsonPathが空配列の場合エラー', async () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new JsonTransformStream({ acceptableJsonPath: [] });
            }).toThrow('acceptableJsonPath is required');
        });

        test('acceptableJsonPathがundefinedの場合エラー', async () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new JsonTransformStream({ acceptableJsonPath: undefined });
            }).toThrow('acceptableJsonPath is required');
        });
    });

    describe('RFC 8259準拠性', () => {
        test('エスケープシーケンス処理', async () => {
            const json = '{"text": "Hello\\nWorld\\tTest"}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toContainEqual({ path: '$.text', value: 'Hello\nWorld\tTest' });
        });

        test('数値形式（整数、小数、指数表記）', async () => {
            const json = '{"int": 42, "float": 3.14, "exp": 1e5, "negative": -100}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toContainEqual({ path: '$.int', value: 42 });
            expect(results).toContainEqual({ path: '$.float', value: 3.14 });
            expect(results).toContainEqual({ path: '$.exp', value: 1e5 });
            expect(results).toContainEqual({ path: '$.negative', value: -100 });
        });

        test('リテラル値（true/false/null）', async () => {
            const json = '{"active": true, "deleted": false, "data": null}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toContainEqual({ path: '$.active', value: true });
            expect(results).toContainEqual({ path: '$.deleted', value: false });
            expect(results).toContainEqual({ path: '$.data', value: null });
        });
    });

    describe('パフォーマンス', () => {
        test('大規模配列の処理（1000要素）', async () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                name: `User${i}`,
            }));
            const json = JSON.stringify({ users: largeArray });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(json));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.users[*]'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(1000);
            expect(results[0].value).toEqual({ id: 0, name: 'User0' });
            expect(results[999].value).toEqual({ id: 999, name: 'User999' });
        });

        test('不要なデータをスキップして高速処理', async () => {
            const largeData = {
                target: 'extract-me',
                skipThis: Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    nested: { deep: { value: `data-${i}` } },
                })),
            };

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(JSON.stringify(largeData)));
                    controller.close();
                },
            });

            const startTime = Date.now();
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.target'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));
            const elapsed = Date.now() - startTime;

            expect(results).toEqual([{ path: '$.target', value: 'extract-me' }]);
            expect(elapsed).toBeLessThan(100);
        });
    });
});
