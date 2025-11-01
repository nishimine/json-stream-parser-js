/**
 * BulkParserBase - 一括処理Parser基底クラスのテスト
 */
const { JsonTransformStream } = require('../../src/json-transform-stream');

describe('BulkParserBase - Bulk Processing', () => {
    describe('オブジェクトの一括処理', () => {
        test('完全一致パターンでオブジェクト全体を一括処理', async () => {
            const json = JSON.stringify({
                data: {
                    nested: {
                        deep: {
                            value: 123,
                            text: 'hello',
                        },
                    },
                },
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(json));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.data'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('$.data');
            expect(results[0].value).toEqual({
                nested: {
                    deep: {
                        value: 123,
                        text: 'hello',
                    },
                },
            });
        });

        test('ネストが深いオブジェクトの一括処理', async () => {
            // 10階層のネスト
            let nested = { value: 'deep' };
            for (let i = 0; i < 10; i++) {
                nested = { level: nested };
            }

            const json = JSON.stringify({ data: nested });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(json));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.data'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('$.data');
            expect(results[0].value).toEqual(nested);
        });
    });

    describe('配列の一括処理', () => {
        test('完全一致パターンで配列全体を一括処理', async () => {
            const json = JSON.stringify({
                items: [
                    { id: 1, name: 'Item 1' },
                    { id: 2, name: 'Item 2' },
                    { id: 3, name: 'Item 3' },
                ],
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(json));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.items'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('$.items');
            expect(results[0].value).toEqual([
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
                { id: 3, name: 'Item 3' },
            ]);
        });

        test('大きな配列の一括処理', async () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                value: `item${i}`,
            }));

            const json = JSON.stringify({ items: largeArray });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(json));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.items'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('$.items');
            expect(results[0].value).toHaveLength(1000);
            expect(results[0].value[0]).toEqual({ id: 0, value: 'item0' });
            expect(results[0].value[999]).toEqual({ id: 999, value: 'item999' });
        });
    });

    describe('チャンク分割された一括処理', () => {
        test('小さなチャンクで分割されたオブジェクトを一括処理', async () => {
            const json = JSON.stringify({
                data: {
                    field1: 'value1',
                    field2: 'value2',
                    field3: 'value3',
                },
            });

            const encoder = new TextEncoder();
            const bytes = encoder.encode(json);

            // 10バイトずつのチャンクに分割
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
                acceptableJsonPath: ['$.data'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toHaveLength(1);
            expect(results[0].value).toEqual({
                field1: 'value1',
                field2: 'value2',
                field3: 'value3',
            });
        });

        test('1バイトずつ分割された配列を一括処理', async () => {
            const json = JSON.stringify({
                items: [1, 2, 3, 4, 5],
            });

            const encoder = new TextEncoder();
            const bytes = encoder.encode(json);

            // 1バイトずつのチャンクに分割
            const chunks = Array.from(bytes, byte => new Uint8Array([byte]));

            const stream = new ReadableStream({
                start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(chunk);
                    }
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.items'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toHaveLength(1);
            expect(results[0].value).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('複雑な値の一括処理', () => {
        test('すべてのJSON型を含むオブジェクト', async () => {
            const json = JSON.stringify({
                data: {
                    string: 'text',
                    number: 123,
                    float: 3.14,
                    boolean: true,
                    null: null,
                    array: [1, 2, 3],
                    object: { nested: 'value' },
                },
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(json));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.data'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toHaveLength(1);
            expect(results[0].value).toEqual({
                string: 'text',
                number: 123,
                float: 3.14,
                boolean: true,
                null: null,
                array: [1, 2, 3],
                object: { nested: 'value' },
            });
        });

        test('エスケープシーケンスを含む文字列', async () => {
            const json = JSON.stringify({
                data: {
                    escaped: 'Line1\nLine2\tTabbed',
                    quote: 'She said "Hello"',
                    backslash: 'C:\\Users\\Path',
                },
            });

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(json));
                    controller.close();
                },
            });

            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.data'],
            });

            const results = [];
            const reader = stream.pipeThrough(transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
            }

            expect(results).toHaveLength(1);
            expect(results[0].value.escaped).toBe('Line1\nLine2\tTabbed');
            expect(results[0].value.quote).toBe('She said "Hello"');
            expect(results[0].value.backslash).toBe('C:\\Users\\Path');
        });
    });
});
