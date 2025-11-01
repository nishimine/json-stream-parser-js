/**
 * JsonNumberParser の単体テスト
 */

const { JsonNumberParser } = require('../../src/parser/json-number-parser');
const { createBuffer, createMockController } = require('./helpers');

describe('JsonNumberParser', () => {
    // ヘルパー関数: 数値をパースして結果を返す
    const parseNumber = jsonStr => {
        const buffer = createBuffer(jsonStr);
        const parser = new JsonNumberParser(buffer, null, '$.num');
        parser.parse();
        return parser;
    };

    describe('整数のパース', () => {
        const testCases = [
            ['123 ', 123, '正の整数'],
            ['-456}', -456, '負の整数'],
            ['0,', 0, 'ゼロ'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseNumber(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('小数のパース', () => {
        const testCases = [
            ['3.14,', 3.14, '正の小数'],
            ['-2.5}', -2.5, '負の小数'],
            ['0.123 ', 0.123, 'ゼロから始まる小数'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseNumber(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('指数表記のパース', () => {
        const testCases = [
            ['1e10 ', 1e10, '正の指数（小文字e）'],
            ['2E5,', 2e5, '正の指数（大文字E）'],
            ['1.5e-3}', 1.5e-3, '負の指数'],
            ['3e+2 ', 3e2, '明示的な正の指数'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseNumber(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('様々な数値形式', () => {
        const testCases = [
            ['-0 ', -0, 'マイナスゼロ'],
            ['999999999999999 ', 999999999999999, '大きな整数'],
            ['0.0000001,', 0.0000001, '非常に小さい小数'],
            ['-123.456e-7}', -123.456e-7, '複雑な数値'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(description, () => {
                const parser = parseNumber(input);
                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
            });
        });
    });

    describe('数値後の区切り文字', () => {
        const testCases = [
            ['42,', 42, ','],
            ['3.14}', 3.14, '}'],
            ['100]', 100, ']'],
            ['0 ', 0, ' '],
        ];

        testCases.forEach(([input, expected, delimiter]) => {
            test(`数値後に${delimiter === ' ' ? 'スペース' : delimiter}がある場合`, () => {
                const buffer = createBuffer(input);
                const parser = new JsonNumberParser(buffer, null, '$.num');
                parser.parse();

                expect(parser.isDone()).toBe(true);
                expect(parser.getResult()).toBe(expected);
                expect(buffer.peekFirstChar()).toBe(delimiter);
            });
        });
    });

    describe('controller.enqueue呼び出し', () => {
        test('enqueueが呼ばれることを確認', () => {
            const buffer = createBuffer('42 ');
            const mockController = createMockController();
            const parser = new JsonNumberParser(buffer, mockController, '$.count');

            parser.parse();

            expect(mockController.enqueue).toHaveBeenCalledTimes(1);
            expect(mockController.enqueue).toHaveBeenCalledWith({
                path: '$.count',
                value: 42,
            });
        });

        test('小数でもenqueueが呼ばれる', () => {
            const buffer = createBuffer('3.14,');
            const mockController = createMockController();
            const parser = new JsonNumberParser(buffer, mockController, '$.pi');

            parser.parse();

            expect(mockController.enqueue).toHaveBeenCalledTimes(1);
            expect(mockController.enqueue).toHaveBeenCalledWith({
                path: '$.pi',
                value: 3.14,
            });
        });

        test('controllerが未指定でもエラーにならない', () => {
            const buffer = createBuffer('100 ');
            const parser = new JsonNumberParser(buffer, null, '$.num');

            expect(() => parser.parse()).not.toThrow();
            expect(parser.isDone()).toBe(true);
        });
    });

    describe('不完全データの処理', () => {
        test('数値の一部のみ - パース未完了', () => {
            const buffer = createBuffer('12');
            const parser = new JsonNumberParser(buffer, null, '$.num');
            parser.parse();

            expect(parser.isDone()).toBe(false);
        });

        test('部分的な数値に追加データを投入', () => {
            const buffer = createBuffer('12');
            const parser = new JsonNumberParser(buffer, null, '$.num');
            parser.parse();

            expect(parser.isDone()).toBe(false);

            buffer.addChunk(new TextEncoder().encode('3 '));
            parser.parse();

            expect(parser.isDone()).toBe(true);
            expect(parser.getResult()).toBe(123);
        });

        test('指数表記が分割される場合', () => {
            const buffer = createBuffer('1.5e');
            const parser = new JsonNumberParser(buffer, null, '$.num');
            parser.parse();

            expect(parser.isDone()).toBe(false);

            buffer.addChunk(new TextEncoder().encode('-3,'));
            parser.parse();

            expect(parser.isDone()).toBe(true);
            expect(parser.getResult()).toBe(1.5e-3);
        });
    });
});
