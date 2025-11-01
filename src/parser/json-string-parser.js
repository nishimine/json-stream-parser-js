const { ParserBase } = require('./parser-base');

/** @type {RegExp} JSON文字列パターン（RFC 8259準拠） */
const STRING_PATTERN = /^("(?:[^"\\]|\\.)*")/;

/**
 * 文字列値のParser
 * RFC 8259準拠のJSON文字列をパースします
 * @class JsonStringParser
 * @extends ParserBase
 */
class JsonStringParser extends ParserBase {
    /**
     * 文字列値をパース
     * バッファから完全な文字列リテラルを読み取り、エスケープシーケンスを展開します
     */
    parse() {
        const result = this.buffer.consumeUntilMatch(STRING_PATTERN);
        if (!result) return;

        const parsedValue = JSON.parse(result.match[1]);
        this._setResult(parsedValue);
    }
}

module.exports = { JsonStringParser };
