const { ParserBase } = require('./parser-base');
const { JsonObjectKeyParser } = require('./json-object-key-parser');
const { JsonStreamParserError } = require('../json-stream-parser-error');

/**
 * オブジェクトのParser
 * RFC 8259準拠のJSONオブジェクトを再帰的にパースします
 * @class JsonObjectParser
 * @extends ParserBase
 */
class JsonObjectParser extends ParserBase {
    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {string} currentPath - 現在のJsonPath
     * @param {JsonPath[]} parsedJsonPaths - パース済みJsonPathインスタンスの配列
     */
    constructor(buffer, controller, currentPath, parsedJsonPaths) {
        super(buffer, controller, currentPath, parsedJsonPaths);
        /** @type {Object} パース中のオブジェクトデータ */
        this.objectData = {};
        /** @type {ParserBase|null} 現在処理中の子parser */
        this.currentChildParser = null;
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
            if (this.currentChildParser) {
                if (!this._processChildParser()) return;
                continue;
            }

            this.buffer.consumeWhitespace();
            const nextChar = this.buffer.peekFirstChar();
            if (!nextChar) return;

            if (!this._handleNextCharacter(nextChar)) {
                return;
            }
        }
    }

    /**
     * 子parserまたはコンシューマーを処理
     * @private
     * @returns {boolean} 処理を継続する場合true、データ不足の場合false
     */
    _processChildParser() {
        // ParserとConsumerで処理を実行
        ParserBase.executeStep(this.currentChildParser);
        if (!this.currentChildParser.isDone()) return false;

        this._handleChildResult();
        this.currentChildParser = null;
        return true;
    }

    /**
     * 次の文字を処理
     * @private
     * @param {string} nextChar - 次の文字
     * @returns {boolean} 処理を継続する場合true、完了の場合false
     * @throws {JsonStreamParserError} 不正なJSON構造の場合
     */
    _handleNextCharacter(nextChar) {
        if (nextChar === '}') {
            return this._handleClosingBrace();
        }

        if (nextChar === ',') {
            this._handleComma();
            return true;
        }

        if (this.expectingKey && nextChar === '"') {
            this.currentChildParser = new JsonObjectKeyParser(this.buffer);
            return true;
        }

        if (this.expectingValue) {
            this._handleValueStart(nextChar);
            return true;
        }

        throw new JsonStreamParserError(
            `Unexpected character '${nextChar}' at ${this.currentPath}. Expected a property key (string in quotes) or '}'.`
        );
    }

    /**
     * 閉じ括弧を処理
     * @private
     * @returns {boolean} 常にfalse（パース完了）
     * @throws {JsonStreamParserError} trailing commaの場合
     */
    _handleClosingBrace() {
        // trailing commaのチェック
        if (this.expectingKey && Object.keys(this.objectData).length > 0) {
            throw new JsonStreamParserError(
                `Trailing comma before closing brace in object at ${this.currentPath}. Remove the comma after the last property.`
            );
        }
        this.buffer.consumeChars(1);
        this._setResult(this.objectData);
        return false;
    }

    /**
     * カンマを処理
     * @private
     * @throws {JsonStreamParserError} 不正な位置にカンマがある場合
     */
    _handleComma() {
        if (this.expectingKey || this.expectingValue) {
            throw new JsonStreamParserError(
                `Unexpected comma at ${this.currentPath}. Expected a key-value pair before the comma.`
            );
        }
        this.buffer.consumeChars(1);
        this.expectingKey = true;
    }

    /**
     * 値の開始を処理
     * @private
     * @param {string} nextChar - 次の文字
     * @throws {JsonStreamParserError} 不正な値の開始文字の場合
     */
    _handleValueStart(nextChar) {
        const childPath =
            this.currentPath === '$'
                ? `$.${this.currentKey}`
                : `${this.currentPath}.${this.currentKey}`;
        this.currentChildParser = this._createChildParser(childPath);
        if (!this.currentChildParser) {
            throw new JsonStreamParserError(
                `Unexpected character '${nextChar}' for property '${this.currentKey}' at ${this.currentPath}. Expected a valid JSON value (string, number, boolean, null, object, or array).`
            );
        }
    }

    /**
     * 子parserまたはコンシューマーの結果を処理
     * キーまたは値として結果を保存します
     * @private
     */
    _handleChildResult() {
        // Parserの場合のみ結果を取得（Consumerの場合はundefined）
        const result = this.currentChildParser.getResult
            ? this.currentChildParser.getResult()
            : undefined;

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
}

module.exports = { JsonObjectParser };
