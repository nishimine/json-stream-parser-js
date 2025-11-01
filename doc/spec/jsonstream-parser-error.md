# JsonStreamParserError Specification

## Overview

`JsonStreamParserError` is a custom error class for JSON parsing errors. It extends the standard JavaScript `Error` class.

## Class Definition

```javascript
class JsonStreamParserError extends Error {
    readonly name: 'JsonStreamParserError';
    constructor(message: string);
}
```

## Properties

- **`name`**: `"JsonStreamParserError"` (string) - Error class name
- **`message`**: Error description (string) - Inherited from `Error`
- **`stack`**: Stack trace (string) - Inherited from `Error`

## Constructor

```javascript
const { JsonStreamParserError } = require('@nishimine/json-stream-parser');

const error = new JsonStreamParserError('Unexpected character');
```

**Parameters:**

- `message`: Error description (string)

**Example:**

```javascript
const error = new JsonStreamParserError('Trailing comma before closing brace in object');
console.log(error.name);    // 'JsonStreamParserError'
console.log(error.message); // 'Trailing comma before closing brace in object'
```

## Common Error Messages

### Structural Errors

- `"Unexpected character '...' at start of JSON. Expected '{', '[', string, number, boolean, or null."`
- `"Trailing comma before closing brace in object at ..."`
- `"Trailing comma before closing bracket in array at ..."`
- `"Unexpected comma at ..."`
- `"Unexpected character '...' at ..."`

### Incomplete JSON

- `"Incomplete JSON data: The stream is empty or contains only whitespace. Expected a valid JSON value."`
- `"Incomplete JSON data: The JSON structure is not complete. Check for missing closing brackets or braces."`

### Multiple Root Values

- `"Unexpected character '...' after JSON. Only one top-level JSON value is allowed."`

### Invalid Values

- `"Invalid literal start character: '...'"`
- `"JSON.parse error: ..."` (from native parser)

## Usage with JsonStreamParser

```javascript
const { JsonStreamParser } = require('@nishimine/json-stream-parser');

const parser = new JsonStreamParser({
    acceptableJsonPath: ['$.*'],
    onValueParsed: (path, value) => {
        console.log(`${path}: ${JSON.stringify(value)}`);
    },
    onError: error => {
        // error is JsonStreamParserError instance
        console.error('Parsing failed:', error.message);
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
    // If onError is not provided, errors are thrown
    if (error instanceof JsonStreamParserError) {
        console.error('Error:', error.message);
    }
}
```

## Usage with JsonTransformStream

```javascript
const { JsonTransformStream } = require('@nishimine/json-stream-parser');

const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });

try {
    const resultStream = inputStream.pipeThrough(transformer);
    const reader = resultStream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        console.log(value);
    }
} catch (error) {
    // error is JsonStreamParserError instance
    console.error('JSON parsing error:', error.message);
}
```

## TypeScript Support

Full TypeScript type definitions are provided:

```typescript
export class JsonStreamParserError extends Error {
    readonly name: 'JsonStreamParserError';
    constructor(message: string);
}
```

## See Also

- [Error Handling Specification](error-handling.md) - Complete error handling guide
- [API Reference](api-reference.md) - API documentation
