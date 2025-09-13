const { TransformerBase } = require('./transformer-base');
const { TransformerFactory } = require('../json-transformer-factory');

/**
 * 配列のTransformer
 * RFC 8259準拠のJSON配列を再帰的にパースします
 * @class JsonArrayTransformer
 * @extends TransformerBase
 */
class JsonArrayTransformer extends TransformerBase {
    /**
     * @param {JsonTransformerBuffer} buffer - 共有バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {Object} [options={}] - オプション設定
     */
    constructor(buffer, controller, options = {}) {
        super(buffer, controller, options);
        /** @type {Array<*>} パース中の配列データ */
        this.arrayData = [];
        /** @type {TransformerBase|null} 現在処理中の子トランスフォーマー */
        this.currentChildTransformer = null;
        /** @type {number} 現在のインデックス */
        this.currentIndex = 0;
        /** @type {boolean} 値待機状態 */
        this.expectingValue = true;
        /** @type {boolean} 開き括弧の消費フラグ */
        this.hasConsumedOpeningBracket = false;
    }

    /**
     * 配列をパース
     * 要素を順次処理し、ネストした配列やオブジェクトも再帰的にパースします
     * @throws {Error} 不正なJSON構造の場合（trailing commaなど）
     */
    parse() {
        if (!this.hasConsumedOpeningBracket && this.buffer.peekFirstChar() === '[') {
            this.buffer.consumeChars(1);
            this.hasConsumedOpeningBracket = true;
        }

        while (!this.isComplete) {
            if (this.currentChildTransformer) {
                this.currentChildTransformer.parse();
                if (!this.currentChildTransformer.isDone()) return;

                this.arrayData.push(this.currentChildTransformer.getResult());
                this.currentChildTransformer = null;
                this.expectingValue = false;
                continue;
            }

            this.buffer.consumeWhitespace();
            const nextChar = this.buffer.peekFirstChar();
            if (!nextChar) return;

            if (nextChar === ']') {
                // trailing commaのチェック
                if (this.expectingValue && this.arrayData.length > 0) {
                    throw new Error('Trailing comma before closing bracket in array');
                }
                this.buffer.consumeChars(1);
                this._setResult(this.arrayData);
                return;
            }

            if (nextChar === ',') {
                if (this.expectingValue) throw new Error('Unexpected comma in array');
                this.buffer.consumeChars(1);
                this.expectingValue = true;
                continue;
            }

            if (this.expectingValue) {
                const childPath = `${this.currentPath}[${this.currentIndex}]`;
                this.currentChildTransformer = this._createChildTransformer(childPath);
                if (!this.currentChildTransformer) {
                    throw new Error(`Unexpected character in array: '${nextChar}'`);
                }
                this.currentIndex++;
                continue;
            }

            throw new Error(`Unexpected character in array: '${nextChar}'`);
        }
    }

    /**
     * 子要素用のトランスフォーマーを生成
     * @private
     * @param {string} childPath - 子要素のJsonPath
     * @returns {TransformerBase|null} 生成されたトランスフォーマー
     */
    _createChildTransformer(childPath) {
        const childOptions = { ...this.options, currentPath: childPath };
        return TransformerFactory.create(this.buffer, this.controller, childOptions);
    }
}

module.exports = { JsonArrayTransformer };
