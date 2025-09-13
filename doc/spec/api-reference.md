# API Reference

## Overview

json-stream-parser provides two main APIs for streaming JSON parsing:

1. **`JsonTransformer`** - Modern Streams API-based transformer (Recommended)
2. **`JsonStreamParser`** - Legacy callback-based parser

Both APIs emit only **primitive values** (string, number, boolean, null) with JsonPath location information. Objects and arrays themselves are not emitted.

---

## JsonTransformer

`JsonTransformer` is a `TransformStream` implementation that transforms `Uint8Array` chunks into structured JSON value results.

### Constructor

```javascript
const transformer = new JsonTransformer(options);
```

#### Parameters

- **`options`**: Object (optional)
  - Currently no options are used
  - Reserved for future extensions

#### Return Value

- Returns a `TransformStream<Uint8Array, JsonTransformerResult>`

### Usage

#### Basic Usage

```javascript
const { JsonTransformer } = require('json-stream-parser');

const transformer = new JsonTransformer();

// Connect with ReadableStream
const resultStream = inputStream.pipeThrough(transformer);

// Process results
const reader = resultStream.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value); // { path: '$.key', value: 'someValue' }
}
```

#### With for-await-of

```javascript
const { JsonTransformer } = require('json-stream-parser');

const response = await fetch('https://api.example.com/data.json');
const transformer = new JsonTransformer();
const resultStream = response.body.pipeThrough(transformer);

for await (const { path, value } of resultStream) {
    console.log(`${path}: ${value}`);
}
```

### Output Format

Each emitted value has the following structure:

```typescript
interface JsonTransformerResult {
    path: string;       // JsonPath format (e.g., '$.users[0].name')
    value: JsonPrimitive; // string | number | boolean | null
}
```

**Important:** Only primitive values are emitted. Objects and arrays are not emitted as values.

#### Example

Input JSON:
```json
{
    "name": "Alice",
    "age": 30,
    "address": {
        "city": "Tokyo",
        "zip": null
    },
    "tags": ["developer", "designer"]
}
```

Emitted values:
```javascript
{ path: '$.name', value: 'Alice' }
{ path: '$.age', value: 30 }
{ path: '$.address.city', value: 'Tokyo' }
{ path: '$.address.zip', value: null }
{ path: '$.tags[0]', value: 'developer' }
{ path: '$.tags[1]', value: 'designer' }
```

### Error Handling

`JsonTransformer` throws standard JavaScript `Error` objects (not `JsonStreamParserError`) when parsing fails.

```javascript
try {
    const transformer = new JsonTransformer();
    const resultStream = inputStream.pipeThrough(transformer);

    for await (const { path, value } of resultStream) {
        console.log(`${path}: ${value}`);
    }
} catch (error) {
    // Standard Error object
    console.error('Parsing failed:', error.message);
}
```

Common error messages:
- `"Unexpected character at start of JSON: 'x'"`
- `"Incomplete JSON data: empty or whitespace-only stream"`
- `"Incomplete JSON data"`
- `"Unexpected character after JSON: 'x'"`

For detailed error handling information, see [Error Handling Specification](error-handling.md).

### TypeScript Support

```typescript
import { JsonTransformer, JsonTransformerResult, JsonTransformerOptions } from 'json-stream-parser';

const transformer = new JsonTransformer();
// transformer is TransformStream<Uint8Array, JsonTransformerResult>
```

---

## JsonStreamParser

`JsonStreamParser` is a callback-based API that wraps `JsonTransformer` for simpler usage.

**Note:** This is a legacy API. `JsonTransformer` is recommended for new code.

### Constructor

```javascript
const parser = new JsonStreamParser(options);
```

#### Parameters

- **`options`**: Object (optional)
  - **`onValueParsed`**: `(path: string, value: JsonPrimitive) => void` (optional)
    - Callback triggered when a value is parsed
    - Called for ALL parsed values
    - `path`: JsonPath string of the parsed value
    - `value`: Parsed primitive value (string, number, boolean, null)
  - **`onError`**: `(error: JsonStreamParserError) => void` (optional)
    - Error callback function
    - If provided, errors are passed to this callback instead of being thrown
    - `error`: Instance of `JsonStreamParserError`

#### Example

```javascript
const { JsonStreamParser } = require('json-stream-parser');

const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    },
    onError: (error) => {
        console.error(`Error at ${error.path}: ${error.message}`);
    }
});
```

