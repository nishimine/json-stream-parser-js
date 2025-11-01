# json-stream-parser

A streaming JSON parser for processing JSON data incrementally

## Features

- **Zero Dependencies**: No runtime dependencies - only devDependencies for build tools
- **Streams API Compatible**: Built on Streams API (TransformStream) for modern streaming workflows
- **Streaming Processing**: Process large JSON data incrementally without loading entire content into memory
- **JsonPath Filtering**: Extract only the values you need with JsonPath pattern matching (restricted - wildcards only at path end)
- **TypeScript Support**: Includes type definition files
- **Cross-Platform**: Works in both browser and Node.js environments

## Installation

```bash
npm install @nishimine/json-stream-parser
```

## Quick Start

### Pattern A: Using JsonTransformStream with Streams API

```javascript
// CommonJS
const { JsonTransformStream } = require('@nishimine/json-stream-parser');
// ES Modules: import { JsonTransformStream } from '@nishimine/json-stream-parser';

// Using with fetch()
const response = await fetch('https://api.example.com/users.json');

// Extract user objects using JsonPath pattern (restricted subset: wildcards only at path end)
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.users[*]'], // Required: Specify paths to extract
});
const resultStream = response.body.pipeThrough(transformer);

// Process results with for-await-of
// Only values matching the specified patterns are emitted
for await (const { path, value } of resultStream) {
    console.log(`${path}: ${value.email}`); // Access email from the object
    // Output: $.users[0]: alice@example.com
    //         $.users[1]: bob@example.com
    //         ...
}
```

### Pattern B: Using JsonStreamParser (Using Callbacks)

```javascript
// CommonJS
const { JsonStreamParser } = require('@nishimine/json-stream-parser');
// ES Modules: import { JsonStreamParser } from '@nishimine/json-stream-parser';

const response = await fetch('https://api.example.com/data.json');
const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.users[*]'], // Required: Specify paths to extract (restricted subset)
    onValueParsed: (path, value) => {
        // value is the entire user object
        console.log(`${path} = ${JSON.stringify(value)}`);
        console.log(`Email: ${value.email}`); // Access properties
    },
    onError: error => {
        console.error(`Failed to parse: ${error.message}`);
    },
});

// Process chunks
const reader = response.body.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await parser.enqueue(value);
}
await parser.close();
```

## API Reference

For complete API documentation, see [API Reference](doc/spec/api-reference.md).

### `JsonTransformStream`

Streams API-based TransformStream interface for streaming JSON transformation. Transforms JSON streams into `{path: <jsonpath>, value: <value>}` format, emitting values that match the specified JsonPath patterns.

#### Constructor

```javascript
const transformer = new JsonTransformStream(options);
```

**Parameters:**

- `options`: Object (required)
    - `acceptableJsonPath`: string[] (required) - Array of JsonPath patterns to filter output values
        - **JsonPath Subset Specification**: Wildcards (`*`) can only be placed at the end of patterns
        - Supported patterns:
            - Exact match: `$.field`, `$.user.email`
            - Wildcards at path end: `$.*`, `$.config.*`, `$[*]`, `$.users[*]`
        - Examples:
            - `['$.users[*]']` - Extract all user objects (access `.email` etc. in your app)
            - `['$.config.*']` - Extract all properties of config object
            - `['$.*']` - Extract all root-level properties

#### Usage

`JsonTransformStream` extends `TransformStream<Uint8Array, {path: string, value: any}>`, so you can use it directly with `pipeThrough()`.

```javascript
const { JsonTransformStream } = require('@nishimine/json-stream-parser');

// Specify which paths to extract
// Note: Wildcards are only supported at the end of the path
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.users[*]', '$.config.*'],
});

// Connect with ReadableStream
const resultStream = inputStream.pipeThrough(transformer);

// Process results
const reader = resultStream.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value); // { path: '$.users[0]', value: { name: 'Alice', email: 'alice@example.com' } }
}
```

#### Output Format

JsonTransformStream emits values in the following format:

```javascript
{
    path: string,   // JsonPath format (e.g., '$.users[0]', '$.name')
    value: any      // Any JSON value (primitive, object, or array)
}
```

