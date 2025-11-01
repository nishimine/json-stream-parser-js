# API Reference

## Overview

json-stream-parser provides two main APIs for streaming JSON parsing:

1. **`JsonTransformStream`** - Modern Streams API-based transformer (Recommended)
2. **`JsonStreamParser`** - Legacy callback-based parser

Both APIs emit values that match the specified JsonPath patterns with location information.

---

## JsonTransformStream

`JsonTransformStream` is a `TransformStream` implementation that transforms `Uint8Array` chunks into structured JSON value results.

### Constructor

```javascript
const transformer = new JsonTransformStream(options);
```

#### Parameters

- **`options`**: Object (required)
  - **`acceptableJsonPath`**: string[] (required)
    - Array of JsonPath patterns to filter output values
    - Uses **restricted JsonPath** implementation (wildcards only at pattern end, subset of RFC 9535)
    - **Supported patterns**:
      - **Exact match**: `'$.field'`, `'$.user.email'`
      - **Object wildcard (end only)**: `'$.*'`, `'$.config.*'` - matches direct children only (1 level)
      - **Array wildcard (end only)**: `'$[*]'`, `'$.users[*]'` - matches all array elements
    - **Unsupported patterns** (use alternatives):
      - ❌ Specific array index: `'$[0]'` → Use `'$[*]'` and filter in your app
      - ❌ Mid-path wildcards: `'$.users[*].email'` → Use `'$.users[*]'` and access `.email` from results
      - ❌ Recursive wildcard: `'$.**'`, `'$.**.id'` → Use specific paths or `'$.*'` and filter in your app
    - Only values matching at least one pattern will be emitted
    - **Examples**:
      - `['$.users[*]']` - All user objects (access properties from each object)
      - `['$.data.*']` - Direct children of data object (1 level only)
      - `['$.*']` - All root-level properties
      - `['$.config.database.*']` - All properties of config.database (1 level)
    - See [JsonPath Filtering Specification](jsonpath-filtering.md) for details

#### Return Value

- Returns a `TransformStream<Uint8Array, JsonTransformStreamResult>`

### Usage

#### Basic Usage

```javascript
const { JsonTransformStream } = require('@nishimine/json-stream-parser');

// Specify which paths to extract
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.users[*]'] // Extract all user objects
});

// Connect with ReadableStream
const resultStream = inputStream.pipeThrough(transformer);

// Process results
const reader = resultStream.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value); // { path: '$.users[0]', value: { name: 'Alice', email: '...' } }
    // Access specific properties: value.value.name, value.value.email
}
```

#### With for-await-of

```javascript
const { JsonTransformStream } = require('@nishimine/json-stream-parser');

const response = await fetch('https://api.example.com/users.json');

// Extract all user objects
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.users[*]']
});
const resultStream = response.body.pipeThrough(transformer);

for await (const { path, value } of resultStream) {
    console.log(`${path}: ${value.email}`);
    // Output: $.users[0]: alice@example.com
    //         $.users[1]: bob@example.com
}
```

#### Wildcard Pattern Examples

```javascript
// Extract all root-level properties (filter by path in your code)
const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
for await (const { path, value } of stream) {
    if (path.endsWith('.id')) {
        console.log(value); // Only id fields
    }
}

// Extract all user objects
new JsonTransformStream({ acceptableJsonPath: ['$.users[*]'] });

// Extract multiple specific paths
new JsonTransformStream({
    acceptableJsonPath: ['$.name', '$.email', '$.age']
});

// Extract all root-level properties
new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
```

### Output Format

Each emitted value has the following structure:

```typescript
interface JsonTransformStreamResult {
    path: string;   // JsonPath format (e.g., '$.users[0]', '$.name')
    value: JsonValue; // any JSON value (primitive, object, or array)
}
```

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

`JsonTransformStream` throws `JsonStreamParserError` objects when parsing fails.

```javascript
try {
    const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
    const resultStream = inputStream.pipeThrough(transformer);

    for await (const { path, value } of resultStream) {
        console.log(`${path}: ${value}`);
    }
} catch (error) {
    // JsonStreamParserError object
    console.error('Parsing failed:', error.message);
}
```

