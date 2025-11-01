/**
 * JsonStringParser の単体テスト
 */

const { JsonStringParser } = require('../../src/parser/json-string-parser');
const { createBuffer, createMockController } = require('./helpers');

describe('JsonStringParser', () => {
    // ヘルパー関数: 文字列をパースして結果を返す
    const parseString = jsonStr => {
        const buffer = createBuffer(jsonStr);
        const parser = new JsonStringParser(buffer, null, '$.test');
        parser.parse();
        return parser;
    };

    describe('基本的な文字列パース', () => {
        const testCases = [
            ['"hello"', 'hello', '単純な文字列'],
            ['""', '', '空文字列'],
            ['"hello world"', 'hello world', 'スペースを含む文字列'],
            ['"abc123xyz"', 'abc123xyz', '数字を含む文字列'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseString(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('エスケープシーケンス', () => {
        const testCases = [
            ['"path\\\\to\\\\file"', 'path\\to\\file', 'バックスラッシュ'],
            ['"say \\"hello\\""', 'say "hello"', 'ダブルクォート'],
            ['"line1\\nline2"', 'line1\nline2', '改行 (\\n)'],
            ['"col1\\tcol2"', 'col1\tcol2', 'タブ (\\t)'],
            ['"text\\rmore"', 'text\rmore', 'キャリッジリターン (\\r)'],
            ['"page1\\fpage2"', 'page1\fpage2', 'フォームフィード (\\f)'],
            ['"text\\bmore"', 'text\bmore', 'バックスペース (\\b)'],
            ['"http:\\/\\/example.com"', 'http://example.com', 'スラッシュ (\\/)'],
            ['"Hello\\nWorld\\t\\"Test\\""', 'Hello\nWorld\t"Test"', '複数のエスケープ'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseString(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('Unicode文字', () => {
        const testCases = [
            ['"こんにちは"', 'こんにちは', '日本語'],
            ['"😀🎉"', '😀🎉', '絵文字'],
            ['"\\u3042\\u3044\\u3046"', 'あいう', 'Unicodeエスケープ (\\uXXXX)'],
            ['"\\uD83D\\uDE00"', '😀', 'サロゲートペア'],
            ['"Hello世界🌍"', 'Hello世界🌍', '混合文字列'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseString(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('文字列パターン', () => {
        const testCases = [
            ['"a-b_c.d"', 'a-b_c.d', 'ハイフン・アンダースコア・ドット'],
            ['"123abc"', '123abc', '数字で始まる'],
            ['"!@#$%^&*()"', '!@#$%^&*()', '記号を含む'],
            ['""', '', 'ゼロ長文字列'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseString(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('文字列後の区切り文字', () => {
        const testCases = [
            ['"value",', 'value', ','],
            ['"value"}', 'value', '}'],
            ['"value"]', 'value', ']'],
        ];

        testCases.forEach(([input, expected, delimiter]) => {
            test(`文字列後に${delimiter}がある場合`, () => {
                const buffer = createBuffer(input);
                const parser = new JsonStringParser(buffer, null, '$.test');
                parser.parse();

                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
                expect(buffer.peekFirstChar()).toBe(delimiter);
            });
        });
    });

    describe('controller.enqueue呼び出し', () => {
        test('enqueueが呼ばれることを確認', () => {
            const buffer = createBuffer('"test value"');
            const mockController = createMockController();
            const parser = new JsonStringParser(buffer, mockController, '$.myKey');

            parser.parse();

            expect(mockController.enqueue).toHaveBeenCalledTimes(1);
            expect(mockController.enqueue).toHaveBeenCalledWith({
                path: '$.myKey',
                value: 'test value',
            });
        });

        test('controllerが未指定でもエラーにならない', () => {
            const buffer = createBuffer('"value"');
            const parser = new JsonStringParser(buffer, null, '$.test');

            expect(() => parser.parse()).not.toThrow();
            expect(parser.isDone()).toBe(true);
        });
    });

    describe('不完全データの処理', () => {
        test('開始ダブルクォートのみ - パース未完了', () => {
            const buffer = createBuffer('"hello');
            const parser = new JsonStringParser(buffer, null, '$.test');
            parser.parse();

            expect(parser.isDone()).toBe(false);
        });

        test('部分的な文字列に追加データを投入', () => {
            const buffer = createBuffer('"hello');
            const parser = new JsonStringParser(buffer, null, '$.test');
            parser.parse();

            expect(parser.isDone()).toBe(false);

            buffer.addChunk(new TextEncoder().encode(' world"'));
            parser.parse();

            expect(parser.isDone()).toBe(true);
            expect(parser.getResult()).toBe('hello world');
        });

        test('エスケープシーケンスが分割される場合', () => {
            const buffer = createBuffer('"test\\');
            const parser = new JsonStringParser(buffer, null, '$.test');
            parser.parse();

            expect(parser.isDone()).toBe(false);

            buffer.addChunk(new TextEncoder().encode('nvalue"'));
            parser.parse();

            expect(parser.isDone()).toBe(true);
            expect(parser.getResult()).toBe('test\nvalue');
        });
    });
});
