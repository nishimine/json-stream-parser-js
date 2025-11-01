/**
 * エッジケーステスト - 極端な条件下での公開API動作検証
 */
const { JsonTransformStream, JsonStreamParser } = require('../../src/index.js');

describe('Edge Cases - Public API', () => {
    async function parseJSON(json, acceptableJsonPath) {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(json));

        const transformer = new JsonTransformStream({ acceptableJsonPath });
        const results = [];

        const readable = new ReadableStream({
            start(controller) {
                controller.enqueue(data);
                controller.close();
            },
        });

        await readable.pipeThrough(transformer).pipeTo(
            new WritableStream({
                write(chunk) {
                    results.push(chunk);
                },
            })
        );

        return results;
    }

    describe('大規模データ処理（10万要素以上）', () => {
        test('10万要素の配列を処理', async () => {
            const largeArray = Array.from({ length: 100000 }, (_, i) => i);

            const memBefore = process.memoryUsage().heapUsed;
            const gcBefore = global.gc ? (global.gc(), process.memoryUsage().heapUsed) : memBefore;

            const results = await parseJSON(largeArray, ['$[*]']);

            if (global.gc) {
                global.gc();
            }

            const memAfter = process.memoryUsage().heapUsed;

            expect(results).toHaveLength(100000);

            const memIncrease = (memAfter - gcBefore) / 1024 / 1024;
            expect(memIncrease).toBeLessThan(100);
        }, 30000);

        test('10万要素のオブジェクト配列を処理', async () => {
            const largeArray = Array.from({ length: 100000 }, (_, i) => ({
                id: i,
                value: `item${i}`,
            }));

            const memBefore = process.memoryUsage().heapUsed;

            const results = await parseJSON(largeArray, ['$[*]']);

            if (global.gc) {
                global.gc();
            }

            const memAfter = process.memoryUsage().heapUsed;

            expect(results).toHaveLength(100000);
            expect(results[0].value).toHaveProperty('id', 0);

            const memIncrease = (memAfter - memBefore) / 1024 / 1024;
            expect(memIncrease).toBeLessThan(200);
        }, 60000);

        test('ストリーミング処理で大量データを効率的に処理', async () => {
            const largeArray = Array.from({ length: 50000 }, (_, i) => ({
                id: i,
                data: 'x'.repeat(50),
            }));

            const encoder = new TextEncoder();
            const jsonString = JSON.stringify(largeArray);
            const totalSize = jsonString.length;

            const chunkSize = 4096;
            const chunks = [];
            for (let i = 0; i < totalSize; i += chunkSize) {
                chunks.push(encoder.encode(jsonString.slice(i, i + chunkSize)));
            }

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$[*]'] });
            const results = [];

            const memBefore = process.memoryUsage().heapUsed;

            const readable = new ReadableStream({
                async start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(chunk);
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                    controller.close();
                },
            });

            await readable.pipeThrough(transformer).pipeTo(
                new WritableStream({
                    write(chunk) {
                        results.push(chunk);
                    },
                })
            );

            const memAfter = process.memoryUsage().heapUsed;

            expect(results).toHaveLength(50000);

            const memIncrease = (memAfter - memBefore) / 1024 / 1024;
            expect(memIncrease).toBeLessThan(150);
        }, 60000);
    });

    describe('マルチバイト文字のチャンク境界分割', () => {
        test('日本語文字がチャンク境界で分割', async () => {
            const text = '{"name":"山田太郎"}';
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);

            const chunk1 = bytes.slice(0, 10);
            const chunk2 = bytes.slice(10);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = [];

            const readable = new ReadableStream({
                start(controller) {
                    controller.enqueue(chunk1);
                    controller.enqueue(chunk2);
                    controller.close();
                },
            });

            await readable.pipeThrough(transformer).pipeTo(
                new WritableStream({
                    write(chunk) {
                        results.push(chunk);
                    },
                })
            );

            const nameValue = results.find(r => r.value === '山田太郎');
            expect(nameValue).toBeDefined();
            expect(nameValue.value).toBe('山田太郎');
        });

        test('絵文字（4バイトUTF-8）がチャンク境界で分割', async () => {
            const text = '{"emoji":"😀😁😂"}';
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);

            const chunk1 = bytes.slice(0, 12);
            const chunk2 = bytes.slice(12);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = [];

            const readable = new ReadableStream({
                start(controller) {
                    controller.enqueue(chunk1);
                    controller.enqueue(chunk2);
                    controller.close();
                },
            });

            await readable.pipeThrough(transformer).pipeTo(
                new WritableStream({
                    write(chunk) {
                        results.push(chunk);
                    },
                })
            );

            const emojiValue = results.find(r => r.value === '😀😁😂');
            expect(emojiValue).toBeDefined();
            expect(emojiValue.value).toBe('😀😁😂');
        });

        test('複雑なマルチバイト文字が複数チャンクに分割', async () => {
            const text = '{"text":"Hello世界🌍こんにちは"}';
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);

            const chunks = [];
            for (let i = 0; i < bytes.length; i += 5) {
                chunks.push(bytes.slice(i, i + 5));
            }

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = [];

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
                    write(chunk) {
                        results.push(chunk);
                    },
                })
            );

            const textValue = results.find(r => r.value === 'Hello世界🌍こんにちは');
            expect(textValue).toBeDefined();
            expect(textValue.value).toBe('Hello世界🌍こんにちは');
        });
    });

    describe('エラー後の再利用', () => {
        test('JsonTransformStream - エラー後は新しいインスタンスが必要', async () => {
            const invalidJSON = '{"invalid"';
            const encoder = new TextEncoder();
            const data = encoder.encode(invalidJSON);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });

            const readable = new ReadableStream({
                start(controller) {
                    controller.enqueue(data);
                    controller.close();
                },
            });

            let errorOccurred = false;
            try {
                await readable.pipeThrough(transformer).pipeTo(
                    new WritableStream({
                        write() {},
                    })
                );
            } catch (error) {
                errorOccurred = true;
                expect(error).toBeDefined();
            }

            expect(errorOccurred).toBe(true);

            // 新しいインスタンスは正常に動作
            const validJSON = '{"valid": "data"}';
            const validData = encoder.encode(validJSON);

            const transformer2 = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = [];

            const readable2 = new ReadableStream({
                start(controller) {
                    controller.enqueue(validData);
                    controller.close();
                },
            });

            await readable2.pipeThrough(transformer2).pipeTo(
                new WritableStream({
                    write(chunk) {
                        results.push(chunk);
                    },
                })
            );

            expect(results.length).toBeGreaterThan(0);
            const validValue = results.find(r => r.value === 'data');
            expect(validValue).toBeDefined();
        });

        test('JsonStreamParser - エラー後は新しいインスタンスが必要', async () => {
            const parser = new JsonStreamParser({
                acceptableJsonPath: ['$.*'],
            });

            const values = [];
            parser.onValueParsed = (path, value) => {
                values.push({ path, value });
            };

            const encoder = new TextEncoder();
            const invalidData = encoder.encode('{"invalid"');

            let errorOccurred = false;
            try {
                await parser.enqueue(invalidData);
                await parser.close();
            } catch (error) {
                errorOccurred = true;
                expect(error).toBeDefined();
            }

            expect(errorOccurred).toBe(true);

            // 新しいインスタンスは正常に動作
            const parser2 = new JsonStreamParser({
                acceptableJsonPath: ['$.*'],
            });

            const values2 = [];
            parser2.onValueParsed = (path, value) => {
                values2.push({ path, value });
            };

            const validData = encoder.encode('{"valid": "data"}');

            await parser2.enqueue(validData);
            await parser2.close();

            expect(values2.length).toBeGreaterThan(0);
        });
    });
});
