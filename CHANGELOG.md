# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.2] - 2025-11-01

### Added

- **JsonPath filtering feature** - New `acceptableJsonPath` option for filtering output values by JsonPath patterns (RFC 9535 subset)
    - Supports exact paths (e.g., `$.name`), object wildcards (e.g., `$.user.*`), and array wildcards (e.g., `$.items[*]`)
    - Patterns are pre-parsed and optimized for high-performance matching
- **Performance optimizations**:
    - Parser-based architecture with skip optimization for unmatched data
    - Bulk processing strategy for complete subtrees
    - 3-5x faster pattern matching, 60-80% memory reduction compared to v1.0.0
- Comprehensive test suite with 209 tests achieving 94.53% code coverage

### Changed

- **BREAKING**: Class renamed from `JsonTransformer` to `JsonTransformStream` for clarity
- **BREAKING**: Interface renamed from `JsonTransformerOptions` to `JsonTransformStreamOptions`
- **BREAKING**: Interface renamed from `JsonTransformerResult` to `JsonTransformStreamResult`
- **BREAKING**: `acceptableJsonPath` parameter is now required for both `JsonTransformStream` and `JsonStreamParser`
    - This is a new required parameter (did not exist in v1.0.0)
    - No direct migration path from v1.0.0; you must specify which paths to extract
- **BREAKING**: Now emits all JSON values (primitives, objects, arrays) matching specified patterns
    - v1.0.0 emitted only primitive values (string, number, boolean, null)
    - v2.0.0 emits any value type that matches the JsonPath pattern
- **BREAKING**: `JsonStreamParserError` simplified to minimal implementation
    - Removed properties: `position`, `path`, `type`, `recoverable`
    - Removed methods: factory methods (`parse()`, `structure()`, etc.), `toJSON()`, `toString()`
    - Now uses simple constructor: `new JsonStreamParserError(message)`
- **BREAKING**: `JsonStreamParser` API changed from stream-based to chunk-based interface
    - Removed method: `parseStream(readableStream: ReadableStream): Promise<void>`
    - Added method: `enqueue(chunk: Uint8Array): Promise<void>` - Process a chunk of JSON data
    - Added method: `close(): Promise<void>` - Close the parser and wait for final results
    - This change eliminates interface duplication with `JsonTransformStream`
- TypeScript definitions updated to reflect new behavior:
    - `JsonTransformStreamResult.value`: `JsonPrimitive` → `JsonValue`
    - `JsonStreamParserError`: Simplified to extend `Error` with only `name` and `message`
    - `JsonStreamParser`: Updated to use `enqueue`/`close` methods
- Internal architecture: Complete rewrite with Parser/Consumer architecture for better performance and maintainability

## [1.0.0] - 2025-10-20

### Added

- Initial release of json-stream-parser

[2.0.2]: https://github.com/nishimine/json-stream-parser-js/compare/v2.0.2...v1.0.0
[1.0.0]: https://github.com/nishimine/json-stream-parser-js/releases/tag/v1.0.0
