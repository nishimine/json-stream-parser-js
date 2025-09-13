const { TransformerBase } = require('./transformer-base');
const { JsonObjectKeyTransformer } = require('./json-object-key-transformer');
const { TransformerFactory } = require('../json-transformer-factory');

/**
 * オブジェクトのTransformer
 * RFC 8259準拠のJSONオブジェクトを再帰的にパースします
 * @class JsonObjectTransformer
 * @extends TransformerBase
 */
class JsonObjectTransformer extends TransformerBase {
    /**
     * @param {JsonTransformerBuffer} buffer - 共有バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {Object} [options={}] - オプション設定
     */
    constructor(buffer, controller, options = {}) {
        super(buffer, controller, options);
        /** @type {Object} パース中のオブジェクトデータ */
        this.objectData = {};
        /** @type {TransformerBase|null} 現在処理中の子トランスフォーマー */
        this.currentChildTransformer = null;
        /** @type {boolean} キー待機状態 */
        this.expectingKey = true;
        /** @type {boolean} 値待機状態 */
        this.expectingValue = false;
        /** @type {string|null} 現在のキー */
        this.currentKey = null;
        /** @type {boolean} 開き括弧の消費フラグ */
        this.hasConsumedOpeningBrace = false;
    }

    /**
     * オブジェクトをパース
     * キーと値のペアを順次処理し、ネストしたオブジェクトや配列も再帰的にパースします
     * @throws {Error} 不正なJSON構造の場合（trailing commaなど）
     */
    parse() {
        if (!this.hasConsumedOpeningBrace && this.buffer.peekFirstChar() === '{') {
            this.buffer.consumeChars(1);
            this.hasConsumedOpeningBrace = true;
        }

        while (!this.isComplete) {
            if (this.currentChildTransformer) {
                this.currentChildTransformer.parse();
                if (!this.currentChildTransformer.isDone()) return;

                this._handleChildResult();
                this.currentChildTransformer = null;
                continue;
            }

            this.buffer.consumeWhitespace();
            const nextChar = this.buffer.peekFirstChar();
            if (!nextChar) return;

            if (nextChar === '}') {
                // trailing commaのチェック
                if (this.expectingKey && Object.keys(this.objectData).length > 0) {
                    throw new Error('Trailing comma before closing brace in object');
                }
                this.buffer.consumeChars(1);
                this._setResult(this.objectData);
                return;
            }

            if (nextChar === ',') {
                if (this.expectingKey || this.expectingValue) {
                    throw new Error('Unexpected comma in object');
                }
                this.buffer.consumeChars(1);
                this.expectingKey = true;
                continue;
            }

            if (this.expectingKey && nextChar === '"') {
                this.currentChildTransformer = new JsonObjectKeyTransformer(this.buffer);
                continue;
            }

            if (this.expectingValue) {
                const childPath =
                    this.currentPath === '$'
                        ? `$.${this.currentKey}`
                        : `${this.currentPath}.${this.currentKey}`;
                this.currentChildTransformer = this._createChildTransformer(childPath);
                if (!this.currentChildTransformer) {
                    throw new Error(`Unexpected character in object: '${nextChar}'`);
                }
                continue;
            }

            throw new Error(`Unexpected character in object: '${nextChar}'`);
        }
    }

    /**
     * 子トランスフォーマーの結果を処理
     * キーまたは値として結果を保存します
     * @private
     */
    _handleChildResult() {
        const result = this.currentChildTransformer.getResult();

        if (this.expectingKey) {
            // キーのパース完了（コロンも既に消費済み）
            this.currentKey = result;
            this.expectingKey = false;
            this.expectingValue = true;
        } else if (this.expectingValue) {
            this.objectData[this.currentKey] = result;
            this.currentKey = null;
            this.expectingValue = false;
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

module.exports = { JsonObjectTransformer };
