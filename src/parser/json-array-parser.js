const { ParserBase } = require('./parser-base');
const { JsonStreamParserError } = require('../json-stream-parser-error');

/**
 * 配列のParser
 * RFC 8259準拠のJSON配列を再帰的にパースします
 * @class JsonArrayParser
 * @extends ParserBase
 */
class JsonArrayParser extends ParserBase {
    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {string} currentPath - 現在のJsonPath
     * @param {JsonPath[]} parsedJsonPaths - パース済みJsonPathインスタンスの配列
     */
    constructor(buffer, controller, currentPath, parsedJsonPaths) {
        super(buffer, controller, currentPath, parsedJsonPaths);
        /** @type {Array<*>} パース中の配列データ */
        this.arrayData = [];
        /** @type {ParserBase|null} 現在処理中の子parser */
        this.currentChildParser = null;
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
            if (this.currentChildParser) {
                // ParserとConsumerで処理を実行
                ParserBase.executeStep(this.currentChildParser);
                if (!this.currentChildParser.isDone()) return;

                // Parserの場合のみ結果を取得（Consumerの場合はundefined）
                const result = this.currentChildParser.getResult
                    ? this.currentChildParser.getResult()
                    : undefined;
                this.arrayData.push(result);
                this.currentChildParser = null;
                this.expectingValue = false;
                continue;
            }

            this.buffer.consumeWhitespace();
            const nextChar = this.buffer.peekFirstChar();
            if (!nextChar) return;

            if (nextChar === ']') {
                // trailing commaのチェック
                if (this.expectingValue && this.arrayData.length > 0) {
                    throw new JsonStreamParserError(
                        `Trailing comma before closing bracket in array at ${this.currentPath}. Remove the comma after the last element.`
                    );
                }
                this.buffer.consumeChars(1);
                this._setResult(this.arrayData);
                return;
            }

            if (nextChar === ',') {
                if (this.expectingValue) {
                    throw new JsonStreamParserError(
                        `Unexpected comma at ${this.currentPath}. Expected a value before the comma.`
                    );
                }
                this.buffer.consumeChars(1);
                this.expectingValue = true;
                continue;
            }

            if (this.expectingValue) {
                const childPath = `${this.currentPath}[${this.currentIndex}]`;
                this.currentChildParser = this._createChildParser(childPath);
                if (!this.currentChildParser) {
                    throw new JsonStreamParserError(
                        `Unexpected character '${nextChar}' at ${childPath}. Expected a valid JSON value (string, number, boolean, null, object, or array).`
                    );
                }
                this.currentIndex++;
                continue;
            }

            throw new JsonStreamParserError(
                `Unexpected character '${nextChar}' at ${this.currentPath}. Expected ',' or ']' after array element.`
            );
        }
    }
}

module.exports = { JsonArrayParser };
