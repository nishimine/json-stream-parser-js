/**
 * JsonTransformer - RFC 8259 準拠性テスト
 */
const { JsonTransformer } = require('../src/index.js');
describe('JsonTransformer - RFC 8259 Compliance', () => {
    // ヘルパー関数: 文字列からReadableStreamを作成
    function createStreamFromString(str) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);

        return new ReadableStream({
            start(controller) {
                controller.enqueue(bytes);
                controller.close();
            },
        });
    }

    // ヘルパー関数: ReadableStreamから全ての値を収集
    async function collectAllValues(stream) {
        const values = [];
        const reader = stream.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                values.push(value);
            }
        } finally {
            reader.releaseLock();
        }

        return values;
    }

    // ヘルパー関数: エラーを期待して実行
    async function expectError(stream) {
        const transformer = new JsonTransformer();
        const resultStream = stream.pipeThrough(transformer);
        const reader = resultStream.getReader();

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

    describe('ホワイトスペース処理', () => {
        test('スペースのみ', async () => {
            const json = '{ "name" : "Alice" , "age" : 30 }';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.name', value: 'Alice' });
            expect(results).toContainEqual({ path: '$.age', value: 30 });
        });

        test('タブとスペースの混在', async () => {
            const json = '{\t"name":\t"Alice",\t"age":\t30\t}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
        });

        test('改行を含むJSON', async () => {
            const json = `{
                "name": "Alice",
                "age": 30
            }`;
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(2);
        });

        test('キャリッジリターンと改行', async () => {
            const json = '{\r\n"name": "Alice"\r\n}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$.name', value: 'Alice' });
        });

        test('前後のホワイトスペース', async () => {
            const json = '   \n\t  {"name": "Alice"}  \n\t  ';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$.name', value: 'Alice' });
        });
    });

    describe('文字列エスケープシーケンス', () => {
        test('基本的なエスケープシーケンス', async () => {
            const json = '{"text": "Hello\\nWorld\\tTest"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0].value).toBe('Hello\nWorld\tTest');
        });

        test('バックスラッシュのエスケープ', async () => {
            const json = '{"path": "C:\\\\Users\\\\Alice"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0].value).toBe('C:\\Users\\Alice');
        });

        test('クォートのエスケープ', async () => {
            const json = '{"quote": "She said \\"Hello\\""}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0].value).toBe('She said "Hello"');
        });

        test('全てのエスケープシーケンス', async () => {
            const json = '{"all": "\\b\\f\\n\\r\\t"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0].value).toBe('\b\f\n\r\t');
        });

        test('Unicodeエスケープシーケンス', async () => {
            const json = '{"unicode": "\\u0048\\u0065\\u006C\\u006C\\u006F"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0].value).toBe('Hello');
        });
    });

    describe('数値形式 - RFC 8259準拠', () => {
        test('整数', async () => {
            const json = '{"values": [0, 42, -100, 123456789]}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.values[0]', value: 0 });
            expect(results).toContainEqual({ path: '$.values[1]', value: 42 });
            expect(results).toContainEqual({
                path: '$.values[2]',
                value: -100,
            });
            expect(results).toContainEqual({
                path: '$.values[3]',
                value: 123456789,
            });
        });

        test('小数', async () => {
            const json = '{"values": [3.14, 0.5, -2.718]}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({
                path: '$.values[0]',
                value: 3.14,
            });
            expect(results).toContainEqual({ path: '$.values[1]', value: 0.5 });
            expect(results).toContainEqual({
                path: '$.values[2]',
                value: -2.718,
            });
        });

        test('指数表記', async () => {
            const json = '{"values": [1e5, 1E5, 1e+5, 1e-5, 2.5e10]}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.values[0]', value: 1e5 });
            expect(results).toContainEqual({ path: '$.values[1]', value: 1e5 });
            expect(results).toContainEqual({ path: '$.values[2]', value: 1e5 });
            expect(results).toContainEqual({
                path: '$.values[3]',
                value: 1e-5,
            });
            expect(results).toContainEqual({
                path: '$.values[4]',
                value: 2.5e10,
            });
        });

        test('ゼロ', async () => {
            const json = '{"values": [0, 0.0, -0]}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.values[0]', value: 0 });
            expect(results).toContainEqual({ path: '$.values[1]', value: 0.0 });
            expect(results).toContainEqual({ path: '$.values[2]', value: -0 });
        });

        test('不正な数値形式 - 先頭ゼロ', async () => {
            const json = '{"value": 01}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('不正な数値形式 - 末尾のドット', async () => {
            const json = '{"value": 1.}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('不正な数値形式 - 先頭のドット', async () => {
            const json = '{"value": .5}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });
    });

    describe('リテラル値', () => {
        test('true', async () => {
            const json = '{"value": true}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$.value', value: true });
        });

        test('false', async () => {
            const json = '{"value": false}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$.value', value: false });
        });

        test('null', async () => {
            const json = '{"value": null}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$.value', value: null });
        });
    });

    describe('BOM処理 - TextDecoderによる自動除去', () => {
        test('UTF-8 BOMは自動的に除去される', async () => {
            // UTF-8 BOM (0xEF 0xBB 0xBF) + JSON
            // TextDecoderがBOMを自動的に除去するため、正常に処理される
            const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
            const jsonBytes = new TextEncoder().encode('{"test": true}');
            const combined = new Uint8Array(bom.length + jsonBytes.length);
            combined.set(bom);
            combined.set(jsonBytes, bom.length);

            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(combined);
                    controller.close();
                },
            });

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            // BOMが除去され、正常にパースされることを確認
            expect(results.length).toBe(1);
            expect(results[0].path).toBe('$.test');
            expect(results[0].value).toBe(true);
        });
    });

    describe('構造の正当性', () => {
        test('空のオブジェクト', async () => {
            const json = '{}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(0);
        });

        test('空の配列', async () => {
            const json = '[]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(0);
        });

        test('単一の文字列値（ルート）', async () => {
            const json = '"Hello World"';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$', value: 'Hello World' });
        });
    });

    describe('UTF-8エンコーディング', () => {
        test('日本語文字列', async () => {
            const json = '{"message": "こんにちは世界"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                path: '$.message',
                value: 'こんにちは世界',
            });
        });

        test('絵文字', async () => {
            const json = '{"emoji": "🎉🚀💻"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$.emoji', value: '🎉🚀💻' });
        });

        test('混在した文字セット', async () => {
            const json = '{"text": "Hello世界🌍"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                path: '$.text',
                value: 'Hello世界🌍',
            });
        });
    });
});
