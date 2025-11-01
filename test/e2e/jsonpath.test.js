/**
 * JsonPath - 公開APIのJsonPath機能テスト
 */
const { JsonTransformStream } = require('../../src/index.js');
const { createStreamFromString, collectAllValues } = require('./helpers');

describe('JsonPath - Public API', () => {
    describe('エラーハンドリング', () => {
        test('再帰的ワイルドカード (**) はエラー', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            }).toThrow('Recursive wildcard (**) is not supported');
        });

        test('空文字列パターンはエラー', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new JsonTransformStream({ acceptableJsonPath: [''] });
            }).toThrow('JsonPath pattern must be a non-empty string');
        });

        test('null パターンはエラー', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new JsonTransformStream({ acceptableJsonPath: [null] });
            }).toThrow('JsonPath pattern must be a non-empty string');
        });

        test('undefined パターンはエラー', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new JsonTransformStream({ acceptableJsonPath: [undefined] });
            }).toThrow('JsonPath pattern must be a non-empty string');
        });
    });

    describe('ワイルドカードパターン', () => {
        test('ルートレベルのオブジェクトワイルドカード ($.*)', async () => {
            const json = '{"a": 1, "b": 2, "c": 3}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(3);
            expect(results).toContainEqual({ path: '$.a', value: 1 });
            expect(results).toContainEqual({ path: '$.b', value: 2 });
            expect(results).toContainEqual({ path: '$.c', value: 3 });
        });

        test('ネストしたオブジェクトワイルドカード ($.config.*)', async () => {
            const json = '{"config": {"host": "localhost", "port": 8080, "ssl": true}}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.config.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(3);
            expect(results).toContainEqual({ path: '$.config.host', value: 'localhost' });
            expect(results).toContainEqual({ path: '$.config.port', value: 8080 });
            expect(results).toContainEqual({ path: '$.config.ssl', value: true });
        });

        test('ルートレベルの配列ワイルドカード ($[*])', async () => {
            const json = '[1, 2, 3, 4, 5]';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$[*]'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(5);
            expect(results[0]).toEqual({ path: '$[0]', value: 1 });
            expect(results[4]).toEqual({ path: '$[4]', value: 5 });
        });

        test('ネストした配列ワイルドカード ($.items[*])', async () => {
            const json = '{"items": [{"id": 1}, {"id": 2}, {"id": 3}]}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.items[*]'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(3);
            expect(results[0]).toEqual({ path: '$.items[0]', value: { id: 1 } });
            expect(results[1]).toEqual({ path: '$.items[1]', value: { id: 2 } });
            expect(results[2]).toEqual({ path: '$.items[2]', value: { id: 3 } });
        });
    });

    describe('完全一致パターン', () => {
        test('ルートオブジェクト全体を取得 ($)', async () => {
            const json = '{"name": "Alice", "age": 30}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$', value: { name: 'Alice', age: 30 } });
        });

        test('特定のプロパティを取得 ($.name)', async () => {
            const json = '{"name": "Bob", "age": 25, "city": "Tokyo"}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.name'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$.name', value: 'Bob' });
        });

        test('深くネストしたプロパティを取得 ($.user.profile.name)', async () => {
            const json =
                '{"user": {"profile": {"name": "Charlie", "email": "charlie@example.com"}}}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.user.profile.name'],
            });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ path: '$.user.profile.name', value: 'Charlie' });
        });
    });

    describe('複数パターンの組み合わせ', () => {
        test('完全一致とワイルドカードの組み合わせ', async () => {
            const json =
                '{"id": 123, "config": {"host": "localhost", "port": 8080}, "tags": ["a", "b"]}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.id', '$.config.*', '$.tags[*]'],
            });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results.length).toBeGreaterThan(3);
            expect(results).toContainEqual({ path: '$.id', value: 123 });
            expect(results).toContainEqual({ path: '$.config.host', value: 'localhost' });
            expect(results).toContainEqual({ path: '$.config.port', value: 8080 });
            expect(results).toContainEqual({ path: '$.tags[0]', value: 'a' });
            expect(results).toContainEqual({ path: '$.tags[1]', value: 'b' });
        });

        test('複数の異なる階層のパターン', async () => {
            const json = JSON.stringify({
                top: 'value1',
                nested: {
                    middle: 'value2',
                    deep: {
                        bottom: 'value3',
                    },
                },
            });
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.top', '$.nested.middle', '$.nested.deep.bottom'],
            });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(3);
            expect(results).toContainEqual({ path: '$.top', value: 'value1' });
            expect(results).toContainEqual({ path: '$.nested.middle', value: 'value2' });
            expect(results).toContainEqual({ path: '$.nested.deep.bottom', value: 'value3' });
        });
    });

    describe('特殊なプロパティ名', () => {
        test('ハイフンを含むプロパティ名', async () => {
            const json = '{"user-name": "Alice", "user-id": 123}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.user-name', '$.user-id'],
            });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.user-name', value: 'Alice' });
            expect(results).toContainEqual({ path: '$.user-id', value: 123 });
        });

        test('ドットを含むプロパティ名', async () => {
            const json = '{"user.name": "Bob", "config.host": "localhost"}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.user.name', '$.config.host'],
            });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.user.name', value: 'Bob' });
            expect(results).toContainEqual({ path: '$.config.host', value: 'localhost' });
        });

        test('数字で始まるプロパティ名', async () => {
            const json = '{"123key": "value1", "456": "value2"}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.123key', '$.456'],
            });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(2);
            expect(results).toContainEqual({ path: '$.123key', value: 'value1' });
            expect(results).toContainEqual({ path: '$.456', value: 'value2' });
        });
    });

    describe('空の構造', () => {
        test('空のオブジェクトでワイルドカード', async () => {
            const json = '{}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(0);
        });

        test('空の配列でワイルドカード', async () => {
            const json = '[]';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$[*]'] });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(0);
        });

        test('空の構造を含むオブジェクト', async () => {
            const json = '{"empty": {}, "items": [], "value": 123}';
            const stream = createStreamFromString(json);
            const transformer = new JsonTransformStream({
                acceptableJsonPath: ['$.empty', '$.items', '$.value'],
            });
            const results = await collectAllValues(stream.pipeThrough(transformer));

            expect(results).toHaveLength(3);
            expect(results).toContainEqual({ path: '$.empty', value: {} });
            expect(results).toContainEqual({ path: '$.items', value: [] });
            expect(results).toContainEqual({ path: '$.value', value: 123 });
        });
    });
});
