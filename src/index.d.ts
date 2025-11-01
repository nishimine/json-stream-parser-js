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

    constructor(message: string);
}

/**
 * Parsed result from JsonTransformStream
 * Contains any JSON value that matches the specified JsonPath patterns
 */
export interface JsonTransformStreamResult {
    path: string;
    value: JsonValue;
}

/**
 * Options for JsonTransformStream
 */
export interface JsonTransformStreamOptions {
    /**
     * Array of JsonPath patterns to filter output values (required).
     * Supports restricted JsonPath (wildcards only at path end - subset of RFC 9535).
     * Must specify at least one pattern.
     *
     * @example
     * ['$.users[*]'] // All user objects (access .email from each object)
     * ['$.*'] // All root-level properties
     * ['$.data.*'] // Direct children of data object (1 level only)
     */
    acceptableJsonPath: string[];
}

/**
 * JSON streaming TransformStream using Streams API
 * Extends TransformStream to convert Uint8Array chunks to JsonTransformStreamResult
 * Emits values that match the specified JsonPath patterns
 */
export class JsonTransformStream extends TransformStream<Uint8Array, JsonTransformStreamResult> {
    constructor(options: JsonTransformStreamOptions);
}

/**
 * Configuration options for JsonStreamParser
 */
export interface JsonStreamParserOptions extends JsonTransformStreamOptions {
    /**
     * Callback function triggered when a value is parsed
     */
    onValueParsed?: (path: string, value: JsonValue) => void;

    /**
     * Error callback function
     */
    onError?: (error: JsonStreamParserError) => void;
}

/**
 * JSON streaming parser with callback-based interface
 * Accepts Uint8Array chunks via enqueue() method
 */
export class JsonStreamParser {
    constructor(options: JsonStreamParserOptions);

    /**
     * Process a chunk of JSON data
     * @param chunk Uint8Array chunk containing JSON data
     */
    enqueue(chunk: Uint8Array): Promise<void>;

    /**
     * Close the parser and wait for final results
     */
    close(): Promise<void>;
}
