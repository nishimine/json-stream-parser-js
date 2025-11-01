const { JsonStreamParserError } = require('../json-stream-parser-error');

/**
 * Parserの基底クラス
 * すべてのJSON値タイプ（文字列、数値、リテラル、オブジェクト、配列）のParserの共通基盤
 * @class ParserBase
 */
class ParserBase {
    /**
     * @param {JsonTransformStreamBuffer} buffer - 共有バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {string} currentPath - 現在のJsonPath
     * @param {JsonPath[]} [parsedJsonPaths] - パース済みJsonPathインスタンスの配列（構造型Parserで使用）
     */
    constructor(buffer, controller, currentPath, parsedJsonPaths = null) {
        /** @type {JsonTransformStreamBuffer} 共有バッファ */
        this.buffer = buffer;
        /** @type {TransformStreamDefaultController} ストリームコントローラー */
        this.controller = controller;
        /** @type {string} 現在のJsonPath */
        this.currentPath = currentPath;
        /** @type {JsonPath[]|null} パース済みJsonPathインスタンスの配列（構造型Parserで使用） */
        this.parsedJsonPaths = parsedJsonPaths;
        /** @type {boolean} パース完了フラグ */
        this.isComplete = false;
        /** @type {*} パース結果 */
        this.result = undefined;
    }

    /**
     * パース処理を実行（サブクラスで実装必須）
     * @throws {JsonStreamParserError} サブクラスで実装されていない場合
     */
    parse() {
        throw new JsonStreamParserError('parse() must be implemented by subclass');
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
     * パース結果を設定し、ストリームに出力
     * @protected
     * @param {*} value - パース結果の値
     */
    _setResult(value) {
        this.result = value;
        this.isComplete = true;

        if (this.controller) {
            this.controller.enqueue({ path: this.currentPath, value });
        }
    }

    /**
     * ParserまたはConsumerの処理ステップを実行
     * Consumer（skip()メソッドを持つ）とParser（parse()メソッドを持つ）の
     * 両方に対応した共通ヘルパーメソッド
     * @static
     * @param {ParserBase|ConsumerBase} parserOrConsumer - 処理対象
     */
    static executeStep(parserOrConsumer) {
        if (parserOrConsumer.skip) {
            // Consumer: skip()を呼び出す
            parserOrConsumer.skip();
        } else {
            // Parser: parse()を呼び出す
            parserOrConsumer.parse();
        }
    }

    /**
     * 子要素用のパーサーまたはコンシューマーを生成
     * @protected
     * @param {string} childPath - 子要素のJsonPath
     * @returns {ParserBase|ConsumerBase|null} 生成されたパーサーまたはコンシューマー
     */
    _createChildParser(childPath) {
        const { JsonTransformStream } = require('../json-transform-stream');
        return JsonTransformStream._createParser(
            this.buffer,
            this.controller,
            childPath,
            this.parsedJsonPaths
        );
    }
}

module.exports = { ParserBase };