**Note:** All JSON values are emitted - primitives, objects, and arrays. The type of value emitted depends on your `acceptableJsonPath` patterns.

#### Usage Example

```javascript
// Input JSON
const json = {
    name: 'Alice',
    age: 30,
    address: {
        city: 'Tokyo',
        zip: null,
    },
    tags: ['developer', 'designer'],
};

// With acceptableJsonPath: ['$.*']
// Emitted values (root-level properties):
// { path: '$.name', value: 'Alice' }
// { path: '$.age', value: 30 }
// { path: '$.address', value: { city: 'Tokyo', zip: null } }
// { path: '$.tags', value: ['developer', 'designer'] }

// With acceptableJsonPath: ['$.address']
// Emitted value (object):
// { path: '$.address', value: { city: 'Tokyo', zip: null } }
```

### `JsonStreamParser`

Callback-based interface for streaming JSON parsing. This class provides a simple chunk-based API using `enqueue()` method.

#### Constructor Options

```javascript
// Example options configuration
const options = {
    acceptableJsonPath: ['$.users[*]'], // Required (restricted subset)
    onValueParsed: (path, value) => {
        // function (optional)
        console.log(`${path}: ${JSON.stringify(value)}`);
        console.log(`Email: ${value.email}`); // Access properties
    },
    onError: error => {
        // function (optional)
        console.error(`error: ${error.message}`);
    },
};
```

- **`acceptableJsonPath`** (required): Array of JsonPath patterns to filter output values
    - Supports restricted wildcards: `*` (single level only, at path end)
    - **Note**: `**` (recursive wildcard) is not supported - see "Limitations" section
    - Only values matching these patterns will be passed to `onValueParsed`
- **`onValueParsed`** (optional): Callback triggered when a matching value is parsed
    - `path`: JsonPath string of the parsed value
    - `value`: Parsed JSON value (can be primitive, object, or array)
- **`onError`** (optional): Error callback function
    - If provided, errors will be passed to this callback instead of being thrown

#### Methods

**`enqueue(chunk: Uint8Array): Promise<void>`**

- Process a chunk of JSON data
- Can be called multiple times to process data incrementally
- Throws `JsonStreamParserError` if no error callback is provided

**`close(): Promise<void>`**

- Close the parser and wait for final results
- Must be called after all chunks have been enqueued
- Returns a Promise that resolves when parsing is complete
- Throws `JsonStreamParserError` if no error callback is provided

### `JsonStreamParserError`

Custom error class for JSON parsing errors. For detailed information about properties, factory methods, and usage, see the [JsonStreamParserError Specification](doc/spec/jsonstream-parser-error.md).

## JsonPath Format

All parsed values include a `path` property in JsonPath format:

| Pattern Example   | Description                    | JSON Example                                        |
| ----------------- | ------------------------------ | --------------------------------------------------- |
| `$.key`           | Object property                | `{"key": "value"}` → `$.key`                        |
| `$.a`, `$.b`      | Multiple object properties     | `{"a": 1, "b": 2}` → `$.a`, `$.b`                   |
| `$[0]`, `$[1]`    | Array elements                 | `[1, 2, 3]` → `$[0]`, `$[1]`, `$[2]`                |
| `$.items[0]`      | Array elements within property | `{"items": [1, 2]}` → `$.items[0]`, `$.items[1]`    |
| `$.users[0].name` | Nested properties within array | `{"users": [{"name": "John"}]}` → `$.users[0].name` |

You can use these path patterns for filtering in your `onValueParsed` callback using string matching or regular expressions.

## Advanced Usage

### Processing Large Files with Node.js

```javascript
const fs = require('fs');
const { Readable } = require('stream');
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'], // Required parameter (this example extracts all root-level properties)
    onValueParsed: (path, value) => {
        console.log(`${path}: ${JSON.stringify(value)}`);
    },
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

### Using with Fetch API

```javascript
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'], // Required parameter (this example extracts all root-level properties)
    onValueParsed: (path, value) => {
        console.log(`${path}: ${JSON.stringify(value)}`);
    },
});

