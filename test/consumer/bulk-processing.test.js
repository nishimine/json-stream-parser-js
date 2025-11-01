/**
 * Bulk Processing Strategy - 一括処理戦略のテスト
 * 完全一致パターンで効率的にBulk処理される機能を検証
 */
const { JsonTransformStream } = require('../../src/json-transform-stream');

/**
 * テストヘルパー: JsonTransformStreamでJSONを処理して結果を取得
 */
async function processJson(jsonString, acceptableJsonPath) {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode(jsonString)];

    const results = [];
    const transformer = new JsonTransformStream({ acceptableJsonPath });

    const readable = new ReadableStream({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(chunk);
            }
            controller.close();
        },
    });

    await readable.pipeThrough(transformer).pipeTo(
        new WritableStream({
            write(item) {
                results.push(item);
            },
        })
    );

    return results;
}

describe('Consumer - Bulk Processing Strategy', () => {
    describe('オブジェクトの一括処理', () => {
        test('完全一致パターン $.a でオブジェクト全体を1つのアイテムとして出力', async () => {
            const json = JSON.stringify({
                a: { x: 1, y: 2, z: 3 },
                b: { ignore: 'this' },
            });

            const results = await processJson(json, ['$.a']);

            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('$.a');
            expect(results[0].value).toEqual({ x: 1, y: 2, z: 3 });
        });

        test('ネストしたオブジェクトの一括処理', async () => {
            const json = JSON.stringify({
                a: {
                    b: {
                        c: {
                            deep: { nested: { value: 123 } },
                        },
                    },
                },
            });

            const results = await processJson(json, ['$.a.b.c']);

            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('$.a.b.c');
            expect(results[0].value).toEqual({
                deep: { nested: { value: 123 } },
            });
        });
    });

    describe('配列の一括処理', () => {
        test('完全一致パターン $.a で配列全体を1つのアイテムとして出力', async () => {
            const json = JSON.stringify({
                a: [1, 2, 3, 4, 5],
                b: { ignore: 'this' },
            });

            const results = await processJson(json, ['$.a']);

            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('$.a');
            expect(results[0].value).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('Bulk vs Incremental の比較', () => {
        test('$.a (bulk) はオブジェクト全体を1アイテムで出力', async () => {
            const json = JSON.stringify({
                a: { x: 1, y: 2 },
            });

            const results = await processJson(json, ['$.a']);

            expect(results).toHaveLength(1);
        });

        test('$.a.* (incremental) は各プロパティを個別に出力', async () => {
            const json = JSON.stringify({
                a: { x: 1, y: 2 },
            });

            const results = await processJson(json, ['$.a.*']);

            expect(results).toHaveLength(2);
        });

        test('$.a (bulk) は配列全体を1アイテムで出力', async () => {
            const json = JSON.stringify({
                a: [1, 2, 3],
            });

            const results = await processJson(json, ['$.a']);

            expect(results).toHaveLength(1);
        });

        test('$.a[*] (incremental) は各配列要素を個別に出力', async () => {
            const json = JSON.stringify({
                a: [1, 2, 3],
            });

            const results = await processJson(json, ['$.a[*]']);

            expect(results).toHaveLength(3);
        });
    });

    describe('配列要素のBulk処理', () => {
        test('配列内の各オブジェクトをBulk処理', async () => {
            const json = JSON.stringify({
                a: [
                    { id: 1, data: { nested: 'value1' } },
                    { id: 2, data: { nested: 'value2' } },
                ],
            });

            const results = await processJson(json, ['$.a[*]']);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                path: '$.a[0]',
                value: { id: 1, data: { nested: 'value1' } },
            });
            expect(results[1]).toEqual({
                path: '$.a[1]',
                value: { id: 2, data: { nested: 'value2' } },
            });
        });
    });

    describe('オブジェクトプロパティのBulk処理', () => {
        test('オブジェクト内の各プロパティをBulk処理', async () => {
            const json = JSON.stringify({
                a: {
                    b: {
                        config1: { host: 'localhost', port: 8080 },
                        config2: { host: 'example.com', port: 443 },
                    },
                },
            });

            const results = await processJson(json, ['$.a.b.*']);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                path: '$.a.b.config1',
                value: { host: 'localhost', port: 8080 },
            });
            expect(results[1]).toEqual({
                path: '$.a.b.config2',
                value: { host: 'example.com', port: 443 },
            });
        });
    });
});
