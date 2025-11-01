const { StructureConsumerBase } = require('./structure-consumer-base');

/**
 * 配列をスキップするConsumer
 * 値をキャプチャせず、バッファを消費するのみ
 * ネストした配列やオブジェクトも再帰的にスキップ
 * @class JsonArrayConsumer
 * @extends StructureConsumerBase
 */
class JsonArrayConsumer extends StructureConsumerBase {
    /**
     * コンパイル済み正規表現（文字列外で探すべき文字）
     * @private
     * @static
     */
    static OUTSIDE_STRING_PATTERN = /[\[\]"]/g;

    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     * @param {string} currentPath - 現在のJsonPath
     */
    constructor(buffer, currentPath) {
        super(
            buffer,
            currentPath,
            '[', // openChar
            ']', // closeChar
            JsonArrayConsumer.OUTSIDE_STRING_PATTERN
        );
    }
}

module.exports = { JsonArrayConsumer };
