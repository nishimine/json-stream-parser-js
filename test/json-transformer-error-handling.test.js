/**
 * JsonTransformer - エラーハンドリングテスト
 */
const { JsonTransformer } = require('../src/index.js');
describe('JsonTransformer - Error Handling', () => {
    // ヘルパー関数: 文字列からReadableStreamを作成
    function createStreamFromString(str, chunkSize = null) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);

        return new ReadableStream({
            start(controller) {
                if (chunkSize === null) {
                    controller.enqueue(bytes);
                } else {
                    for (let i = 0; i < bytes.length; i += chunkSize) {
                        controller.enqueue(bytes.slice(i, i + chunkSize));
                    }
                }
                controller.close();
            },
        });
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

    describe('構文エラー', () => {
        test('不正なJSONの開始文字', async () => {
            const json = 'invalid';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
            expect(error.message).toMatch(/unexpected/i);
        });

        test('閉じ括弧の不一致 - オブジェクト', async () => {
            const json = '{"name": "Alice"';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
            expect(error.message).toMatch(/incomplete|unexpected/i);
        });

        test('閉じ括弧の不一致 - 配列', async () => {
            const json = '[1, 2, 3';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
            expect(error.message).toMatch(/incomplete|unexpected/i);
        });

        test('余分なカンマ - オブジェクト', async () => {
            const json = '{"name": "Alice",}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
            expect(error.message).toMatch(/trailing comma/i);
        });

        test('余分なカンマ - 配列', async () => {
            const json = '[1, 2,]';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
            expect(error.message).toMatch(/trailing comma/i);
        });

        test('キーにクォートがない', async () => {
            const json = '{name: "Alice"}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('値のクォートが閉じていない', async () => {
            const json = '{"name": "Alice}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });
    });

    describe('数値エラー', () => {
        test('不正な数値形式 - 先頭ゼロ', async () => {
            const json = '{"value": 01234}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('不正な数値形式 - 複数の小数点', async () => {
            const json = '{"value": 3.14.159}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('不正な数値形式 - 不完全な指数表記', async () => {
            const json = '{"value": 1e}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });
    });

    describe('リテラルエラー', () => {
        test('不正なリテラル - tru', async () => {
            const json = '{"value": tru}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('不正なリテラル - fals', async () => {
            const json = '{"value": fals}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('不正なリテラル - nul', async () => {
            const json = '{"value": nul}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('大文字のリテラル - True', async () => {
            const json = '{"value": True}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('大文字のリテラル - NULL', async () => {
            const json = '{"value": NULL}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });
    });

    describe('不完全なJSON', () => {
        test('空のストリーム', async () => {
            const json = '';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
            expect(error.message).toMatch(/incomplete|empty/i);
        });

        test('ホワイトスペースのみ', async () => {
            const json = '   \n\t  ';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
            expect(error.message).toMatch(/incomplete|empty/i);
        });

        test('オブジェクト途中で終了', async () => {
            const json = '{"name": "Alice", "age":';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('配列途中で終了', async () => {
            const json = '[1, 2, 3,';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });
    });

    describe('エスケープシーケンスエラー', () => {
        test('不正なエスケープシーケンス', async () => {
            const json = '{"value": "test\\x"}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });

        test('不完全なUnicodeエスケープ', async () => {
            const json = '{"value": "test\\u12"}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
        });
    });

    describe('ネスト深度', () => {
        test('極端に深いネスト構造', async () => {
            // 1000レベルのネスト
            let json = '';
            for (let i = 0; i < 1000; i++) {
                json += '{"a":';
            }
            json += '1';
            for (let i = 0; i < 1000; i++) {
                json += '}';
            }

            const stream = createStreamFromString(json, 100);
            const transformer = new JsonTransformer();
            const resultStream = stream.pipeThrough(transformer);
            const reader = resultStream.getReader();

            const results = [];
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    results.push(value);
                }
            } finally {
                reader.releaseLock();
            }

            // 深いネストでも正常に処理されることを確認
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('複数のルート値', () => {
        test('複数のルートオブジェクト', async () => {
            const json = '{"a": 1}{"b": 2}';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            // RFC 8259では複数のルート値は許可されない
            expect(error).toBeTruthy();
            expect(error.message).toMatch(/unexpected/i);
        });

        test('複数のルート配列', async () => {
            const json = '[1, 2][3, 4]';
            const stream = createStreamFromString(json);
            const error = await expectError(stream);

            expect(error).toBeTruthy();
            expect(error.message).toMatch(/unexpected/i);
        });
    });
});
