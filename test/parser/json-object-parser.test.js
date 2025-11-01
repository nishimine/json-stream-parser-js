/**
 * JsonObjectParser の統合テスト
 * JsonTransformStreamを通じてオブジェクトの変換を検証
 */

const { JsonTransformStream } = require('../../src/json-transform-stream');
const { createStreamFromString, collectAllValues } = require('./helpers');

describe.skip('JsonObjectParser (Integration)', () => {
    describe('基本的なオブジェクト構造', () => {
        test('空のオブジェクト', async () => {
            const json = '{}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const _results = await collectAllValues(resultStream);
        });

        test('単一のキー・バリューペア', async () => {
            const json = '{"key": "value"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$.key', value: 'value' });
        });

        test('複数のキー・バリューペア', async () => {
            const json = '{"name": "Alice", "age": 30, "active": true}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.name', value: 'Alice' });
            expect(results).toContainEqual({ path: '$.age', value: 30 });
            expect(results).toContainEqual({ path: '$.active', value: true });
        });

        test('nullを含むオブジェクト', async () => {
            const json = '{"data": null}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$.data', value: null });
        });

        test('様々な型の値を持つオブジェクト', async () => {
            const json = '{"str": "text", "num": 42, "bool": false, "nil": null}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.str', value: 'text' });
            expect(results).toContainEqual({ path: '$.num', value: 42 });
            expect(results).toContainEqual({ path: '$.bool', value: false });
            expect(results).toContainEqual({ path: '$.nil', value: null });
        });
    });

    describe('ネストしたオブジェクト', () => {
        test('1レベルのネスト', async () => {
            const json = '{"user": {"name": "Bob", "age": 25}}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({
                path: '$.user.name',
                value: 'Bob',
            });
            expect(results).toContainEqual({ path: '$.user.age', value: 25 });
        });

        test('深いネスト構造', async () => {
            const json = '{"a": {"b": {"c": {"d": "deep"}}}}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$.a.b.c.d', value: 'deep' });
        });

        test('複数のネストしたオブジェクト', async () => {
            const json = '{"user": {"name": "Alice"}, "address": {"city": "Tokyo"}}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({
                path: '$.user.name',
                value: 'Alice',
            });
            expect(results).toContainEqual({
                path: '$.address.city',
                value: 'Tokyo',
            });
        });

        test('空のネストしたオブジェクト', async () => {
            const json = '{"empty": {}}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const _results = await collectAllValues(resultStream);
        });

        test('空と非空のネストが混在', async () => {
            const json = '{"empty": {}, "data": {"value": 123}}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            // 新しい挙動ではオブジェクト/配列も含まれる
            expect(results).toContainEqual({ path: '$.data.value', value: 123 });
            expect(results).toContainEqual({ path: '$.empty', value: {} });
        });
    });

    describe('配列を含むオブジェクト', () => {
        test('プリミティブ配列を含むオブジェクト', async () => {
            const json = '{"numbers": [1, 2, 3]}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.numbers[0]', value: 1 });
            expect(results).toContainEqual({ path: '$.numbers[1]', value: 2 });
            expect(results).toContainEqual({ path: '$.numbers[2]', value: 3 });
        });

        test('オブジェクト配列を含むオブジェクト', async () => {
            const json = '{"users": [{"name": "Alice"}, {"name": "Bob"}]}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({
                path: '$.users[0].name',
                value: 'Alice',
            });
            expect(results).toContainEqual({
                path: '$.users[1].name',
                value: 'Bob',
            });
        });

        test('空配列を含むオブジェクト', async () => {
            const json = '{"items": []}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const _results = await collectAllValues(resultStream);
        });

        test('複数の配列を含むオブジェクト', async () => {
            const json = '{"nums": [1, 2], "strs": ["a", "b"]}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.nums[0]', value: 1 });
            expect(results).toContainEqual({ path: '$.nums[1]', value: 2 });
            expect(results).toContainEqual({ path: '$.strs[0]', value: 'a' });
            expect(results).toContainEqual({ path: '$.strs[1]', value: 'b' });
        });
    });

    describe('ホワイトスペース処理', () => {
        test('整形されたJSON', async () => {
            const json = `{
        "name": "Alice",
        "age": 30
      }`;
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.name', value: 'Alice' });
            expect(results).toContainEqual({ path: '$.age', value: 30 });
        });

        test('余分なスペースを含むJSON', async () => {
            const json = '{  "key"  :  "value"  }';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$.key', value: 'value' });
        });

        test('改行とタブを含むJSON', async () => {
            const json = '{\n\t"key":\n\t"value"\n}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$.key', value: 'value' });
        });
    });

    describe('特殊なキー名', () => {
        test('ハイフンを含むキー', async () => {
            const json = '{"user-name": "Alice"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$.user-name', value: 'Alice' });
        });

        test('ドットを含むキー', async () => {
            const json = '{"user.email": "alice@example.com"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({
                path: '$.user.email',
                value: 'alice@example.com',
            });
        });

        test('アンダースコアを含むキー', async () => {
            const json = '{"first_name": "Alice"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({
                path: '$.first_name',
                value: 'Alice',
            });
        });

        test('数字を含むキー', async () => {
            const json = '{"user123": "Alice"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$.user123', value: 'Alice' });
        });

        test('Unicode文字を含むキー', async () => {
            const json = '{"名前": "太郎"}';
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results[0]).toEqual({ path: '$.名前', value: '太郎' });
        });
    });

    describe('実践的なユースケース', () => {
        test('ユーザープロファイル', async () => {
            const json = JSON.stringify({
                id: 12345,
                username: 'alice_dev',
                email: 'alice@example.com',
                verified: true,
                profile: {
                    firstName: 'Alice',
                    lastName: 'Smith',
                    age: 30,
                },
            });
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.id', value: 12345 });
            expect(results).toContainEqual({
                path: '$.username',
                value: 'alice_dev',
            });
            expect(results).toContainEqual({
                path: '$.email',
                value: 'alice@example.com',
            });
            expect(results).toContainEqual({ path: '$.verified', value: true });
            expect(results).toContainEqual({
                path: '$.profile.firstName',
                value: 'Alice',
            });
            expect(results).toContainEqual({
                path: '$.profile.lastName',
                value: 'Smith',
            });
            expect(results).toContainEqual({
                path: '$.profile.age',
                value: 30,
            });
        });

        test('APIレスポンス形式', async () => {
            const json = JSON.stringify({
                status: 200,
                success: true,
                data: {
                    message: 'OK',
                    count: 5,
                },
            });
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.status', value: 200 });
            expect(results).toContainEqual({ path: '$.success', value: true });
            expect(results).toContainEqual({
                path: '$.data.message',
                value: 'OK',
            });
            expect(results).toContainEqual({ path: '$.data.count', value: 5 });
        });

        test('設定オブジェクト', async () => {
            const json = JSON.stringify({
                debug: false,
                timeout: 3000,
                retry: {
                    enabled: true,
                    maxAttempts: 3,
                    delay: 1000,
                },
            });
            const stream = createStreamFromString(json);

            const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.**'] });
            const resultStream = stream.pipeThrough(transformer);
            const results = await collectAllValues(resultStream);

            expect(results).toContainEqual({ path: '$.debug', value: false });
            expect(results).toContainEqual({ path: '$.timeout', value: 3000 });
            expect(results).toContainEqual({
                path: '$.retry.enabled',
                value: true,
            });
            expect(results).toContainEqual({
                path: '$.retry.maxAttempts',
                value: 3,
            });
            expect(results).toContainEqual({
                path: '$.retry.delay',
                value: 1000,
            });
        });
    });
});