### Methods

#### `parseStream(readableStream)`

Process a ReadableStream containing JSON data.

```javascript
await parser.parseStream(readableStream);
```

**Parameters:**
- **`readableStream`**: `ReadableStream<Uint8Array>`
  - The stream to parse

**Return Value:**
- Returns `Promise<void>`
- Resolves when parsing is complete

**Throws:**
- Throws `JsonStreamParserError` if parsing fails and `onError` callback is not provided

**Example:**

```javascript
const { JsonStreamParser } = require('json-stream-parser');

const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    }
});

try {
    const response = await fetch('https://api.example.com/data.json');
    await parser.parseStream(response.body);
} catch (error) {
    // JsonStreamParserError if onError is not set
    console.error('Parsing failed:', error.message);
}
```

### Error Handling

`JsonStreamParser` uses `JsonStreamParserError` for error reporting.

#### With Error Callback

```javascript
const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    },
    onError: (error) => {
        // error is JsonStreamParserError instance
        console.error(`Error [${error.type}] at ${error.path}:`, error.message);
        console.error(`Position: ${error.position}`);
    }
});

await parser.parseStream(stream); // Does not throw
```

#### Without Error Callback

```javascript
const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    }
});

try {
    await parser.parseStream(stream);
} catch (error) {
    // JsonStreamParserError is thrown
    if (error instanceof JsonStreamParserError) {
        console.error('Parsing failed:', error.toJSON());
    }
}
```

For detailed information about `JsonStreamParserError`, see [JsonStreamParserError Specification](jsonstream-parser-error.md).

### TypeScript Support

```typescript
import { JsonStreamParser, JsonStreamParserOptions, JsonStreamParserError } from 'json-stream-parser';

const parser = new JsonStreamParser({
    onValueParsed: (path: string, value: string | number | boolean | null) => {
        console.log(`${path}: ${value}`);
    },
    onError: (error: JsonStreamParserError) => {
        console.error(error.message);
    }
});
```

---

## JsonStreamParserError

Custom error class for JSON parsing errors in `JsonStreamParser`.

**Note:** `JsonTransformer` does NOT use this error class. It throws standard `Error` objects.

For complete documentation, see [JsonStreamParserError Specification](jsonstream-parser-error.md).

### Quick Reference

```javascript
const { JsonStreamParserError } = require('json-stream-parser');

// Constructor
const error = new JsonStreamParserError(message, options);

// Factory methods
JsonStreamParserError.parse(message, position, path);
JsonStreamParserError.structure(message, position, path);
JsonStreamParserError.encoding(message, position);
JsonStreamParserError.validation(message, position, path);
JsonStreamParserError.from(error, options);
```

### Properties

- **`name`**: `"JsonStreamParserError"` (string)
- **`message`**: Error description (string)
- **`type`**: Error type - `'PARSE'` | `'STRUCTURE'` | `'ENCODING'` | `'VALIDATION'` (string)
- **`position`**: Byte position where error occurred (number)
- **`path`**: JsonPath location where error occurred (string | null)
- **`recoverable`**: Whether error can be recovered from (boolean) - currently always `false`

### Methods

- **`toJSON()`**: Returns plain object representation
- **`toString()`**: Returns formatted error string

---

## JsonPath Format

All parsed values include a `path` property in JsonPath format following RFC 9535 conventions.

### Path Pattern Examples

| Pattern Example   | Description                    | JSON Example                                        |
| ----------------- | ------------------------------ | --------------------------------------------------- |
| `$`               | Root value                     | `42` → `$`                                          |
| `$.key`           | Object property                | `{"key": "value"}` → `$.key`                        |
| `$.a`, `$.b`      | Multiple object properties     | `{"a": 1, "b": 2}` → `$.a`, `$.b`                   |
| `$[0]`, `$[1]`    | Array elements                 | `[1, 2, 3]` → `$[0]`, `$[1]`, `$[2]`                |
| `$.items[0]`      | Array elements within property | `{"items": [1, 2]}` → `$.items[0]`, `$.items[1]`    |
| `$.users[0].name` | Nested properties within array | `{"users": [{"name": "John"}]}` → `$.users[0].name` |

### Filtering Values by Path

You can filter values in your callback using string matching or regular expressions:

