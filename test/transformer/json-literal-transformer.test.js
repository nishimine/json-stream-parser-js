/**
 * JsonLiteralTransformer の単体テスト
 */

const { JsonLiteralTransformer } = require('../../src/transformer/json-literal-transformer');
const { createBuffer, createMockController } = require('../helpers');

describe('JsonLiteralTransformer', () => {
    // ヘルパー関数: リテラル値をパースして結果を返す
    const parseLiteral = (jsonStr, startChar) => {
        const buffer = createBuffer(jsonStr);
        const transformer = new JsonLiteralTransformer(buffer, null, startChar, {
            currentPath: '$.flag',
        });
        transformer.parse();
        return transformer;
    };

    describe('true リテラルのパース', () => {
        const testCases = [
            ['true ', 'true'],
            ['true,', 'trueの後にカンマ'],
            ['true}', 'trueの後に閉じ括弧'],
        ];

        testCases.forEach(([input, description]) => {
            test(description, () => {
                const transformer = parseLiteral(input, 't');
                expect(transformer.isDone()).toBe(true);
                expect(transformer.getResult()).toBe(true);
            });
        });
    });

    describe('false リテラルのパース', () => {
        const testCases = [
            ['false ', 'false'],
            ['false,', 'falseの後にカンマ'],
            ['false]', 'falseの後に閉じブラケット'],
        ];

        testCases.forEach(([input, description]) => {
            test(description, () => {
                const transformer = parseLiteral(input, 'f');
                expect(transformer.isDone()).toBe(true);
                expect(transformer.getResult()).toBe(false);
            });
        });
    });

    describe('null リテラルのパース', () => {
        const testCases = [
            ['null ', 'null'],
            ['null,', 'nullの後にカンマ'],
            ['null}', 'nullの後に閉じ括弧'],
        ];

        testCases.forEach(([input, description]) => {
            test(description, () => {
                const transformer = parseLiteral(input, 'n');
                expect(transformer.isDone()).toBe(true);
                expect(transformer.getResult()).toBe(null);
            });
        });
    });

    describe('controller.enqueue呼び出し', () => {
        const testCases = [
            ['true,', 't', true, '$.isActive'],
            ['false}', 'f', false, '$.isDeleted'],
            ['null ', 'n', null, '$.data'],
        ];

        testCases.forEach(([input, startChar, expectedValue, path]) => {
            test(`${expectedValue}でenqueueが呼ばれる`, () => {
                const buffer = createBuffer(input);
                const mockController = createMockController();
                const transformer = new JsonLiteralTransformer(buffer, mockController, startChar, {
                    currentPath: path,
                });

                transformer.parse();

                expect(mockController.enqueue).toHaveBeenCalledTimes(1);
                expect(mockController.enqueue).toHaveBeenCalledWith({
                    path,
                    value: expectedValue,
                });
            });
        });

        test('controllerが未指定でもエラーにならない', () => {
            const buffer = createBuffer('true ');
            const transformer = new JsonLiteralTransformer(buffer, null, 't', {
                currentPath: '$.flag',
            });

            expect(() => transformer.parse()).not.toThrow();
            expect(transformer.isDone()).toBe(true);
        });
    });

    describe('不完全データの処理', () => {
        const testCases = [
            ['tr', 't', null, 'trueの一部'],
            ['fa', 'f', null, 'falseの一部'],
            ['nu', 'n', null, 'nullの一部'],
        ];

        testCases.forEach(([input, startChar, _, description]) => {
            test(`${description} - パース未完了`, () => {
                const buffer = createBuffer(input);
                const transformer = new JsonLiteralTransformer(buffer, null, startChar, {
                    currentPath: '$.test',
                });
                transformer.parse();

                expect(transformer.isDone()).toBe(false);
            });
        });

        test('部分的なリテラルに追加データを投入', () => {
            const buffer = createBuffer('tr');
            const transformer = new JsonLiteralTransformer(buffer, null, 't', {
                currentPath: '$.flag',
            });
            transformer.parse();

            expect(transformer.isDone()).toBe(false);

            buffer.addChunk(new TextEncoder().encode('ue,'));
            transformer.parse();

            expect(transformer.isDone()).toBe(true);
            expect(transformer.getResult()).toBe(true);
        });
    });
});
