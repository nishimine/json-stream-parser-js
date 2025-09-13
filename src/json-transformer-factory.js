const { JsonStringTransformer } = require('./transformer/json-string-transformer');
const { JsonNumberTransformer } = require('./transformer/json-number-transformer');
const { JsonLiteralTransformer } = require('./transformer/json-literal-transformer');

/**
 * Transformerインスタンスを生成するヘルパークラス
 * @class TransformerFactory
 */
class TransformerFactory {
    /**
     * 現在のバッファ内容に基づいて適切なトランスフォーマーを生成
     * @param {JsonTransformerBuffer} buffer - バッファインスタンス
     * @param {TransformStreamDefaultController} controller - ストリームコントローラー
     * @param {Object} options - トランスフォーマーオプション
     * @returns {TransformerBase|null} 生成されたトランスフォーマー、またはnull
     */
    static create(buffer, controller, options) {
        const char = buffer.peekFirstChar();
        if (!char) return null;

        if (char === '"') return new JsonStringTransformer(buffer, controller, options);
        if (char === '-' || (char >= '0' && char <= '9'))
            return new JsonNumberTransformer(buffer, controller, options);
        if (char === 't' || char === 'f' || char === 'n')
            return new JsonLiteralTransformer(buffer, controller, char, options);

        // 循環依存を避けるため遅延ロード
        if (char === '[') {
            const { JsonArrayTransformer } = require('./transformer/json-array-transformer');
            return new JsonArrayTransformer(buffer, controller, options);
        }
        if (char === '{') {
            const { JsonObjectTransformer } = require('./transformer/json-object-transformer');
            return new JsonObjectTransformer(buffer, controller, options);
        }

        return null;
    }
}

module.exports = { TransformerFactory };
