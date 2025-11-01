/**
 * Parser単体テスト用ヘルパー関数
 */

const { JsonTransformStreamBuffer } = require('../../src/json-transform-stream-buffer');

/**
 * 文字列からJsonTransformStreamBufferを作成
 */
function createBuffer(text) {
    const buffer = new JsonTransformStreamBuffer();
    if (text) {
        buffer.addChunk(new TextEncoder().encode(text));
    }
    return buffer;
}

/**
 * モックコントローラーを作成
 */
function createMockController() {
    return {
        enqueue: jest.fn(),
    };
}

/**
 * Parserを作成してパースを実行
 */
function parseWithParser(ParserClass, text, options = {}) {
    const buffer = createBuffer(text);
    const controller = options.controller || null;
    const parserOptions = { currentPath: '$.test', ...options };

    let parser;
    if (ParserClass.name === 'JsonLiteralParser') {
        // JsonLiteralParserは特別にstartCharが必要
        const startChar = text ? text[0] : 't';
        parser = new ParserClass(buffer, controller, startChar, parserOptions);
    } else {
        parser = new ParserClass(buffer, controller, parserOptions);
    }

    parser.parse();
    return parser;
}

module.exports = {
    createBuffer,
    createMockController,
    parseWithParser,
};
