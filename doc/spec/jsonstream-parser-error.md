# JsonStreamParserError Specification

## Overview

`JsonStreamParserError` is a custom error class for JSON parsing errors. It provides structured error information with properties for debugging and error handling.

## Properties

- **`name`**: `"JsonStreamParserError"` (string)
- **`message`**: Error description (string)
- **`type`**: Error type - `'PARSE'`, `'STRUCTURE'`, `'ENCODING'`, or `'VALIDATION'` (string)
- **`position`**: Byte position where error occurred (number)
- **`path`**: JsonPath location where error occurred, e.g., `'$.users[0].name'` (string | null)
- **`recoverable`**: Whether error can be recovered from - currently always `false` (boolean)

## Constructor

```javascript
const { JsonStreamParserError } = require('json-stream-parser');

const error = new JsonStreamParserError(message, options);
```

**Parameters:**

- `message`: Error description (string)
- `options`: Object (optional)
  - `position`: Byte position where error occurred (number, default: 0)
  - `path`: JsonPath location (string | null, default: null)
  - `type`: Error type (string, default: 'PARSE')
  - `recoverable`: Whether error is recoverable (boolean, default: false)

**Example:**

```javascript
const error = new JsonStreamParserError('Unexpected character', {
    position: 42,
    path: '$.data',
    type: 'PARSE',
    recoverable: false
});
```

## Factory Methods

`JsonStreamParserError` provides static factory methods for creating typed errors:

### `JsonStreamParserError.parse(message, position?, path?)`

Creates a parsing error (`type: 'PARSE'`).

```javascript
const error = JsonStreamParserError.parse('Unexpected character', 42, '$.data');
// type: 'PARSE', position: 42, path: '$.data'
```

### `JsonStreamParserError.structure(message, position?, path?)`

Creates a structural error (`type: 'STRUCTURE'`).

```javascript
const error = JsonStreamParserError.structure('Missing closing brace', 100, '$.object');
// type: 'STRUCTURE', position: 100, path: '$.object'
```

### `JsonStreamParserError.encoding(message, position?)`

Creates an encoding error (`type: 'ENCODING'`).

```javascript
const error = JsonStreamParserError.encoding('Invalid UTF-8 sequence', 50);
// type: 'ENCODING', position: 50, path: null
```

### `JsonStreamParserError.validation(message, position?, path?)`

Creates a validation error (`type: 'VALIDATION'`).

```javascript
const error = JsonStreamParserError.validation('Invalid value type', 75, '$.value');
// type: 'VALIDATION', position: 75, path: '$.value'
```

### `JsonStreamParserError.from(error, options?)`

Converts a standard Error to JsonStreamParserError.

```javascript
try {
    JSON.parse(invalidJson);
} catch (err) {
    const error = JsonStreamParserError.from(err, {
        type: 'PARSE',
        position: 42,
        path: '$.data'
    });
}
```

## Instance Methods

### `toJSON()`

Returns a plain object representation of the error.

```javascript
const error = JsonStreamParserError.parse('Test error', 42, '$.data');
const json = error.toJSON();

console.log(json);
// {
//   name: 'JsonStreamParserError',
//   message: 'Test error',
//   position: 42,
//   path: '$.data',
//   type: 'PARSE',
//   recoverable: false
// }
```

### `toString()`

Returns a string representation of the error.

```javascript
const error = JsonStreamParserError.parse('Test error', 42, '$.data');
console.log(error.toString());
// "JsonStreamParserError [PARSE] at $.data (position: 42): Test error"
```

## Error Types

### PARSE

Parsing errors occur when invalid JSON syntax is encountered.

**Common causes:**
- Invalid characters
- Malformed values
- Invalid escape sequences

**Example:**
```javascript
JsonStreamParserError.parse('Unexpected character: "x"', 10, '$.field')
```

### STRUCTURE

Structural errors occur when JSON structure is invalid.

**Common causes:**
- Missing closing brackets/braces
- Trailing commas
- Missing colons in objects

**Example:**
```javascript
JsonStreamParserError.structure('Missing closing brace', 100, '$.object')
```

### ENCODING

Encoding errors occur when invalid UTF-8 byte sequences are encountered.

**Common causes:**
- Invalid UTF-8 byte sequences
- Incomplete multi-byte characters at chunk boundaries

**Example:**
```javascript
JsonStreamParserError.encoding('Invalid UTF-8 sequence', 50)
```

### VALIDATION

Validation errors occur when values don't meet expected constraints.

**Common causes:**
- Invalid value types
- Values outside expected ranges
- Constraint violations

**Example:**
```javascript
JsonStreamParserError.validation('Invalid value type', 75, '$.value')
```

## Usage with JsonStreamParser

`JsonStreamParserError` is used with the `JsonStreamParser` class:

```javascript
const { JsonStreamParser } = require('json-stream-parser');

const parser = new JsonStreamParser({
    onValueParsed: (path, value) => {
        console.log(`${path}: ${value}`);
    },
    onError: error => {
        // error is JsonStreamParserError instance
        console.error(`Error at ${error.path}:`, error.message);
        console.error(`Position: ${error.position}, Type: ${error.type}`);
    }
});

try {
    await parser.parseStream(stream);
} catch (error) {
    // If onError is not provided, errors are thrown
    if (error instanceof JsonStreamParserError) {
        console.error('Parsing failed:', error.toJSON());
    }
}
```

## Note on JsonTransformer

**Important:** `JsonTransformer` (the recommended Streams API) does **not** use `JsonStreamParserError`. It throws standard JavaScript `Error` objects with descriptive messages.

`JsonStreamParserError` is only relevant when using the legacy `JsonStreamParser` API.

For details on `JsonTransformer` error handling, see [Error Handling Specification](error-handling.md).

## TypeScript Support

Full TypeScript type definitions are provided:

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

## See Also

- [Error Handling Specification](error-handling.md) - Complete error handling guide
- [API Reference](api-reference.md) - API documentation