```javascript
const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        // Filter by exact path
        if (path === '$.name') {
            console.log('Name:', value);
        }

        // Filter by path prefix
        if (path.startsWith('$.users[')) {
            console.log('User data:', path, value);
        }

        // Filter by regex pattern
        if (/^\$\.users\[\d+\]\.name$/.test(path)) {
            console.log('User name:', value);
        }
    }
});
```

---

## Type Definitions

Complete TypeScript type definitions are provided in `src/index.d.ts`.

### Core Types

```typescript
// Primitive JSON values
export type JsonPrimitive = string | number | boolean | null;

// Any valid JSON value
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// JSON object type
export interface JsonObject {
    [key: string]: JsonValue;
}

// JSON array type
export interface JsonArray extends Array<JsonValue> {}
```

### JsonTransformer Types

```typescript
// Result emitted by JsonTransformer
export interface JsonTransformerResult {
    path: string;
    value: JsonPrimitive;
}

// Options for JsonTransformer
export interface JsonTransformerOptions {
    // Empty interface reserved for future options
}

// JsonTransformer class
export class JsonTransformer extends TransformStream<Uint8Array, JsonTransformerResult> {
    constructor(options?: JsonTransformerOptions);
}
```

### JsonStreamParser Types

```typescript
// Configuration options for JsonStreamParser
export interface JsonStreamParserOptions extends JsonTransformerOptions {
    onValueParsed?: (path: string, value: JsonPrimitive) => void;
    onError?: (error: JsonStreamParserError) => void;
}

// JsonStreamParser class
export class JsonStreamParser {
    constructor(options?: JsonStreamParserOptions);
    parseStream(readableStream: ReadableStream<Uint8Array>): Promise<void>;
}
```

### JsonStreamParserError Types

```typescript
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
```

---

## Platform Compatibility

### Node.js

- **Minimum Version**: Node.js 20.0.0 or later
- **Required APIs**:
  - `ReadableStream` (available in Node.js 16.5.0+)
  - `TransformStream` (available in Node.js 16.5.0+)
  - `TextDecoder` (available in Node.js 11.0.0+)

### Browser

- All modern browsers supporting:
  - Streams API (`ReadableStream`, `TransformStream`)
  - `TextDecoder`
  - ES2020+ features

### Module Systems

Supports both CommonJS and ES Modules:

```javascript
// CommonJS
const { JsonTransformer, JsonStreamParser } = require('json-stream-parser');

// ES Modules
import { JsonTransformer, JsonStreamParser } from 'json-stream-parser';
```

---

## Usage Examples

### Example 1: Processing API Response

```javascript
const { JsonTransformer } = require('json-stream-parser');

const response = await fetch('https://api.example.com/users.json');
const transformer = new JsonTransformer();

for await (const { path, value } of response.body.pipeThrough(transformer)) {
    // Filter only user names
    if (path.match(/^\$\.users\[\d+\]\.name$/)) {
        console.log('User name:', value);
    }
}
```

### Example 2: Processing Large Files in Node.js

```javascript
const fs = require('fs');
const { Readable } = require('stream');
const { JsonStreamParser } = require('json-stream-parser');

const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    },
    onError: (error) => {
        console.error('Parse error:', error.message);
    }
});

const fileStream = fs.createReadStream('large-file.json');
const webStream = Readable.toWeb(fileStream);

await parser.parseStream(webStream);
```

### Example 3: Filtering Specific Values

```javascript
const { JsonTransformer } = require('json-stream-parser');

const transformer = new JsonTransformer();
const reader = inputStream.pipeThrough(transformer).getReader();

const prices = [];

while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Collect all price values
    if (value.path.endsWith('.price')) {
        prices.push(value.value);
    }
}

console.log('Total:', prices.reduce((a, b) => a + b, 0));
```

### Example 4: Error Handling

```javascript
const { JsonStreamParser, JsonStreamParserError } = require('json-stream-parser');

const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    },
    onError: (error) => {
        // Structured error information
        console.error({
            type: error.type,
            message: error.message,
            path: error.path,
            position: error.position,
            recoverable: error.recoverable
        });
    }
});

await parser.parseStream(stream);
```

---

## See Also

- [Error Handling Specification](error-handling.md) - Detailed error handling guide
- [JsonStreamParserError Specification](jsonstream-parser-error.md) - Complete error class documentation
