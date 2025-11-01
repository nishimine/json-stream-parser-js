const { ConsumerBase } = require('./consumer-base');

/**
 * 構造型（配列・オブジェクト）Consumerの共通基底クラス
 * 値をキャプチャせず、バッファを消費するのみ
 * ネストした構造も再帰的にスキップ
 * @class StructureConsumerBase
 * @extends ConsumerBase
 */
class StructureConsumerBase extends ConsumerBase {
    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     * @param {string} currentPath - 現在のJsonPath
     * @param {string} openChar - 開き括弧文字（'{'または'['）
     * @param {string} closeChar - 閉じ括弧文字（'}'または']'）
     * @param {RegExp} outsideStringPattern - 文字列外で探すべき文字パターン
     */
    constructor(buffer, currentPath, openChar, closeChar, outsideStringPattern) {
        super(buffer, currentPath);
        /** @type {string} 開き括弧文字 */
        this.openChar = openChar;
        /** @type {string} 閉じ括弧文字 */
        this.closeChar = closeChar;
        /** @type {RegExp} 文字列外で探すべき文字パターン */
        this.outsideStringPattern = outsideStringPattern;
        /** @type {number} 括弧のネスト深度 */
        this.depth = 0;
        /** @type {number} 前回までに確認した位置 */
        this.scannedPosition = 0;
        /** @type {boolean} 文字列リテラル内かどうか */
        this.inString = false;
    }

    /**
     * 構造全体をスキップ
     * @returns {boolean} true=成功、false=データ不足
     */
    skip() {
        // 完了済みの場合は何もしない
        if (this.isComplete) {
            return true;
        }

        // 初回呼び出し時の処理
        if (this.depth === 0) {
            if (this.buffer.peekFirstChar() !== this.openChar) {
                return false; // データ不足
            }

            // 開き括弧を消費
            this.buffer.consumeChars(1);
            this.depth = 1; // 開き括弧を消費済みなので1から開始
            this.scannedPosition = 0;
        }

        // 前回の続きから対応する閉じ括弧を探す
        const found = this._findMatchingBracketIncremental();

        if (!found) {
            // データ不足（まだストリームにデータが来ていない）
            return false;
        }

        // 閉じ括弧まで消費
        this.buffer.consumeChars(found.length + 1); // +1 for closing bracket

        // スキップ完了
        this.isComplete = true;
        return true;
    }

    /**
     * 対応する閉じ括弧を探す
     * @private
     * @returns {{length: number}|null} 閉じ括弧までの長さ、またはnull（データ不足）
     */
    _findMatchingBracketIncremental() {
        const str = this.buffer.getBuffer();
        let pos = this.scannedPosition;

        while (pos < str.length && this.depth > 0) {
            if (this.inString) {
                const quotePos = str.indexOf('"', pos);

                if (quotePos === -1) {
                    pos = str.length;
                    break;
                }

                let backslashCount = 0;
                let checkPos = quotePos - 1;
                while (checkPos >= pos && str[checkPos] === '\\') {
                    backslashCount++;
                    checkPos--;
                }

                if (backslashCount % 2 === 1) {
                    pos = quotePos + 1;
                    continue;
                }

                this.inString = false;
                pos = quotePos + 1;
            } else {
                this.outsideStringPattern.lastIndex = pos;
                const match = this.outsideStringPattern.exec(str);

                if (!match) {
                    pos = str.length;
                    break;
                }

                const char = match[0];
                pos = match.index;

                if (char === '"') {
                    this.inString = true;
                    pos++;
                } else if (char === this.openChar) {
                    this.depth++;
                    pos++;
                } else if (char === this.closeChar) {
                    this.depth--;
                    if (this.depth === 0) {
                        return { length: pos };
                    }
                    pos++;
                }
            }
        }

        this.scannedPosition = pos;
        return null;
    }
}

module.exports = { StructureConsumerBase };
