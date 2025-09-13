const { TransformerBase } = require('./transformer-base');

/** @type {RegExp} JSON数値パターン（RFC 8259準拠、整数・小数・指数表記に対応） */
const NUMBER_PATTERN = /^(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)(?=[\s,\}\]])/;

/**
 * 数値のTransformer
 * RFC 8259準拠のJSON数値をパースします（整数、小数、指数表記）
 * @class JsonNumberTransformer
 * @extends TransformerBase
 */
class JsonNumberTransformer extends TransformerBase {
    /**
     * 数値をパース
     * バッファから完全な数値リテラルを読み取り、JavaScriptのnumber型に変換します
     */
    parse() {
        const result = this.buffer.consumeUntilMatch(NUMBER_PATTERN);
        if (!result) return;

        const parsedValue = JSON.parse(result.match[1]);
        this._setResult(parsedValue);
    }
}

module.exports = { JsonNumberTransformer };
