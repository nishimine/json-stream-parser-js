const { BulkParserBase } = require('./bulk-parser-base');

/**
 * 配列の一括パース用Parser
 * JSON.parseを使用して配列全体を一括処理します
 * @class JsonArrayBulkParser
 * @extends BulkParserBase
 */
class JsonArrayBulkParser extends BulkParserBase {
    /**
     * コンパイル済み正規表現（文字列外で探すべき文字）
     * @private
     * @static
     */
    static OUTSIDE_STRING_PATTERN = /[\[\]"]/g;

    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {string} currentPath - 現在のJsonPath
     */
    constructor(buffer, controller, currentPath) {
        super(
            buffer,
            controller,
            currentPath,
            '[', // openChar
            ']', // closeChar
            JsonArrayBulkParser.OUTSIDE_STRING_PATTERN
        );
    }
}

module.exports = { JsonArrayBulkParser };
