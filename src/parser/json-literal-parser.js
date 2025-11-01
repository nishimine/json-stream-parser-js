const { ParserBase } = require('./parser-base');
const { JsonStreamParserError } = require('../json-stream-parser-error');

/**
 * リテラル値のパターンマップ（RFC 8259準拠）
 * @type {Object.<string, RegExp>}
 */
const LITERAL_PATTERNS = {
    t: /^(true)(?=[\s,\}\]])/,
    f: /^(false)(?=[\s,\}\]])/,
    n: /^(null)(?=[\s,\}\]])/,
};

/**
 * リテラル値（true/false/null）のParser
 * RFC 8259準拠のJSONリテラル値をパースします
 * @class JsonLiteralParser
 * @extends ParserBase
 */
class JsonLiteralParser extends ParserBase {
    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {string} startChar - リテラルの開始文字（'t'/'f'/'n'）
     * @param {string} currentPath - 現在のJsonPath
     */
    constructor(buffer, controller, startChar, currentPath) {
        super(buffer, controller, currentPath);
        /** @type {string} リテラルの開始文字 */
        this.startChar = startChar;
    }

    /**
     * リテラル値をパース
     * バッファから完全なリテラル（true/false/null）を読み取り、対応するJavaScript値に変換します
     * @throws {JsonStreamParserError} 不正なリテラル開始文字の場合
     */
    parse() {
        const pattern = LITERAL_PATTERNS[this.startChar];
        if (!pattern) {
            throw new JsonStreamParserError(`Invalid literal start character: '${this.startChar}'`);
        }

        const result = this.buffer.consumeUntilMatch(pattern);
        if (!result) return;

        const parsedValue = JSON.parse(result.match[1]);
        this._setResult(parsedValue);
    }
}

module.exports = { JsonLiteralParser };
