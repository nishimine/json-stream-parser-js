const { JsonStreamParserError } = require('../json-stream-parser-error');

/**
 * Consumerの基底クラス
 * 値をスキップする（読み飛ばす）用途に特化したクラス
 * Parserと異なり、値のキャプチャや出力を行わず、バッファを消費するのみ
 * @class ConsumerBase
 */
class ConsumerBase {
    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     * @param {string} currentPath - 現在のJsonPath
     */
    constructor(buffer, currentPath) {
        /** @type {JsonTransformStreamBuffer} 共有バッファ */
        this.buffer = buffer;
        /** @type {string} 現在のJsonPath */
        this.currentPath = currentPath;
        /** @type {boolean} 消費完了フラグ */
        this.isComplete = false;
    }

    /**
     * スキップ処理を実行（サブクラスで実装必須）
     * @throws {JsonStreamParserError} サブクラスで実装されていない場合
     */
    skip() {
        throw new JsonStreamParserError('skip() must be implemented by subclass');
    }

    /**
     * スキップ完了状態を確認
     * @returns {boolean} スキップ完了の場合true
     */
    isDone() {
        return this.isComplete;
    }
}

module.exports = { ConsumerBase };
