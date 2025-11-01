/**
 * ParserBase の単体テスト
 */

const { ParserBase } = require('../../src/parser/parser-base');

describe('ParserBase', () => {
    describe('基本的な機能', () => {
        test('コンストラクタでbuffer、controller、currentPath、parsedJsonPathsを受け取る', () => {
            const mockBuffer = { test: 'buffer' };
            const mockController = { enqueue: jest.fn() };
            const currentPath = '$.test';
            const parsedJsonPaths = [];

            const parser = new ParserBase(mockBuffer, mockController, currentPath, parsedJsonPaths);

            expect(parser.buffer).toBe(mockBuffer);
            expect(parser.controller).toBe(mockController);
            expect(parser.currentPath).toBe(currentPath);
            expect(parser.parsedJsonPaths).toBe(parsedJsonPaths);
        });

        test('初期状態でisComplete=false、result=undefined', () => {
            const parser = new ParserBase({}, null, '$');

            expect(parser.isComplete).toBe(false);
            expect(parser.isDone()).toBe(false);
            expect(parser.result).toBeUndefined();
            expect(parser.getResult()).toBeUndefined();
        });

        test('currentPathが設定される', () => {
            const parser = new ParserBase({}, null, '$.users[0].name');
            expect(parser.currentPath).toBe('$.users[0].name');
        });

        test('currentPathを指定できる', () => {
            const parser = new ParserBase({}, null, '$.test');
            expect(parser.currentPath).toBe('$.test');
        });

        test('parsedJsonPathsが未指定でもエラーにならない', () => {
            expect(() => new ParserBase({}, null, '$')).not.toThrow();
        });
    });

    describe('parse()メソッド', () => {
        test('parse()は実装されていないのでエラーをスロー', () => {
            const parser = new ParserBase({}, null, '$');
            expect(() => parser.parse()).toThrow('parse() must be implemented by subclass');
        });
    });

    describe('_setResult()メソッド', () => {
        const testCases = [
            ['test value', 'test value', '文字列'],
            [123, 123, '数値'],
            [null, null, 'null'],
            [0, 0, 'ゼロ'],
            [false, false, 'false'],
            ['', '', '空文字列'],
        ];

        testCases.forEach(([input, expected, description]) => {
            test(`${description}を設定`, () => {
                const parser = new ParserBase({}, null, '$');
                parser._setResult(input);

                expect(parser.result).toBe(expected);
                expect(parser.getResult()).toBe(expected);
                expect(parser.isComplete).toBe(true);
                expect(parser.isDone()).toBe(true);
            });
        });
    });

    describe('controller.enqueue呼び出し', () => {
        const primitiveTestCases = [
            ['Alice', '$.name', '文字列'],
            [30, '$.age', '数値'],
            [true, '$.active', '真偽値'],
            [null, '$.data', 'null'],
        ];

        primitiveTestCases.forEach(([value, path, description]) => {
            test(`プリミティブ値(${description})でenqueueが呼ばれる`, () => {
                const mockController = { enqueue: jest.fn() };
                const parser = new ParserBase({}, mockController, path);

                parser._setResult(value);

                expect(mockController.enqueue).toHaveBeenCalledTimes(1);
                expect(mockController.enqueue).toHaveBeenCalledWith({
                    path,
                    value,
                });
            });
        });

        test('オブジェクト値でもenqueueが呼ばれる', () => {
            const mockController = { enqueue: jest.fn() };
            const parser = new ParserBase({}, mockController, '$.user');

            parser._setResult({ name: 'Alice', age: 30 });

            expect(mockController.enqueue).toHaveBeenCalledWith({
                path: '$.user',
                value: { name: 'Alice', age: 30 },
            });
        });

        test('配列値でもenqueueが呼ばれる', () => {
            const mockController = { enqueue: jest.fn() };
            const parser = new ParserBase({}, mockController, '$.items');

            parser._setResult([1, 2, 3]);

            expect(mockController.enqueue).toHaveBeenCalledWith({
                path: '$.items',
                value: [1, 2, 3],
            });
        });

        test('controllerが未指定でもエラーにならない', () => {
            const parser = new ParserBase({}, null, '$.test');
            expect(() => parser._setResult('value')).not.toThrow();
        });
    });

    describe('getResult()とisDone()メソッド', () => {
        test('isDone()とgetResult()が正しく動作', () => {
            const parser = new ParserBase({}, null, '$');

            expect(parser.isDone()).toBe(false);
            expect(parser.getResult()).toBeUndefined();

            parser._setResult('test value');

            expect(parser.isDone()).toBe(true);
            expect(parser.getResult()).toBe('test value');
        });
    });

    describe('複数回の_setResult()呼び出し', () => {
        test('_setResult()を複数回呼ぶと最後の値が設定される', () => {
            const parser = new ParserBase({}, null, '$');

            parser._setResult('first');
            expect(parser.getResult()).toBe('first');
            expect(parser.isDone()).toBe(true);

            parser._setResult('second');
            expect(parser.getResult()).toBe('second');
            expect(parser.isDone()).toBe(true);

            parser._setResult('third');
            expect(parser.getResult()).toBe('third');
            expect(parser.isDone()).toBe(true);
        });
    });
});
