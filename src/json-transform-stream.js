const { JsonTransformStreamBuffer } = require('./json-transform-stream-buffer');
const { JsonStreamParserError } = require('./json-stream-parser-error');
const { JsonPath } = require('./json-path');
const { ParserBase } = require('./parser/parser-base');
const { JsonStringParser } = require('./parser/json-string-parser');
const { JsonNumberParser } = require('./parser/json-number-parser');
const { JsonLiteralParser } = require('./parser/json-literal-parser');
const { JsonArrayParser } = require('./parser/json-array-parser');
const { JsonObjectParser } = require('./parser/json-object-parser');
const { JsonArrayBulkParser } = require('./parser/json-array-bulk-parser');
const { JsonObjectBulkParser } = require('./parser/json-object-bulk-parser');
const { JsonArrayConsumer } = require('./consumer/json-array-consumer');
const { JsonObjectConsumer } = require('./consumer/json-object-consumer');

/**
 * JSON変換クラス（推奨API）
 * Streams API対応のTransformStreamを継承
 * @class JsonTransformStream
 */
class JsonTransformStream extends TransformStream {
    /**
     * @param {Object} options - オプション
     * @param {string[]} options.acceptableJsonPath - 出力するJsonPathパターンの配列（必須、ワイルドカード対応）
     */
    constructor(options) {
        // acceptableJsonPathのバリデーション
        if (
            !options ||
            !options.acceptableJsonPath ||
            !Array.isArray(options.acceptableJsonPath) ||
            options.acceptableJsonPath.length === 0
        ) {
            throw new Error(
                'acceptableJsonPath is required. Please specify at least one JsonPath pattern.'
            );
        }

        /** @type {JsonTransformStreamBuffer} バッファインスタンス */
        const buffer = new JsonTransformStreamBuffer();
        /** @type {ParserBase|null} ルートパーサー */
        let rootParser = null;
        /** @type {TransformStreamDefaultController} 実際のコントローラー */
        let actualController = null;

        // JsonPathパターンを事前にparseしてインスタンス化（高速化のため）
        /** @type {JsonPath[]} パース済みJsonPathインスタンスの配列 */
        const parsedJsonPaths = options.acceptableJsonPath.map(pattern => JsonPath.parse(pattern));

        /**
         * JsonPathフィルタリング機能を持つcontrollerラッパー
         */
        const filteringController = {
            enqueue: item => {
                // パース済みJsonPathインスタンスを使用して高速マッチング
                const matches = parsedJsonPaths.some(jsonPath => jsonPath.match(item.path));
                if (matches) {
                    actualController.enqueue(item);
                }
            },
        };

        super({
            start: ctrl => {
                actualController = ctrl;
            },
            transform: chunk => {
                buffer.addChunk(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
                if (!rootParser) {
                    // 手前のホワイトスペースをスキップ
                    buffer.consumeWhitespace();
                    rootParser = JsonTransformStream._createParser(
                        buffer,
                        filteringController,
                        '$',
                        parsedJsonPaths
                    );
                    if (!rootParser) {
                        // 不正なJSON開始文字の場合
                        const char = buffer.peekFirstChar();
                        if (char) {
                            throw new JsonStreamParserError(
                                `Unexpected character '${char}' at start of JSON. Expected '{', '[', string, number, boolean, or null.`
                            );
                        }
                        return;
                    }
                }
                // ParserとConsumerで処理を実行
                ParserBase.executeStep(rootParser);
            },
            flush: () => {
                // 空のストリームまたはホワイトスペースのみの場合
                if (!rootParser) {
                    throw new JsonStreamParserError(
                        'Incomplete JSON data: The stream is empty or contains only whitespace. Expected a valid JSON value.'
                    );
                }
                if (!rootParser.isDone()) {
                    throw new JsonStreamParserError(
                        'Incomplete JSON data: The JSON structure is not complete. Check for missing closing brackets or braces.'
                    );
                }
                // パース完了後の余分な文字をチェック
                buffer.consumeWhitespace();
                const remaining = buffer.peekFirstChar();
                if (remaining) {
                    throw new JsonStreamParserError(
                        `Unexpected character '${remaining}' after JSON. Only one top-level JSON value is allowed.`
                    );
                }
            },
        });
    }

    /**
     * 現在のバッファ内容に基づいて適切なParserまたはConsumerを生成
     *
     * Bulk vs Incremental Parserの判定:
     * - acceptableJsonPathに基づいて、一括パース(Bulk)と逐次パース(Incremental)を使い分ける
     * - 子孫パスがマッチする可能性がある場合はIncremental（逐次処理で子要素を精査）
     * - 現在のパス自体がマッチする場合はBulk（一括処理後にfilteringControllerでフィルタ）
     * - どちらもマッチしない場合はConsumerでスキップ
     *
     * @private
     * @static
     * @param {JsonTransformStreamBuffer} buffer - バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {string} currentPath - 現在のJsonPath
     * @param {JsonPath[]} parsedJsonPaths - パース済みJsonPathインスタンスの配列
     * @returns {ParserBase|ConsumerBase|null} 生成されたParserまたはConsumer
     */
    static _createParser(buffer, controller, currentPath, parsedJsonPaths) {
        const char = buffer.peekFirstChar();
        if (!char) return null;

        // プリミティブ値のParser
        if (char === '"') {
            return new JsonStringParser(buffer, controller, currentPath);
        }
        if (char === '-' || (char >= '0' && char <= '9')) {
            return new JsonNumberParser(buffer, controller, currentPath);
        }
        if (char === 't' || char === 'f' || char === 'n') {
            return new JsonLiteralParser(buffer, controller, char, currentPath);
        }

        // 配列・オブジェクトのParserまたはConsumer
        if (char === '[') {
            return this._createArrayParser(buffer, controller, currentPath, parsedJsonPaths);
        }
        if (char === '{') {
            return this._createObjectParser(buffer, controller, currentPath, parsedJsonPaths);
        }

        return null;
    }

    /**
     * 構造型（配列・オブジェクト）Parserを生成（Consumer/Bulk/Incrementalを判定）
     * @private
     * @static
     * @param {JsonTransformStreamBuffer} buffer - バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {string} currentPath - 現在のJsonPath
     * @param {JsonPath[]} parsedJsonPaths - パース済みJsonPathインスタンスの配列
     * @param {Object} config - Parser/Consumerクラスの構成
     * @returns {ParserBase|ConsumerBase} 生成されたParserまたはConsumer
     */
    static _createStructureParser(buffer, controller, currentPath, parsedJsonPaths, config) {
        const parseStrategy = this._determineParseStrategy(parsedJsonPaths, currentPath);

        if (parseStrategy === 'skip') {
            // 完全にスキップ：Consumerを使用
            return new config.ConsumerClass(buffer, currentPath);
        } else if (parseStrategy === 'bulk') {
            // 一括パース：Bulk Parserを使用
            return new config.BulkParserClass(buffer, controller, currentPath);
        } else {
            // 逐次パース：Incremental Parserを使用
            return new config.IncrementalParserClass(
                buffer,
                controller,
                currentPath,
                parsedJsonPaths
            );
        }
    }

    /**
     * 配列用Parserを生成（Consumer/Bulk/Incrementalを判定）
     * @private
     * @static
     * @param {JsonTransformStreamBuffer} buffer - バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {string} currentPath - 現在のJsonPath
     * @param {JsonPath[]} parsedJsonPaths - パース済みJsonPathインスタンスの配列
     * @returns {ParserBase|ConsumerBase} 生成されたParserまたはConsumer
     */
    static _createArrayParser(buffer, controller, currentPath, parsedJsonPaths) {
        return this._createStructureParser(buffer, controller, currentPath, parsedJsonPaths, {
            ConsumerClass: JsonArrayConsumer,
            BulkParserClass: JsonArrayBulkParser,
            IncrementalParserClass: JsonArrayParser,
        });
    }

    /**
     * オブジェクト用Parserを生成（Consumer/Bulk/Incrementalを判定）
     * @private
     * @static
     * @param {JsonTransformStreamBuffer} buffer - バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {string} currentPath - 現在のJsonPath
     * @param {JsonPath[]} parsedJsonPaths - パース済みJsonPathインスタンスの配列
     * @returns {ParserBase|ConsumerBase} 生成されたParserまたはConsumer
     */
    static _createObjectParser(buffer, controller, currentPath, parsedJsonPaths) {
        return this._createStructureParser(buffer, controller, currentPath, parsedJsonPaths, {
            ConsumerClass: JsonObjectConsumer,
            BulkParserClass: JsonObjectBulkParser,
            IncrementalParserClass: JsonObjectParser,
        });
    }

    /**
     * パース戦略を判定（Skip/Bulk/Incrementalのいずれか）
     *
     * 判定ロジック:
     * 1. 子孫パスがマッチする可能性がある場合 → Incremental（逐次処理で子要素を精査）
     * 2. 現在のパス自体がマッチする場合 → Bulk（JSON.parseで一括処理後、filteringControllerでフィルタ）
     * 3. 現在のパスも子孫パスも全くマッチしない場合 → Skip（Consumerでスキップ、最適化）
     *
     * @private
     * @static
     * @param {JsonPath[]} parsedJsonPaths - パース済みJsonPathインスタンスの配列
     * @param {string} currentPath - 現在のJsonPath（デフォルトは'$'）
     * @returns {string} 'skip' | 'bulk' | 'incremental'
     */
    static _determineParseStrategy(parsedJsonPaths, currentPath) {
        // 子孫パスがマッチする可能性があるか確認
        const hasDescendants = parsedJsonPaths.some(jsonPath =>
            jsonPath.hasMatchingDescendants(currentPath)
        );

        if (hasDescendants) {
            // 子孫パスがマッチする可能性がある場合はIncrementalを使用（逐次処理で子要素を精査）
            return 'incremental';
        }

        // 現在のパス自体がマッチするか確認
        const currentPathMatches = parsedJsonPaths.some(jsonPath => jsonPath.match(currentPath));
        if (currentPathMatches) {
            // 現在のパス自体がマッチする場合はBulkを使用（一括処理）
            return 'bulk';
        }

        // 現在のパスも子孫パスも全くマッチしない場合はSkipを使用
        return 'skip';
    }
}

module.exports = { JsonTransformStream };
