/**
 * Transformerの基底クラス
 * すべてのJSON値タイプ（文字列、数値、リテラル、オブジェクト、配列）のTransformerの共通基盤
 * @class TransformerBase
 */
class TransformerBase {
    /**
     * @param {JsonTransformerBuffer} buffer - 共有バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {Object} [options={}] - オプション設定
     * @param {string} [options.currentPath='$'] - 現在のJsonPath
     */
    constructor(buffer, controller, options = {}) {
        /** @type {JsonTransformerBuffer} 共有バッファ */
        this.buffer = buffer;
        /** @type {TransformStreamDefaultController} ストリームコントローラー */
        this.controller = controller;
        /** @type {Object} オプション設定 */
        this.options = options;
        /** @type {boolean} パース完了フラグ */
        this.isComplete = false;
        /** @type {*} パース結果 */
        this.result = undefined;
        /** @type {string} 現在のJsonPath */
        this.currentPath = options.currentPath || '$';
    }

    /**
     * パース処理を実行（サブクラスで実装必須）
     * @throws {Error} サブクラスで実装されていない場合
     */
    parse() {
        throw new Error('parse() must be implemented by subclass');
    }

    /**
     * パース結果を取得
     * @returns {*} パース済みの値
     */
    getResult() {
        return this.result;
    }

    /**
     * パース完了状態を確認
     * @returns {boolean} パース完了の場合true
     */
    isDone() {
        return this.isComplete;
    }

    /**
     * パース結果を設定し、プリミティブ値の場合はストリームに出力
     * @protected
     * @param {*} value - パース結果の値
     */
    _setResult(value) {
        this.result = value;
        this.isComplete = true;

        if (this.controller && (value === null || typeof value !== 'object')) {
            this.controller.enqueue({ path: this.currentPath, value });
        }
    }
}

module.exports = { TransformerBase };
