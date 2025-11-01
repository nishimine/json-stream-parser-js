const { JsonStreamParserError } = require('./json-stream-parser-error');
const { JsonTransformStream } = require('./json-transform-stream');

/**
 * JSONストリームパーサークラス（コールバックベースAPI）
 * Uint8Arrayチャンクを受け取り、コールバックで値を返すシンプルなインタフェースを提供します
 * @class JsonStreamParser
 */
class JsonStreamParser {
    /**
     * @param {Object} options - オプション
     * @param {string[]} options.acceptableJsonPath - 出力するJsonPathパターンの配列（必須、ワイルドカード対応）
     * @param {Function} [options.onValueParsed] - 値がパースされたときのコールバック関数 (path: string, value: any) => void
     * @param {Function} [options.onError] - エラー発生時のコールバック関数 (error: JsonStreamParserError) => void
     */
    constructor(options) {
        /** @type {Function|undefined} 値パースコールバック */
        this.onValueParsed = options.onValueParsed;
        /** @type {Function|undefined} エラーコールバック */
        this.onError = options.onError;
        /** @type {JsonTransformStream} 内部JsonTransformStream */
        this._transformer = new JsonTransformStream(options);
        /** @type {WritableStreamDefaultWriter|null} 内部Writer */
        this._writer = null;
        /** @type {Promise<void>|null} 読み取り処理Promise */
        this._readingPromise = null;
        /** @type {boolean} 初期化済みフラグ */
        this._initialized = false;
    }

    /**
     * パーサーの初期化を行います（初回enqueue時に自動実行）
     * @private
     */
    _initialize() {
        if (this._initialized) return;
        this._initialized = true;

        // WritableStreamを作成してTransformerと接続
        const { readable, writable } = new TransformStream();
        this._writer = writable.getWriter();

        // 読み取り処理を開始
        this._readingPromise = this._startReading(readable);
        // unhandled rejection を防ぐため、エラーハンドリングをアタッチ
        // 実際のエラー処理は close() で行う
        this._readingPromise.catch(() => {
            // エラーは close() で再スローされるため、ここでは何もしない
        });
    }

    /**
     * ReadableStreamから値を読み取り、コールバックを呼び出します
     * @param {ReadableStream} readable - 読み取り対象のストリーム
     * @returns {Promise<void>}
     * @private
     */
    async _startReading(readable) {
        try {
            const reader = readable.pipeThrough(this._transformer).getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                this.onValueParsed?.(value.path, value.value);
            }
        } catch (error) {
            // 既にJsonStreamParserErrorの場合はそのまま使用
            const wrappedError =
                error instanceof JsonStreamParserError
                    ? error
                    : new JsonStreamParserError(error.message || 'Unknown error');

            if (this.onError) {
                this.onError(wrappedError);
            } else {
                throw wrappedError;
            }
        }
    }

    /**
     * JSONデータのチャンクを受け取ります
     * @param {Uint8Array} chunk - JSONデータのチャンク
     * @throws {JsonStreamParserError} エラーが発生し、onErrorが設定されていない場合
     */
    async enqueue(chunk) {
        this._initialize();

        try {
            await this._writer.write(chunk);
        } catch (error) {
            const wrappedError =
                error instanceof JsonStreamParserError
                    ? error
                    : new JsonStreamParserError(error.message || 'Unknown error');

            if (this.onError) {
                this.onError(wrappedError);
            } else {
                throw wrappedError;
            }
        }
    }

    /**
     * パース処理を終了し、最終的な結果を待ちます
     * @returns {Promise<void>}
     * @throws {JsonStreamParserError} エラーが発生し、onErrorが設定されていない場合
     */
    async close() {
        if (!this._initialized) {
            this._initialize();
        }

        try {
            // Writerをクローズする前に、既にエラーが発生していないか確認
            const closeWriter = this._writer.close();

            // 両方のPromiseを並行して待つ
            const results = await Promise.allSettled([closeWriter, this._readingPromise]);

            // エラーがあれば、_readingPromise のエラーを優先（実際のパースエラーを含むため）
            const readingResult = results[1];
            const writerResult = results[0];

            if (readingResult.status === 'rejected') {
                throw readingResult.reason;
            }
            if (writerResult.status === 'rejected') {
                throw writerResult.reason;
            }
        } catch (error) {
            const wrappedError =
                error instanceof JsonStreamParserError
                    ? error
                    : new JsonStreamParserError(error.message || 'Unknown error');

            if (this.onError) {
                this.onError(wrappedError);
            } else {
                throw wrappedError;
            }
        }
    }
}

module.exports = { JsonStreamParser };