Common error messages:
- `"Unexpected character '<char>' at start of JSON. Expected '{', '[', string, number, boolean, or null."`
- `"Incomplete JSON data: The stream is empty or contains only whitespace. Expected a valid JSON value."`
- `"Incomplete JSON data: The JSON structure is not complete. Check for missing closing brackets or braces."`
- `"Unexpected character '<char>' after JSON. Only one top-level JSON value is allowed."`

For detailed error handling information, see [Error Handling Specification](error-handling.md).

### TypeScript Support

```typescript
import { JsonTransformStream, JsonTransformStreamResult, JsonTransformStreamOptions } from '@nishimine/json-stream-parser';

const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.users[*]'] // Note: Wildcards only at pattern end
});
// transformer is TransformStream<Uint8Array, JsonTransformStreamResult>
```

---

## JsonStreamParser

`JsonStreamParser` is a callback-based API that provides a simple chunk-based interface using `enqueue()` method.

**Note:** `JsonTransformStream` is recommended for new code using modern Streams API patterns.

### Constructor

```javascript
const parser = new JsonStreamParser(options);
```

#### Parameters

- **`options`**: Object (required)
  - **`acceptableJsonPath`**: string[] (required)
    - Array of JsonPath patterns to filter output values
    - Same syntax as `JsonTransformStream`
    - Only matching values are passed to `onValueParsed`
  - **`onValueParsed`**: `(path: string, value: JsonValue) => void` (optional)
    - Callback triggered when a matching value is parsed
    - Called only for values matching `acceptableJsonPath` patterns
    - `path`: JsonPath string of the parsed value
    - `value`: Parsed value (any JSON value)
  - **`onError`**: `(error: JsonStreamParserError) => void` (optional)
    - Error callback function
    - If provided, errors are passed to this callback instead of being thrown
    - `error`: Instance of `JsonStreamParserError`

#### Example

```javascript
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.users[*]'],  // Required - extract all user objects
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value.email}`);
        // Called for each user object - access .email property
    },
    onError: (error) => {
        console.error(`Error: ${error.message}`);
    }
});
```

### Methods

#### `enqueue(chunk)`

Process a chunk of JSON data.

```javascript
await parser.enqueue(chunk);
```

**Parameters:**
- **`chunk`**: `Uint8Array`
  - The chunk of JSON data to process

**Return Value:**
- Returns `Promise<void>`

**Throws:**
- Throws `JsonStreamParserError` if parsing fails and `onError` callback is not provided

#### `close()`

Close the parser and wait for final results.

```javascript
await parser.close();
```

**Parameters:**
- None

**Return Value:**
- Returns `Promise<void>`
- Resolves when parsing is complete

**Throws:**
- Throws `JsonStreamParserError` if parsing fails and `onError` callback is not provided

**Example:**

```javascript
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.users[*]'],
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value.email}`);
    }
});

try {
    const response = await fetch('https://api.example.com/data.json');
    const reader = response.body.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await parser.enqueue(value);
    }
    await parser.close();
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
    acceptableJsonPath: ['$.users[*]'],
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value.email}`);
    },
    onError: (error) => {
        // error is JsonStreamParserError instance
        console.error(`Error: ${error.message}`);
    }
});

const reader = stream.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await parser.enqueue(value); // Does not throw
}
await parser.close(); // Does not throw
```

#### Without Error Callback

```javascript
const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'],  // Required parameter
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    }
});

