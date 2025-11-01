/**
 * E2Eテスト用ヘルパー関数
 */

/**
 * 文字列からReadableStreamを作成
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
 * ReadableStreamから全ての値を収集
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
    createStreamFromString,
    collectAllValues,
};
