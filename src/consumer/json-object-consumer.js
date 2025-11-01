const { StructureConsumerBase } = require('./structure-consumer-base');

/**
 * オブジェクトをスキップするConsumer
 * 値をキャプチャせず、バッファを消費するのみ
 * ネストしたオブジェクトや配列も再帰的にスキップ
 * @class JsonObjectConsumer
 * @extends StructureConsumerBase
 */
class JsonObjectConsumer extends StructureConsumerBase {
    /**
     * コンパイル済み正規表現（文字列外で探すべき文字）
     * @private
     * @static
     */
    static OUTSIDE_STRING_PATTERN = /[{"}]/g;

    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     * @param {string} currentPath - 現在のJsonPath
     */
    constructor(buffer, currentPath) {
        super(
            buffer,
            currentPath,
            '{', // openChar
            '}', // closeChar
            JsonObjectConsumer.OUTSIDE_STRING_PATTERN
        );
    }
}

module.exports = { JsonObjectConsumer };
