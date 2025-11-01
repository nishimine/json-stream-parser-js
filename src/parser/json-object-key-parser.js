/** @type {RegExp} キー文字列 + ホワイトスペース + コロンのパターン */
const KEY_PATTERN = /^("(?:[^"\\]|\\.)*")\s*:/;

/**
 * オブジェクトのキー専用Parser
 * ParserBaseを継承せず、controller.enqueueを呼ばない
 * キー文字列とその後のコロンまでを一括でパースする
 * @class JsonObjectKeyParser
 */
class JsonObjectKeyParser {
    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     */
    constructor(buffer) {
        /** @type {JsonTransformStreamBuffer} 共有バッファ */
        this.buffer = buffer;
        /** @type {boolean} パース完了フラグ */
        this.isComplete = false;
        /** @type {string|undefined} パース結果（キー文字列） */
        this.result = undefined;
    }

    /**
     * キー文字列とコロンをパース
     * バッファから"key":形式を読み取り、キー部分のみを返します
     */
    parse() {
        const result = this.buffer.consumeUntilMatch(KEY_PATTERN);
        if (!result) return;

        // マッチした文字列全体（"key" : など）を消費し、キー部分だけを抽出
        const parsedValue = JSON.parse(result.match[1]);

        this.result = parsedValue;
        this.isComplete = true;
    }

    /**
     * パース結果を取得
     * @returns {string|undefined} パース済みのキー文字列
     */
    getResult() {
        return this.result;
    }

    /**
     * パース完了状態を確認
     * @returns {boolean} パース完了の場合true
     */
    isDone() {
        return this.isComplete;
    }
}

module.exports = { JsonObjectKeyParser };
