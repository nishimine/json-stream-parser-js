/**
 * JsonObjectKeyParser の単体テスト
 */

const { JsonObjectKeyParser } = require('../../src/parser/json-object-key-parser');
const { createBuffer } = require('./helpers');

describe('JsonObjectKeyParser', () => {
    // ヘルパー関数: キーをパースして結果を返す
    const parseKey = jsonStr => {
        const buffer = createBuffer(jsonStr);
        const parser = new JsonObjectKeyParser(buffer);
        parser.parse();
        return parser;
    };

    describe('基本的なキーのパース', () => {
        const testCases = [
            ['"name":', 'name', '単純なキー'],
            ['"":', '', '空文字列のキー'],
            ['"user name":', 'user name', 'スペースを含むキー'],
            ['"item123":', 'item123', '数字を含むキー'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseKey(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('エスケープシーケンス', () => {
        const testCases = [
            ['"path\\\\to":', 'path\\to', 'バックスラッシュ'],
            ['"say \\"hi\\"":', 'say "hi"', 'ダブルクォート'],
            ['"line1\\nline2":', 'line1\nline2', '改行 (\\n)'],
            ['"col1\\tcol2":', 'col1\tcol2', 'タブ (\\t)'],
            ['"a\\nb\\tc":', 'a\nb\tc', '複数のエスケープシーケンス'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseKey(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('Unicode文字', () => {
        const testCases = [
            ['"名前":', '名前', '日本語キー'],
            ['"😀":', '😀', '絵文字'],
            ['"\\u3042\\u3044\\u3046":', 'あいう', 'Unicodeエスケープ (\\uXXXX)'],
            ['"Hello世界🌍":', 'Hello世界🌍', '混合文字列'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseKey(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('特殊なキー名（オブジェクトでよく使われる）', () => {
        const testCases = [
            ['"user-id":', 'user-id', 'ハイフン'],
            ['"api.endpoint":', 'api.endpoint', 'ドット'],
            ['"_private":', '_private', 'アンダースコア'],
            ['"123abc":', '123abc', '数字で始まる'],
            ['"@#$%":', '@#$%', '記号'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseKey(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('不完全データの処理', () => {
        test('開始ダブルクォートのみ - パース未完了', () => {
            const buffer = createBuffer('"key');
            const parser = new JsonObjectKeyParser(buffer);
            parser.parse();

            expect(parser.isDone()).toBe(false);
        });

        test('部分的なキーに追加データを投入', () => {
            const buffer = createBuffer('"my');
            const parser = new JsonObjectKeyParser(buffer);
            parser.parse();

            expect(parser.isDone()).toBe(false);

            buffer.addChunk(new TextEncoder().encode('Key":'));
            parser.parse();

            expect(parser.isDone()).toBe(true);
            expect(parser.getResult()).toBe('myKey');
        });

        test('エスケープシーケンスが分割される場合', () => {
            const buffer = createBuffer('"test\\');
            const parser = new JsonObjectKeyParser(buffer);
            parser.parse();

            expect(parser.isDone()).toBe(false);

            buffer.addChunk(new TextEncoder().encode('nkey":'));
            parser.parse();

            expect(parser.isDone()).toBe(true);
            expect(parser.getResult()).toBe('test\nkey');
        });
    });

    describe('コロンの検証', () => {
        test('キーの後にコロンがない場合はマッチしない（未完了）', () => {
            const buffer = createBuffer('"key"');
            const parser = new JsonObjectKeyParser(buffer);
            parser.parse();

            expect(parser.isDone()).toBe(false);
        });

        test('キーの後に不正な文字がある場合はマッチしない（未完了）', () => {
            const buffer = createBuffer('"key"x');
            const parser = new JsonObjectKeyParser(buffer);
            parser.parse();

            expect(parser.isDone()).toBe(false);
        });

        const whitespaceTestCases = [
            ['"key" :', 'key', 'スペース'],
            ['"key"\n:', 'key', '改行'],
            ['"key"\t:', 'key', 'タブ'],
        ];

        whitespaceTestCases.forEach(([input, expected, description]) => {
            test(`キーとコロンの間に${description}がある場合`, () => {
                const transformer = parseKey(input);
                expect(transformer.isDone()).toBe(true);
                expect(transformer.getResult()).toBe(expected);
            });
        });
    });
});
