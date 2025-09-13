/**
 * TransformerBase の単体テスト
 */

const { TransformerBase } = require('../../src/transformer/transformer-base');

describe('TransformerBase', () => {
    describe('基本的な機能', () => {
        test('コンストラクタでbuffer、controller、optionsを受け取る', () => {
            const mockBuffer = { test: 'buffer' };
            const mockController = { enqueue: jest.fn() };
            const options = { currentPath: '$.test' };

            const transformer = new TransformerBase(mockBuffer, mockController, options);

            expect(transformer.buffer).toBe(mockBuffer);
            expect(transformer.controller).toBe(mockController);
            expect(transformer.options).toBe(options);
        });

        test('初期状態でisComplete=false、result=undefined', () => {
            const transformer = new TransformerBase({}, null);

            expect(transformer.isComplete).toBe(false);
            expect(transformer.isDone()).toBe(false);
            expect(transformer.result).toBeUndefined();
            expect(transformer.getResult()).toBeUndefined();
        });

        test('currentPathがoptionsから設定される', () => {
            const transformer = new TransformerBase({}, null, {
                currentPath: '$.users[0].name',
            });
            expect(transformer.currentPath).toBe('$.users[0].name');
        });

        test('currentPathが未指定の場合はデフォルトで"$"', () => {
            const transformer = new TransformerBase({}, null, {});
            expect(transformer.currentPath).toBe('$');
        });

        test('optionsが未指定でもエラーにならない', () => {
            expect(() => new TransformerBase({})).not.toThrow();
        });
    });

    describe('parse()メソッド', () => {
        test('parse()は実装されていないのでエラーをスロー', () => {
            const transformer = new TransformerBase({});
            expect(() => transformer.parse()).toThrow('parse() must be implemented by subclass');
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
                const transformer = new TransformerBase({});
                transformer._setResult(input);

                expect(transformer.result).toBe(expected);
                expect(transformer.getResult()).toBe(expected);
                expect(transformer.isComplete).toBe(true);
                expect(transformer.isDone()).toBe(true);
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
                const transformer = new TransformerBase({}, mockController, {
                    currentPath: path,
                });

                transformer._setResult(value);

                expect(mockController.enqueue).toHaveBeenCalledTimes(1);
                expect(mockController.enqueue).toHaveBeenCalledWith({
                    path,
                    value,
                });
            });
        });

        test('オブジェクト値ではenqueueが呼ばれない', () => {
            const mockController = { enqueue: jest.fn() };
            const transformer = new TransformerBase({}, mockController, {
                currentPath: '$.user',
            });

            transformer._setResult({ name: 'Alice', age: 30 });

            expect(mockController.enqueue).not.toHaveBeenCalled();
        });

        test('配列値ではenqueueが呼ばれない', () => {
            const mockController = { enqueue: jest.fn() };
            const transformer = new TransformerBase({}, mockController, {
                currentPath: '$.items',
            });

            transformer._setResult([1, 2, 3]);

            expect(mockController.enqueue).not.toHaveBeenCalled();
        });

        test('controllerが未指定でもエラーにならない', () => {
            const transformer = new TransformerBase({}, null, {
                currentPath: '$.test',
            });
            expect(() => transformer._setResult('value')).not.toThrow();
        });
    });

    describe('getResult()とisDone()メソッド', () => {
        test('isDone()とgetResult()が正しく動作', () => {
            const transformer = new TransformerBase({});

            expect(transformer.isDone()).toBe(false);
            expect(transformer.getResult()).toBeUndefined();

            transformer._setResult('test value');

            expect(transformer.isDone()).toBe(true);
            expect(transformer.getResult()).toBe('test value');
        });
    });

    describe('複数回の_setResult()呼び出し', () => {
        test('_setResult()を複数回呼ぶと最後の値が設定される', () => {
            const transformer = new TransformerBase({});

            transformer._setResult('first');
            expect(transformer.getResult()).toBe('first');
            expect(transformer.isDone()).toBe(true);

            transformer._setResult('second');
            expect(transformer.getResult()).toBe('second');
            expect(transformer.isDone()).toBe(true);

            transformer._setResult('third');
            expect(transformer.getResult()).toBe('third');
            expect(transformer.isDone()).toBe(true);
        });
    });
});
