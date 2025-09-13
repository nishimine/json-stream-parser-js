# json-stream-parser

A streaming JSON parser for processing JSON data incrementally

## Features

- **Zero Dependencies**: No runtime dependencies - only devDependencies for build tools
- **Streams API Compatible**: Built on Streams API (TransformStream) for modern streaming workflows
- **Streaming Processing**: Process large JSON data incrementally without loading entire content into memory
- **TypeScript Support**: Includes type definition files
- **Cross-Platform**: Works in both browser and Node.js environments

## Installation

```bash
npm install @nishimine/json-stream-parser
```

## Quick Start

### Pattern A: Using JsonTransformer with Streams API

```javascript
// CommonJS
const { JsonTransformer } = require('@nishimine/json-stream-parser');
// ES Modules: import { JsonTransformer } from '@nishimine/json-stream-parser';

// Using with fetch()
const response = await fetch('https://api.example.com/data.json');
const transformer = new JsonTransformer();
const resultStream = response.body.pipeThrough(transformer);

// Process results with for-await-of
// Only primitive values (string, number, boolean, null) are emitted, excluding objects and arrays
for await (const { path, value } of resultStream) {
    console.log(`${path}: ${value}`);
}
```

### Pattern B: Using JsonStreamParser (Using Callbacks)

```javascript
// CommonJS
const { JsonStreamParser } = require('@nishimine/json-stream-parser');
// ES Modules: import { JsonStreamParser } from '@nishimine/json-stream-parser';

const response = await fetch('https://api.example.com/data.json');
const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path} = ${JSON.stringify(value)}`);
    },
    onError: error => {
        console.error(`Failed to parse ${error.path}: ${error.message}`);
    },
});

await parser.parseStream(response.body);
```

## API Reference

For complete API documentation, see [API Reference](doc/spec/api-reference.md).

### `JsonTransformer`

Streams API-based TransformStream interface for streaming JSON transformation. Transforms JSON streams into `{path: <jsonpath>, value: <value>}` format, emitting only primitive values (string, number, boolean, null) and excluding objects and arrays.

#### Constructor

```javascript
const transformer = new JsonTransformer(options);
```

**Parameters:**

- `options`: Object (optional)
    - No special options in the current version

#### Usage

`JsonTransformer` extends `TransformStream<Uint8Array, {path: string, value: any}>`, so you can use it directly with `pipeThrough()`.

```javascript
const { JsonTransformer } = require('@nishimine/json-stream-parser');

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

#### Output Format

JsonTransformer emits primitive values in the following format:

```javascript
{
    path: string,   // JsonPath format (e.g., '$.users[0].name')
    value: any      // Primitive value (string, number, boolean, null)
}
```

**Note:** Object and array values are NOT emitted. Only primitive values within these structures are emitted individually.

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

// Emitted values
// { path: '$.name', value: 'Alice' }
// { path: '$.age', value: 30 }
// { path: '$.address.city', value: 'Tokyo' }
// { path: '$.address.zip', value: null }
// { path: '$.tags[0]', value: 'developer' }
// { path: '$.tags[1]', value: 'designer' }
```

### `JsonStreamParser`

Callback-based interface for streaming JSON parsing. This class wraps JsonTransformer to provide a simpler callback-based API.

#### Constructor Options

```javascript
// Example options configuration
const options = {
    onValueParsed: (path, value) => {
        // function (optional)
        console.log(`${path}: ${value}`);
    },
    onError: error => {
        // function (optional)
        console.error(`error: ${error.message}`);
    },
};
```

- **`onValueParsed`** (optional): Callback triggered when a value is parsed
    - `path`: JsonPath string of the parsed value
    - `value`: Parsed JSON value (string, number, boolean, null)
    - **Note**: This callback is called for ALL parsed values. Implement filtering logic inside your callback if needed.
- **`onError`** (optional): Error callback function
    - If provided, errors will be passed to this callback instead of being thrown

#### Methods

**`parseStream(readableStream: ReadableStream): Promise<void>`**

- Process a ReadableStream containing JSON data
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
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    },
});

const fileStream = fs.createReadStream('large-file.json');
const webStream = Readable.toWeb(fileStream);
await parser.parseStream(webStream);
```

### Using with Fetch API

```javascript
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    },
});

const response = await fetch('https://api.example.com/products.json');
await parser.parseStream(response.body);
```

### Error Recovery

```javascript
const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`Parsed: ${path} = ${JSON.stringify(value)}`);
    },
    onError: error => {
        console.error('Error occurred:', error.message);
        // Handle error or retry with new parser instance
    },
});

try {
    await parser.parseStream(stream);
} catch (error) {
    console.error('Fatal error:', error);
}
```

## Error Types and Recovery Methods

For detailed error handling methods and best practices, see the [Error Handling Guide](doc/spec/error-handling.md).

## Limitations

- **Root-level primitive values are not supported**: Only JSON objects (`{}`) and arrays (`[]`) are supported as root values. Root-level primitive values like `42`, `"string"`, `true`, `false`, or `null` will result in an error. This is a design decision to focus on structured JSON data.

## Requirements

- Modern browsers
- Node.js 20.0.0 or higher
- Full support for ES modules and CommonJS
