/**
 * JsonTransformerBuffer - 単体テスト
 */

const { JsonTransformerBuffer } = require('../src/json-transformer-buffer.js');

describe('JsonTransformerBuffer', () => {
    describe('基本機能', () => {
        test('Uint8Arrayチャンクの追加', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();
            const chunk = encoder.encode('Hello');

            buffer.addChunk(chunk);

            expect(buffer.peekFirstChar()).toBe('H');
        });

        test('複数チャンクの追加', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('Hello'));
            buffer.addChunk(encoder.encode(' '));
            buffer.addChunk(encoder.encode('World'));

            expect(buffer.buffer).toBe('Hello World');
        });

        test('空のチャンクの追加', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode(''));
            buffer.addChunk(new Uint8Array(0));

            expect(buffer.peekFirstChar()).toBeNull();
        });

        test('nullチャンクの追加', () => {
            const buffer = new JsonTransformerBuffer();

            expect(() => buffer.addChunk(null)).not.toThrow();
            expect(buffer.peekFirstChar()).toBeNull();
        });

        test('Uint8Array以外のチャンクはエラー', () => {
            const buffer = new JsonTransformerBuffer();

            expect(() => buffer.addChunk('invalid')).toThrow(/Uint8Array/);
            expect(() => buffer.addChunk([1, 2, 3])).toThrow(/Uint8Array/);
            expect(() => buffer.addChunk({ data: 123 })).toThrow(/Uint8Array/);
        });
    });

    describe('BOM処理', () => {
        test('UTF-8 BOMは自動的に除去される', () => {
            const buffer = new JsonTransformerBuffer();
            const chunk = new Uint8Array([0xef, 0xbb, 0xbf, 0x7b]); // BOM + "{"

            buffer.addChunk(chunk);
            // TextDecoderがBOMを自動的に除去するため、バッファには"{"のみが残る
            expect(buffer.peekFirstChar()).toBe('{');
        });

        test('BOMがない場合は通常通り処理', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();
            const chunk = encoder.encode('{"test": true}');

            buffer.addChunk(chunk);
            expect(buffer.peekFirstChar()).toBe('{');
        });
    });

    describe('peekFirstChar', () => {
        test('バッファの先頭文字を取得', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('ABC'));

            expect(buffer.peekFirstChar()).toBe('A');
            // 再度呼び出しても同じ文字
            expect(buffer.peekFirstChar()).toBe('A');
        });

        test('空のバッファではnull', () => {
            const buffer = new JsonTransformerBuffer();

            expect(buffer.peekFirstChar()).toBeNull();
        });

        test('UTF-8マルチバイト文字', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('日本語'));

            expect(buffer.peekFirstChar()).toBe('日');
        });
    });

    describe('consumeChars', () => {
        test('指定された長さを消費', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('Hello World'));
            buffer.consumeChars(6); // "Hello "を消費

            expect(buffer.peekFirstChar()).toBe('W');
            expect(buffer.buffer).toBe('World');
        });

        test('全体を消費', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('Test'));
            buffer.consumeChars(4);

            expect(buffer.peekFirstChar()).toBeNull();
            expect(buffer.buffer).toBe('');
        });

        test('0文字の消費', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('Test'));
            buffer.consumeChars(0);

            expect(buffer.buffer).toBe('Test');
        });
    });

    describe('consumeUntilMatch', () => {
        test('マッチ部分も含めて消費', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('Hello, World!'));

            const result = buffer.consumeUntilMatch(/,/);

            expect(result).toBeTruthy();
            expect(result.text).toBe('Hello,');
            expect(result.match[0]).toBe(',');
            expect(buffer.buffer).toBe(' World!');
        });

        test('マッチしない場合はnull', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('Hello World'));

            const result = buffer.consumeUntilMatch(/,/);

            expect(result).toBeNull();
            expect(buffer.buffer).toBe('Hello World');
        });

        test('複雑な正規表現でのマッチ', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('{"key": "value"}'));

            const result = buffer.consumeUntilMatch(/:/);

            expect(result.text).toBe('{"key":');
            expect(buffer.buffer).toBe(' "value"}');
        });
    });

    describe('peekMatch', () => {
        test('正規表現のマッチを確認（バッファ非消費）', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('Hello, World!'));

            const match = buffer.peekMatch(/,/);

            expect(match).toBeTruthy();
            expect(match[0]).toBe(',');
            expect(match.index).toBe(5);
            // バッファは変更されない
            expect(buffer.buffer).toBe('Hello, World!');
        });

        test('マッチしない場合はnull', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('Hello World'));

            const match = buffer.peekMatch(/,/);

            expect(match).toBeNull();
        });
    });

    describe('consumeWhitespace & peekFirstChar', () => {
        test('空白をスキップして次の文字を参照', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('   \n\t  {"key": "value"}'));

            // peekFirstCharでは空白が見える
            expect(buffer.peekFirstChar()).toBe(' ');

            // consumeWhitespace後は非空白文字が見える
            buffer.consumeWhitespace();
            const char = buffer.peekFirstChar();

            expect(char).toBe('{');
            expect(buffer.buffer).toBe('{"key": "value"}'); // 空白が消費される
        });

        test('ホワイトスペースがない場合', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('{"key": "value"}'));

            buffer.consumeWhitespace();
            const char = buffer.peekFirstChar();

            expect(char).toBe('{');
            expect(buffer.buffer).toBe('{"key": "value"}');
        });

        test('空のバッファの場合', () => {
            const buffer = new JsonTransformerBuffer();

            buffer.consumeWhitespace();
            const char = buffer.peekFirstChar();

            expect(char).toBeNull();
        });

        test('空白のみの場合', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('   \n\t  '));

            buffer.consumeWhitespace();
            const char = buffer.peekFirstChar();

            expect(char).toBeNull();
        });
    });

    describe('UTF-8エンコーディング', () => {
        test('日本語文字列の処理', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('{"名前": "太郎"}'));

            expect(buffer.peekFirstChar()).toBe('{');
            buffer.consumeChars(1);
            expect(buffer.buffer).toBe('"名前": "太郎"}');
        });

        test('絵文字の処理', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('{"emoji": "😀🎉"}'));

            const result = buffer.consumeUntilMatch(/:/);

            expect(result.text).toBe('{"emoji":');
            expect(buffer.buffer).toContain('😀🎉');
        });

        test('マルチバイト文字を含む抽出', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('こんにちは、世界'));

            const result = buffer.consumeUntilMatch(/、/);

            expect(result.text).toBe('こんにちは、');
            expect(buffer.buffer).toBe('世界');
        });
    });

    describe('ストリーミング処理', () => {
        test('分割されたチャンクの処理', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();
            const text = '{"key": "value"}';

            // 3バイトずつ分割
            for (let i = 0; i < text.length; i += 3) {
                buffer.addChunk(encoder.encode(text.substring(i, i + 3)));
            }

            expect(buffer.buffer).toBe(text);
        });

        test('マルチバイト文字が分割される場合', () => {
            const buffer = new JsonTransformerBuffer();
            const text = '日本語テスト';
            const bytes = new TextEncoder().encode(text);

            // バイト配列を途中で分割（マルチバイト文字の境界を無視）
            const chunk1 = bytes.slice(0, 5);
            const chunk2 = bytes.slice(5);

            buffer.addChunk(chunk1);
            buffer.addChunk(chunk2);

            // TextDecoderのストリームモードにより正しくデコードされる
            expect(buffer.buffer).toBe(text);
        });
    });

    describe('エッジケース', () => {
        test('非常に長い文字列', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();
            const longString = 'a'.repeat(10000);

            buffer.addChunk(encoder.encode(longString));

            expect(buffer.buffer.length).toBe(10000);
            expect(buffer.peekFirstChar()).toBe('a');
        });

        test('連続する正規表現マッチ', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('a,b,c,d'));

            const parts = [];
            while (buffer.peekFirstChar()) {
                const result = buffer.consumeUntilMatch(/,/);
                if (result) {
                    // マッチ部分（カンマ）を除いたテキストを取得
                    parts.push(result.text.slice(0, -1));
                } else {
                    parts.push(buffer.buffer);
                    buffer.consumeChars(buffer.buffer.length);
                }
            }

            expect(parts).toEqual(['a', 'b', 'c', 'd']);
        });

        test('空のパターンマッチ', () => {
            const buffer = new JsonTransformerBuffer();
            const encoder = new TextEncoder();

            buffer.addChunk(encoder.encode('test'));

            const result = buffer.consumeUntilMatch(/^/);

            expect(result.text).toBe('');
            expect(buffer.buffer).toBe('test');
        });
    });
});