const response = await fetch('https://api.example.com/products.json');
const reader = response.body.getReader();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await parser.enqueue(value);
}
await parser.close();
```

### Error Recovery

```javascript
const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'], // Required parameter (this example extracts all root-level properties)
    onValueParsed: (path, value) => {
        console.log(`Parsed: ${path} = ${JSON.stringify(value)}`);
    },
    onError: error => {
        console.error('Error occurred:', error.message);
        // Handle error or retry with new parser instance
    },
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
    console.error('Fatal error:', error);
}
```

## Error Types and Recovery Methods

For detailed error handling methods and best practices, see the [Error Handling Guide](doc/spec/error-handling.md).

## Limitations

### JsonPath Filtering (Restricted)

json-stream-parser implements a **restricted JsonPath** that prioritizes performance and simplicity. It supports a subset of the standard JsonPath specification (RFC 9535), restricting wildcards to path endings only for improved performance.

#### ✅ Supported Patterns

1. **Exact Path Match**

    ```javascript
    '$.name'; // name field directly under root
    '$.user.email'; // nested field
    ```

2. **Object Wildcard (At Path End Only)**

    ```javascript
    '$.config.*'; // all direct properties of config object (1 level only)
    '$.user.settings.*'; // all direct properties of nested object (1 level only)
    ```

3. **Array Wildcard (At Path End Only)**

    ```javascript
    '$[*]'; // all elements of root array
    '$.users[*]'; // all elements of users array
    ```

#### ❌ Unsupported Patterns

The following patterns are not supported:

1. **Specific Array Index**

    ```javascript
    // ❌ Not supported
    '$[0]'; // specific index
    '$.users[0].name'; // field of specific element

    // ✅ Alternative: get all elements and filter in your app
    '$.users[*]'; // get all elements
    ```

2. **Mid-path Wildcards**

    ```javascript
    // ❌ Not supported
    '$.users[*].email'; // specific path after wildcard
    '$.departments.*.name'; // path after *

    // ✅ Alternative: get parent element and extract in your app
    '$.users[*]'; // get all user objects, then access .email from each
    '$.departments.*'; // get all departments, then access .name from each
    // Example:
    for await (const { path, value } of stream) {
        console.log(value.email); // Access email property from user object
    }
    ```

3. **Recursive Descent (Deep Wildcard)**

    ```javascript
    // ❌ Not supported
    '$.**'; // all descendant values (recursive)
    '$.**.email'; // specific path after **
    '$.data.**.id'; // specific path before/after **

    // ✅ Alternative: enumerate specific paths explicitly
    ['$.email', '$.user.email', '$.users[*]'];
    // Then access nested properties from each extracted value in your code
    ```

For more details, see the [JsonPath Filtering Specification](doc/spec/jsonpath-filtering.md).

## When This Library Is Useful

**In most cases, standard `JSON.parse()` is faster and simpler.** For small files, `JSON.parse()` is significantly faster.

However, `JsonTransformStream` is useful in the following scenarios:

1. **Processing very large files** - When JSON data doesn't fit in memory

    ```javascript
    // ❌ May cause out-of-memory error with large files (100MB+)
    const huge = await fetch('large-dataset.json').text();
    const data = JSON.parse(huge); // Crashes!

    // ✅ Streams incrementally - handles any size
    const response = await fetch('large-dataset.json');
    await response.body
        .pipeThrough(new JsonTransformStream({ acceptableJsonPath: ['$.items[*]'] }))
        .pipeTo(processor); // Process one item at a time
    ```

2. **Network streaming** - Start processing before download completes

    ```javascript
    const response = await fetch('https://api.example.com/large-dataset');
    // Process data as it arrives, don't wait for full download
    await response.body.pipeThrough(transformer).pipeTo(processor);
    ```

3. **Memory-constrained environments** - IoT devices, edge computing, etc.

4. **Selective extraction from large JSON** - Extract specific paths without parsing everything
    ```javascript
    // Extract only user objects, skip other top-level properties
    new JsonTransformStream({ acceptableJsonPath: ['$.users[*]'] });
    // Then access .email from each user object in your code
    ```

## Requirements

- Modern browsers
- Node.js 20.0.0 or higher
- Full support for ES modules and CommonJS