try {
    const reader = stream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await parser.enqueue(value);
    }
    await parser.close();
} catch (error) {
    // JsonStreamParserError is thrown
    if (error instanceof JsonStreamParserError) {
        console.error('Parsing failed:', error.message);
    }
}
```

For detailed information about `JsonStreamParserError`, see [JsonStreamParserError Specification](jsonstream-parser-error.md).

### TypeScript Support

```typescript
import { JsonStreamParser, JsonStreamParserOptions, JsonStreamParserError, JsonValue } from '@nishimine/json-stream-parser';

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.users[*]'],
    onValueParsed: (path: string, value: JsonValue) => {
        console.log(`${path}: ${JSON.stringify(value)}`);
    },
    onError: (error: JsonStreamParserError) => {
        console.error(error.message);
    }
});
```

---

## JsonStreamParserError

Custom error class for JSON parsing errors used by both `JsonTransformStream` and `JsonStreamParser`.

For complete documentation, see [JsonStreamParserError Specification](jsonstream-parser-error.md).

### Quick Reference

```javascript
const { JsonStreamParserError } = require('@nishimine/json-stream-parser');

// Constructor
const error = new JsonStreamParserError(message);
```

### Properties

- **`name`**: `"JsonStreamParserError"` (string) - Error class name
- **`message`**: Error description (string) - Inherited from `Error`
- **`stack`**: Stack trace (string) - Inherited from `Error`

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
    acceptableJsonPath: ['$.*'],  // Required: extract all root-level properties, then filter in callback
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

### JsonTransformStream Types

```typescript
// Result emitted by JsonTransformStream
export interface JsonTransformStreamResult {
    path: string;
    value: JsonValue; // Can be any JSON value (primitive, object, or array)
}

// Options for JsonTransformStream
export interface JsonTransformStreamOptions {
    acceptableJsonPath: string[]; // Required: Array of JsonPath patterns
}

// JsonTransformStream class
export class JsonTransformStream extends TransformStream<Uint8Array, JsonTransformStreamResult> {
    constructor(options: JsonTransformStreamOptions);
}
```

### JsonStreamParser Types

```typescript
// Configuration options for JsonStreamParser
export interface JsonStreamParserOptions extends JsonTransformStreamOptions {
    onValueParsed?: (path: string, value: JsonValue) => void;
    onError?: (error: JsonStreamParserError) => void;
}

// JsonStreamParser class
export class JsonStreamParser {
    constructor(options: JsonStreamParserOptions);
    enqueue(chunk: Uint8Array): Promise<void>;
    close(): Promise<void>;
}
```

### JsonStreamParserError Types

```typescript
export class JsonStreamParserError extends Error {
    readonly name: 'JsonStreamParserError';

    constructor(message: string);
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
const { JsonTransformStream, JsonStreamParser } = require('@nishimine/json-stream-parser');

// ES Modules
import { JsonTransformStream, JsonStreamParser } from '@nishimine/json-stream-parser';
```

---

## Usage Examples

### Example 1: Processing API Response

```javascript
const { JsonTransformStream } = require('@nishimine/json-stream-parser');

const response = await fetch('https://api.example.com/users.json');
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.users[*]']
});

for await (const { path, value } of response.body.pipeThrough(transformer)) {
    // Access user properties directly
    console.log('User name:', value.name);
    console.log('User email:', value.email);
}
```

### Example 2: Processing Large Files in Node.js

```javascript
const fs = require('fs');
const { Readable } = require('stream');
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'], // Extract all root-level properties
    onValueParsed: (path, value) => {
        console.log(`${path}: ${JSON.stringify(value)}`);
    },
    onError: (error) => {
        console.error('Parse error:', error.message);
    }
});

const fileStream = fs.createReadStream('large-file.json');
const webStream = Readable.toWeb(fileStream);
const reader = webStream.getReader();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await parser.enqueue(value);
}
await parser.close();
```

### Example 3: Filtering Specific Values

```javascript
const { JsonTransformStream } = require('@nishimine/json-stream-parser');

const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.*']
});
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
const { JsonStreamParser, JsonStreamParserError } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'],
    onValueParsed: (path, value) => {
        console.log(`${path}: ${JSON.stringify(value)}`);
    },
    onError: (error) => {
        // Error information
        console.error({
            name: error.name,
            message: error.message
        });
    }
});

const reader = stream.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await parser.enqueue(value);
}
await parser.close();
```

---

## See Also

- [Error Handling Specification](error-handling.md) - Detailed error handling guide
- [JsonStreamParserError Specification](jsonstream-parser-error.md) - Complete error class documentation
