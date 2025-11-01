/**
 * Consumer Skip Strategy - 不要なデータのスキップ最適化テスト
 * acceptableJsonPathでマッチしない部分を効率的にスキップする機能を検証
 */
const { JsonTransformStream } = require('../../src/json-transform-stream');

describe('Consumer - Skip Strategy Optimization', () => {
    describe('マッチしないオブジェクトのスキップ', () => {
        test('大きなネストオブジェクトを完全スキップ', async () => {
            const jsonData = JSON.stringify({
                target: 'value1',
                other: {
                    nested: {
                        deep: {
                            very: {
                                deep: 'value2',
                            },
                        },
                    },
                },
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

            expect(results).toEqual([{ path: '$.target', value: 'value1' }]);
        });

        test('複雑なネスト構造の一部のみ抽出', async () => {
            const jsonData = JSON.stringify({
                config: {
                    database: {
                        host: 'localhost',
                        port: 5432,
                        credentials: {
                            user: 'admin',
                            password: 'secret',
                        },
                    },
                },
                users: ['Alice', 'Bob', 'Charlie'],
                metadata: {
                    version: '1.0',
                    timestamp: '2024-01-01',
                },
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(jsonData));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.users[*]'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([
                { path: '$.users[0]', value: 'Alice' },
                { path: '$.users[1]', value: 'Bob' },
                { path: '$.users[2]', value: 'Charlie' },
            ]);
        });
    });

    describe('マッチしない配列のスキップ', () => {
        test('大きな配列を完全スキップ', async () => {
            const jsonData = JSON.stringify({
                items: [1, 2, 3],
                largeArray: Array.from({ length: 100 }, (_, i) => ({
                    id: i,
                    name: `item${i}`,
                    data: { nested: { value: i * 2 } },
                })),
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(jsonData));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.items[*]'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([
                { path: '$.items[0]', value: 1 },
                { path: '$.items[1]', value: 2 },
                { path: '$.items[2]', value: 3 },
            ]);
        });
    });

    describe('スキップ戦略のパフォーマンス検証', () => {
        test('大量のスキップ対象データでも高速処理', async () => {
            const largeData = {
                target: 'extract-me',
                skipThis: Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    nested: {
                        deep: {
                            value: `data-${i}`,
                        },
                    },
                })),
            };

            const jsonData = JSON.stringify(largeData);
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

            const startTime = Date.now();
            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }
            const elapsed = Date.now() - startTime;

            expect(results).toEqual([{ path: '$.target', value: 'extract-me' }]);
            expect(elapsed).toBeLessThan(100);
        });
    });

    describe('Bulk処理 vs Skip処理の使い分け', () => {
        test('子孫にマッチがある場合はBulk処理（incremental）', async () => {
            const jsonData = JSON.stringify({
                data: {
                    items: ['a', 'b', 'c'],
                    other: {
                        nested: 'skip-this',
                    },
                },
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(jsonData));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.data.items[*]'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toEqual([
                { path: '$.data.items[0]', value: 'a' },
                { path: '$.data.items[1]', value: 'b' },
                { path: '$.data.items[2]', value: 'c' },
            ]);
        });

        test('マッチがない場合は完全スキップ', async () => {
            const jsonData = JSON.stringify({
                skip: {
                    large: Array.from({ length: 100 }, (_, i) => ({ id: i })),
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
