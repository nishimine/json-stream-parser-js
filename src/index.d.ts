/**
 * Supported JSON primitive values
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Any valid JSON value
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * JSON object type
 */
export interface JsonObject {
    [key: string]: JsonValue;
}

/**
 * JSON array type
 */
export interface JsonArray extends Array<JsonValue> {}

/**
 * Error thrown during JSON stream parsing
 */
export class JsonStreamParserError extends Error {
    readonly name: 'JsonStreamParserError';
    readonly position: number;
    readonly path: string | null;
    readonly type: string;
    readonly recoverable: boolean;

    constructor(message: string, options?: {
        position?: number;
        path?: string | null;
        type?: string;
        recoverable?: boolean;
    });

    static parse(message: string, position?: number, path?: string | null): JsonStreamParserError;
    static structure(message: string, position?: number, path?: string | null): JsonStreamParserError;
    static encoding(message: string, position?: number): JsonStreamParserError;
    static validation(message: string, position?: number, path?: string | null): JsonStreamParserError;
    static from(error: Error, options?: {
        type?: string;
        position?: number;
        path?: string | null;
        recoverable?: boolean;
    }): JsonStreamParserError;

    toJSON(): {
        name: string;
        message: string;
        position: number;
        path: string | null;
        type: string;
        recoverable: boolean;
    };
    toString(): string;
}

/**
 * Parsed result from JsonTransformer
 * Contains only primitive values (string, number, boolean, null)
 */
export interface JsonTransformerResult {
    path: string;
    value: JsonPrimitive;
}

/**
 * Options for JsonTransformer
 * Currently no options are used, but the interface is reserved for future extensions.
 * When adding options in the future, define them explicitly here instead of using index signatures.
 */
export interface JsonTransformerOptions {
    // Empty interface reserved for future options
    // Example future option: bufferSize?: number;
}

/**
 * JSON streaming transformer using Streams API
 * Extends TransformStream to convert Uint8Array chunks to JsonTransformerResult
 * Emits only primitive values (string, number, boolean, null)
 */
export class JsonTransformer extends TransformStream<Uint8Array, JsonTransformerResult> {
    constructor(options?: JsonTransformerOptions);
}

/**
 * Configuration options for JsonStreamParser
 */
export interface JsonStreamParserOptions extends JsonTransformerOptions {
    /**
     * Callback function triggered when a value is parsed
     */
    onValueParsed?: (path: string, value: JsonPrimitive) => void;

    /**
     * Error callback function
     */
    onError?: (error: JsonStreamParserError) => void;
}

/**
 * JSON streaming parser
 */
export class JsonStreamParser {
    constructor(options?: JsonStreamParserOptions);

    /**
     * Process a ReadableStream containing JSON data
     */
    parseStream(readableStream: ReadableStream<Uint8Array>): Promise<void>;
}
