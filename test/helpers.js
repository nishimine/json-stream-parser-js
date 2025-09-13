/**
 * テスト用ヘルパー関数
 */

const { JsonTransformerBuffer } = require('../src/json-transformer-buffer');

/**
 * 文字列からJsonTransformerBufferを作成
 */
function createBuffer(text) {
    const buffer = new JsonTransformerBuffer();
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
 * Transformerを作成してパースを実行
 */
function parseWithTransformer(TransformerClass, text, options = {}) {
    const buffer = createBuffer(text);
    const controller = options.controller || null;
    const transformerOptions = { currentPath: '$.test', ...options };

    let transformer;
    if (TransformerClass.name === 'JsonLiteralTransformer') {
        // JsonLiteralTransformerは特別にstartCharが必要
        const startChar = text ? text[0] : 't';
        transformer = new TransformerClass(buffer, controller, startChar, transformerOptions);
    } else {
        transformer = new TransformerClass(buffer, controller, transformerOptions);
    }

    transformer.parse();
    return transformer;
}

/**
 * 文字列からReadableStreamを作成（統合テスト用）
 * @param {string} str - JSON文字列
 * @param {number|null} chunkSize - チャンクサイズ（nullの場合は一括送信）
 */
function createStreamFromString(str, chunkSize = null) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);

    return new ReadableStream({
        start(controller) {
            if (chunkSize === null) {
                controller.enqueue(bytes);
            } else {
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    controller.enqueue(bytes.slice(i, i + chunkSize));
                }
            }
            controller.close();
        },
    });
}

/**
 * ReadableStreamから全ての値を収集（統合テスト用）
 */
async function collectAllValues(stream) {
    const values = [];
    const reader = stream.getReader();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            values.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    return values;
}

module.exports = {
    createBuffer,
    createMockController,
    parseWithTransformer,
    createStreamFromString,
    collectAllValues,
};
