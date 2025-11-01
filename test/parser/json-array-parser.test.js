/**
 * JsonArrayParser の統合テスト
 * JsonTransformStreamを通じて配列の変換を検証
 */

const { JsonTransformStream } = require('../../src/json-transform-stream');
const { createStreamFromString, collectAllValues } = require('./helpers');

describe.skip('JsonArrayParser (Integration)', () => {
    describe('基本的な配列構造', () => {
        test('空の配列', async () => {
            const json = '[]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const _results = await collectAllValues(resultStream);
        });

        test('数値配列', async () => {
            const json = '[1, 2, 3]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: 1 });
            expect(results[1]).toEqual({ path: '$[1]', value: 2 });
            expect(results[2]).toEqual({ path: '$[2]', value: 3 });
        });

        test('文字列配列', async () => {
            const json = '["apple", "banana", "cherry"]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: 'apple' });
            expect(results[1]).toEqual({ path: '$[1]', value: 'banana' });
            expect(results[2]).toEqual({ path: '$[2]', value: 'cherry' });
        });

        test('真偽値配列', async () => {
            const json = '[true, false, true]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: true });
            expect(results[1]).toEqual({ path: '$[1]', value: false });
            expect(results[2]).toEqual({ path: '$[2]', value: true });
        });

        test('nullを含む配列', async () => {
            const json = '[1, null, 3]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: 1 });
            expect(results[1]).toEqual({ path: '$[1]', value: null });
            expect(results[2]).toEqual({ path: '$[2]', value: 3 });
        });

        test('混合型の配列', async () => {
            const json = '[42, "text", true, null]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: 42 });
            expect(results[1]).toEqual({ path: '$[1]', value: 'text' });
            expect(results[2]).toEqual({ path: '$[2]', value: true });
            expect(results[3]).toEqual({ path: '$[3]', value: null });
        });

        test('単一要素の配列', async () => {
            const json = '[100]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: 100 });
        });
    });

    describe('ネストした配列', () => {
        test('2次元配列（プリミティブ値）', async () => {
            const json = '[[1, 2], [3, 4]]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$[0][0]', value: 1 });
            expect(results).toContainEqual({ path: '$[0][1]', value: 2 });
            expect(results).toContainEqual({ path: '$[1][0]', value: 3 });
            expect(results).toContainEqual({ path: '$[1][1]', value: 4 });
        });

        test('3次元配列', async () => {
            const json = '[[[1, 2]]]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$[0][0][0]', value: 1 });
            expect(results).toContainEqual({ path: '$[0][0][1]', value: 2 });
        });

        test('空配列を含むネスト', async () => {
            const json = '[[], [1, 2], []]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$[1][0]', value: 1 });
            expect(results).toContainEqual({ path: '$[1][1]', value: 2 });
        });

        test('不規則なネスト配列', async () => {
            const json = '[[1], [2, 3], [4, 5, 6]]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$[0][0]', value: 1 });
            expect(results).toContainEqual({ path: '$[1][0]', value: 2 });
            expect(results).toContainEqual({ path: '$[1][1]', value: 3 });
            expect(results).toContainEqual({ path: '$[2][0]', value: 4 });
            expect(results).toContainEqual({ path: '$[2][1]', value: 5 });
            expect(results).toContainEqual({ path: '$[2][2]', value: 6 });
        });
    });

    describe('オブジェクトを含む配列', () => {
        test('オブジェクトの配列', async () => {
            const json = '[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$[0].id', value: 1 });
            expect(results).toContainEqual({
                path: '$[0].name',
                value: 'Alice',
            });
            expect(results).toContainEqual({ path: '$[1].id', value: 2 });
            expect(results).toContainEqual({ path: '$[1].name', value: 'Bob' });
        });

        test('空オブジェクトを含む配列', async () => {
            const json = '[{}, {"value": 1}]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            // 新しい挙動ではオブジェクト/配列も含まれる: ${}, ${1].value=1, $[0]={}, $[1]={value:1}, $=array
            expect(results).toContainEqual({ path: '$[1].value', value: 1 });
            expect(results).toContainEqual({ path: '$[0]', value: {} });
        });

        test('ネストしたオブジェクトを含む配列', async () => {
            const json = '[{"user": {"name": "Alice"}}, {"user": {"name": "Bob"}}]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({
                path: '$[0].user.name',
                value: 'Alice',
            });
            expect(results).toContainEqual({
                path: '$[1].user.name',
                value: 'Bob',
            });
        });

        test('配列を含むオブジェクトの配列', async () => {
            const json = '[{"tags": ["a", "b"]}, {"tags": ["c"]}]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({
                path: '$[0].tags[0]',
                value: 'a',
            });
            expect(results).toContainEqual({
                path: '$[0].tags[1]',
                value: 'b',
            });
            expect(results).toContainEqual({
                path: '$[1].tags[0]',
                value: 'c',
            });
        });
    });

    describe('ホワイトスペース処理', () => {
        test('整形された配列', async () => {
            const json = `[
        1,
        2,
        3
      ]`;
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: 1 });
            expect(results[1]).toEqual({ path: '$[1]', value: 2 });
            expect(results[2]).toEqual({ path: '$[2]', value: 3 });
        });

        test('余分なスペースを含む配列', async () => {
            const json = '[  1  ,  2  ,  3  ]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: 1 });
            expect(results[1]).toEqual({ path: '$[1]', value: 2 });
            expect(results[2]).toEqual({ path: '$[2]', value: 3 });
        });

        test('改行とタブを含む配列', async () => {
            const json = '[\n\t"a",\n\t"b"\n]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: 'a' });
            expect(results[1]).toEqual({ path: '$[1]', value: 'b' });
        });
    });

    describe('大きな配列', () => {
        test('100要素の配列', async () => {
            const arr = Array.from({ length: 100 }, (_, i) => i);
            const json = JSON.stringify(arr);
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$[0]', value: 0 });
            expect(results[50]).toEqual({ path: '$[50]', value: 50 });
            expect(results[99]).toEqual({ path: '$[99]', value: 99 });
        });

        test('1000要素の数値配列', async () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i);
            const json = JSON.stringify(arr);
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0].path).toBe('$[0]');
            expect(results[999].path).toBe('$[999]');
        });
    });

    describe('実践的なユースケース', () => {
        test('ユーザーリスト', async () => {
            const json = JSON.stringify([
                { id: 1, name: 'Alice', email: 'alice@example.com' },
                { id: 2, name: 'Bob', email: 'bob@example.com' },
                { id: 3, name: 'Charlie', email: 'charlie@example.com' },
            ]);
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$[0].id', value: 1 });
            expect(results).toContainEqual({
                path: '$[0].name',
                value: 'Alice',
            });
            expect(results).toContainEqual({
                path: '$[0].email',
                value: 'alice@example.com',
            });
            expect(results).toContainEqual({ path: '$[1].id', value: 2 });
            expect(results).toContainEqual({
                path: '$[2].name',
                value: 'Charlie',
            });
        });

        test('タグ付きアイテム', async () => {
            const json = JSON.stringify([
                { name: 'Item1', tags: ['new', 'hot'] },
                { name: 'Item2', tags: ['sale'] },
                { name: 'Item3', tags: [] },
            ]);
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({
                path: '$[0].name',
                value: 'Item1',
            });
            expect(results).toContainEqual({
                path: '$[0].tags[0]',
                value: 'new',
            });
            expect(results).toContainEqual({
                path: '$[0].tags[1]',
                value: 'hot',
            });
            expect(results).toContainEqual({
                path: '$[1].name',
                value: 'Item2',
            });
            expect(results).toContainEqual({
                path: '$[1].tags[0]',
                value: 'sale',
            });
            expect(results).toContainEqual({
                path: '$[2].name',
                value: 'Item3',
            });
        });

        test('座標配列', async () => {
            const json = '[[0, 0], [10, 20], [30, 40]]';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$[0][0]', value: 0 });
            expect(results).toContainEqual({ path: '$[0][1]', value: 0 });
            expect(results).toContainEqual({ path: '$[1][0]', value: 10 });
            expect(results).toContainEqual({ path: '$[1][1]', value: 20 });
            expect(results).toContainEqual({ path: '$[2][0]', value: 30 });
            expect(results).toContainEqual({ path: '$[2][1]', value: 40 });
        });
    });
});
