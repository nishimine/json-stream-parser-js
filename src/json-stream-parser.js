const { JsonStreamParserError } = require('./json-stream-parser-error');
const { JsonTransformer } = require('./json-transformer');

/**
 * JSONストリームパーサークラス（レガシーAPI）
 * Streams APIを使用してJSONデータをストリーミング解析します
 * @class JsonStreamParser
 */
class JsonStreamParser {
    /**
     * @param {Object} [options={}] - パーサーオプション
     * @param {Function} [options.onValueParsed] - 値がパースされたときのコールバック関数 (path: string, value: any) => void
     * @param {Function} [options.onError] - エラー発生時のコールバック関数 (error: JsonStreamParserError) => void
     */
    constructor(options = {}) {
        /** @type {Function|undefined} 値パースコールバック */
        this.onValueParsed = options.onValueParsed;
        /** @type {Function|undefined} エラーコールバック */
        this.onError = options.onError;
        /** @type {JsonTransformer} 内部トランスフォーマー */
        this._transformer = new JsonTransformer(options);
    }

    /**
     * ReadableStreamからJSONデータをパースします
     * @param {ReadableStream} readableStream - パース対象のストリーム
     * @returns {Promise<void>}
     * @throws {JsonStreamParserError} パースエラーが発生し、onErrorが設定されていない場合
     */
    async parseStream(readableStream) {
        try {
            const reader = readableStream.pipeThrough(this._transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                this.onValueParsed?.(value.path, value.value);
            }
        } catch (error) {
            const wrappedError = JsonStreamParserError.validation(error.message, 0);
            if (this.onError) {
                this.onError(wrappedError);
            } else {
                throw wrappedError;
            }
        }
    }
}

module.exports = { JsonStreamParser };
