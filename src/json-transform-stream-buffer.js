/**
 * JsonTransformStream内部バッファクラス
 * Uint8Arrayチャンクをデコードして文字列バッファとして管理
 * @class JsonTransformStreamBuffer
 */
class JsonTransformStreamBuffer {
    constructor() {
        /** @type {string} 内部文字列バッファ */
        this.buffer = '';
        /** @type {TextDecoder} UTF-8デコーダー */
        this.decoder = new TextDecoder('utf-8', { fatal: false });
        /** @type {number} 消費された文字数の累積 */
        this.consumedTotal = 0;
    }

    /**
     * Uint8Arrayチャンクをバッファに追加
     * @param {Uint8Array} chunk - 追加するデータチャンク
     * @throws {Error} Uint8Array以外が渡された場合
     */
    addChunk(chunk) {
        if (!chunk || chunk.length === 0) return;

        if (!(chunk instanceof Uint8Array)) {
            throw new Error('Invalid input: data chunk must be a Uint8Array');
        }

        this.buffer += this.decoder.decode(chunk, { stream: true });
    }

    /**
     * バッファを変更せずに最初の文字を参照
     * @returns {string|null} 最初の文字、またはバッファが空の場合null
     */
    peekFirstChar() {
        return this.buffer.length > 0 ? this.buffer[0] : null;
    }

    /**
     * バッファを変更せずに正規表現マッチ結果を取得
     * @param {RegExp} regex - マッチさせる正規表現
     * @returns {RegExpMatchArray|null} マッチ結果、またはnull
     */
    peekMatch(regex) {
        return this.buffer.match(regex);
    }

    /**
     * 指定された文字数をバッファから消費
     * @param {number} length - 消費する文字数
     * @returns {string} 消費された文字列
     */
    consumeChars(length) {
        const consumed = this.buffer.substring(0, length);
        this.consumedTotal += length;
        this.buffer = this.buffer.substring(length);
        return consumed;
    }

    /**
     * RFC 8259準拠: バッファの先頭から空白文字を消費
     * JSON仕様では多くの構文要素の前後にホワイトスペースが許可される
     * @returns {string} 消費された空白文字列
     */
    consumeWhitespace() {
        const match = this.buffer.match(/^\s+/);
        if (match) {
            const length = match[0].length;
            const consumed = this.buffer.substring(0, length);
            this.consumedTotal += length;
            this.buffer = this.buffer.substring(length);
            return consumed;
        }
        return '';
    }

    /**
     * 正規表現にマッチする位置までバッファを消費し、テキストとマッチ情報を返す
     * マッチ部分も含めて消費する
     * @param {RegExp} regex - マッチさせる正規表現
     * @returns {{text: string, match: RegExpMatchArray}|null} 消費されたテキストとマッチ情報、またはnull
     */
    consumeUntilMatch(regex) {
        const match = this.buffer.match(regex);
        if (!match) return null;

        const consumeLength = match.index + match[0].length;
        const consumedText = this.buffer.substring(0, consumeLength);

        this.consumedTotal += consumeLength;
        this.buffer = this.buffer.substring(consumeLength);

        return { text: consumedText, match };
    }

    /**
     * 内部バッファの文字列を取得
     * @returns {string} 内部バッファの文字列
     */
    getBuffer() {
        return this.buffer;
    }
}

module.exports = { JsonTransformStreamBuffer };
