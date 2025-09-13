/**
 * JSONパースエラー用カスタムエラークラス
 * @class JsonStreamParserError
 * @extends Error
 */
class JsonStreamParserError extends Error {
    /**
     * @param {string} message - エラーメッセージ
     * @param {Object} [options={}] - エラーオプション
     * @param {number} [options.position=0] - エラー発生位置（バイト位置）
     * @param {string|null} [options.path=null] - エラー発生パス（JsonPath形式）
     * @param {string} [options.type='PARSE'] - エラータイプ（'PARSE'|'STRUCTURE'|'ENCODING'|'VALIDATION'）
     * @param {boolean} [options.recoverable=false] - リカバリー可能フラグ
     */
    constructor(message, options = {}) {
        super(message);
        this.name = 'JsonStreamParserError';
        /** @type {number} エラー発生位置 */
        this.position = options.position || 0;
        /** @type {string|null} エラー発生パス */
        this.path = options.path || null;
        /** @type {string} エラータイプ */
        this.type = options.type || 'PARSE';
        /** @type {boolean} リカバリー可能フラグ */
        this.recoverable = options.recoverable || false;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, JsonStreamParserError);
        }
    }

    /**
     * パースエラーを生成
     * @param {string} message - エラーメッセージ
     * @param {number} [position=0] - エラー発生位置
     * @param {string|null} [path=null] - エラー発生パス
     * @returns {JsonStreamParserError} パースエラー
     */
    static parse(message, position = 0, path = null) {
        return new JsonStreamParserError(message, {
            position,
            path,
            type: 'PARSE',
        });
    }

    /**
     * 構造エラーを生成
     * @param {string} message - エラーメッセージ
     * @param {number} [position=0] - エラー発生位置
     * @param {string|null} [path=null] - エラー発生パス
     * @returns {JsonStreamParserError} 構造エラー
     */
    static structure(message, position = 0, path = null) {
        return new JsonStreamParserError(message, {
            position,
            path,
            type: 'STRUCTURE',
        });
    }

    /**
     * エンコーディングエラーを生成
     * @param {string} message - エラーメッセージ
     * @param {number} [position=0] - エラー発生位置
     * @returns {JsonStreamParserError} エンコーディングエラー
     */
    static encoding(message, position = 0) {
        return new JsonStreamParserError(message, {
            position,
            type: 'ENCODING',
        });
    }

    /**
     * 検証エラーを生成
     * @param {string} message - エラーメッセージ
     * @param {number} [position=0] - エラー発生位置
     * @param {string|null} [path=null] - エラー発生パス
     * @returns {JsonStreamParserError} 検証エラー
     */
    static validation(message, position = 0, path = null) {
        return new JsonStreamParserError(message, {
            position,
            path,
            type: 'VALIDATION',
        });
    }

    /**
     * 既存のエラーからJsonStreamParserErrorを生成
     * @param {Error} error - 元のエラー
     * @param {Object} [options={}] - エラーオプション
     * @returns {JsonStreamParserError} 変換されたエラー
     */
    static from(error, options = {}) {
        return new JsonStreamParserError(error.message || 'Unknown error', options);
    }

    /**
     * JSON表現に変換
     * @returns {Object} エラー情報オブジェクト
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            position: this.position,
            path: this.path,
            type: this.type,
            recoverable: this.recoverable,
        };
    }

    /**
     * 文字列表現に変換
     * @returns {string} エラー文字列
     */
    toString() {
        const parts = [this.name];
        if (this.type) parts.push(`[${this.type}]`);
        if (this.path) parts.push(`at ${this.path}`);
        parts.push(`(position: ${this.position}): ${this.message}`);
        return parts.join(' ');
    }
}

module.exports = { JsonStreamParserError };
