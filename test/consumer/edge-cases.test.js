/**
 * Consumer Edge Cases - Consumer内部クラスのエッジケーステスト
 */
const { JsonTransformStream } = require('../../src/json-transform-stream');

describe('Consumer - Edge Cases', () => {
    describe('複雑なネスト構造のスキップ', () => {
        test('深くネストしたオブジェクトをスキップ', async () => {
            const deepNest = {
                skip: {
                    level1: {
                        level2: {
                            level3: {
                                level4: {
                                    level5: 'deep',
                                },
                            },
                        },
                    },
                },
                target: 'value',
            };

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(JSON.stringify(deepNest)));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.target'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([{ path: '$.target', value: 'value' }]);
        });

        test('深くネストした配列をスキップ', async () => {
            const deepArray = {
                skip: [[[[[['deep']]]]]],
                target: 'value',
            };

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(JSON.stringify(deepArray)));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.target'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([{ path: '$.target', value: 'value' }]);
        });
    });

    describe('文字列内の特殊文字を含むスキップ', () => {
        test('文字列内に括弧を含むオブジェクトをスキップ', async () => {
            const jsonData = JSON.stringify({
                skip: {
                    message: 'This has { and } and [ and ] inside',
                    nested: {
                        more: 'brackets: {[]}',
                    },
                },
                target: 'value',
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(jsonData));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.target'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([{ path: '$.target', value: 'value' }]);
        });

        test('文字列内にエスケープされたダブルクォートを含む', async () => {
            const jsonData = JSON.stringify({
                skip: {
                    quote: 'She said "Hello" to me',
                    escaped: 'Test \\" escaped',
                },
                target: 'value',
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(jsonData));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.target'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([{ path: '$.target', value: 'value' }]);
        });

        test('文字列内に連続するバックスラッシュ', async () => {
            const jsonData = JSON.stringify({
                skip: {
                    path: 'C:\\\\Users\\\\Test\\\\Path',
                    backslash: 'Multiple \\\\ backslashes \\\\\\\\',
                },
                target: 'value',
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(jsonData));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.target'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([{ path: '$.target', value: 'value' }]);
        });
    });

    describe('チャンク分割されたスキップ処理', () => {
        test('構造の途中でチャンクが分割される', async () => {
            const jsonData = JSON.stringify({
                skip: {
                    large: Array.from({ length: 100 }, (_, i) => ({ id: i, data: 'x'.repeat(50) })),
                },
                target: 'value',
            });

            const encoder = new TextEncoder();
            const bytes = encoder.encode(jsonData);

            // 小さなチャンクに分割
            const chunkSize = 100;
            const chunks = [];
            for (let i = 0; i < bytes.length; i += chunkSize) {
                chunks.push(bytes.slice(i, i + chunkSize));
            }

            const stream = new ReadableStream({
                start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(chunk);
                    }
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.target'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([{ path: '$.target', value: 'value' }]);
        });

        test('文字列の途中でチャンクが分割される', async () => {
            const jsonData = JSON.stringify({
                skip: {
                    longString:
                        'This is a very long string that will be split across multiple chunks. '.repeat(
                            10
                        ),
                },
                target: 'value',
            });

            const encoder = new TextEncoder();
            const bytes = encoder.encode(jsonData);

            // 極端に小さなチャンクに分割
            const chunkSize = 10;
            const chunks = [];
            for (let i = 0; i < bytes.length; i += chunkSize) {
                chunks.push(bytes.slice(i, i + chunkSize));
            }

            const stream = new ReadableStream({
                start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(chunk);
                    }
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.target'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([{ path: '$.target', value: 'value' }]);
        });
    });

    describe('混合構造のスキップ', () => {
        test('オブジェクトと配列が混在', async () => {
            const jsonData = JSON.stringify({
                skip: {
                    objects: [{ arrays: [1, 2, 3] }, { nested: { deep: [4, 5, 6] } }],
                    arrays: [
                        [{ a: 1 }, { b: 2 }],
                        [{ c: 3 }, { d: 4 }],
                    ],
                },
                target: 'value',
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(jsonData));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.target'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([{ path: '$.target', value: 'value' }]);
        });
    });
});
