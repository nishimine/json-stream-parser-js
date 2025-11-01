/**
 * JSONパースエラー用カスタムエラークラス
 * @class JsonStreamParserError
 * @extends Error
 */
class JsonStreamParserError extends Error {
    /**
     * @param {string} message - エラーメッセージ
     */
    constructor(message) {
        super(message);
        this.name = 'JsonStreamParserError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, JsonStreamParserError);
        }
    }
}

module.exports = { JsonStreamParserError };
