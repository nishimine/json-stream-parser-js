const { JsonTransformerBuffer } = require('./json-transformer-buffer');
const { TransformerFactory } = require('./json-transformer-factory');

/**
 * JSON変換クラス（推奨API）
 * Streams API対応のTransformStreamを継承
 * @class JsonTransformer
 * @extends TransformStream
 */
class JsonTransformer extends TransformStream {
    /**
     * @param {Object} [options={}] - トランスフォーマーオプション
     */
    constructor(options = {}) {
        /** @type {Object} オプション設定 */
        const transformerOptions = options;
        /** @type {JsonTransformerBuffer} バッファインスタンス */
        const buffer = new JsonTransformerBuffer();
        /** @type {TransformerBase|null} ルートトランスフォーマー */
        let rootTransformer = null;
        /** @type {TransformStreamDefaultController} コントローラー */
        let controller = null;

        super({
            start: ctrl => (controller = ctrl),
            transform: chunk => {
                buffer.addChunk(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
                if (!rootTransformer) {
                    // 前後のホワイトスペースをスキップ
                    buffer.consumeWhitespace();
                    rootTransformer = TransformerFactory.create(
                        buffer,
                        controller,
                        transformerOptions
                    );
                    if (!rootTransformer) {
                        // 不正なJSON開始文字の場合
                        const char = buffer.peekFirstChar();
                        if (char) {
                            throw new Error(`Unexpected character at start of JSON: '${char}'`);
                        }
                        return;
                    }
                }
                rootTransformer.parse();
            },
            flush: () => {
                // 空のストリームまたはホワイトスペースのみの場合
                if (!rootTransformer) {
                    throw new Error('Incomplete JSON data: empty or whitespace-only stream');
                }
                if (!rootTransformer.isDone()) {
                    throw new Error('Incomplete JSON data');
                }
                // パース完了後の余分な文字をチェック
                buffer.consumeWhitespace();
                const remaining = buffer.peekFirstChar();
                if (remaining) {
                    throw new Error(`Unexpected character after JSON: '${remaining}'`);
                }
            },
        });
    }
}

module.exports = { JsonTransformer };
