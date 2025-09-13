# Error Handling Specification

## Overview

The json-stream-parser library provides error handling for parsing issues:

- **JsonTransformer** (Streams API, recommended): Throws standard `Error` with descriptive messages
- **JsonStreamParser** (Legacy API): Can use `JsonStreamParserError` class for structured error information

This specification focuses on `JsonTransformer` error handling, as it is the recommended API.

## JsonTransformer Error Categories

`JsonTransformer` throws standard `Error` objects with descriptive messages. Errors fall into these categories:

### 1. Invalid JSON Start

**Description**: The first non-whitespace character is not a valid JSON start character.

**Error Message**: `"Unexpected character at start of JSON: '<char>'"`

**Common Causes**:
- Input starts with invalid character (not `{`, `[`)
- Root-level primitive values (numbers, strings, booleans, null) are not supported

**Examples**:
```javascript
// Invalid start character
"invalid"  // Error: Unexpected character at start of JSON: 'i'

// Root-level primitive (not supported)
42  // Error: Unexpected character at start of JSON: '4'
"hello"  // Error: Unexpected character at start of JSON: '"'
true  // Error: Unexpected character at start of JSON: 't'
```

**Recovery**: Ensure JSON starts with `{` or `[`. Wrap primitives in object/array.

---

### 2. Structural Errors

**Description**: Issues with JSON structure during parsing.

**Error Messages**:
- `"Trailing comma before closing brace in object"`
- `"Trailing comma before closing bracket in array"`
- `"Unexpected comma in object"`
- `"Unexpected comma in array"`
- `"Unexpected character in object: '<char>'"`
- `"Unexpected character in array: '<char>'"`

**Common Causes**:
- Trailing commas in objects or arrays
- Missing colons in object properties
- Missing commas between elements
- Unquoted object keys
- Misplaced characters

**Examples**:
```javascript
// Trailing comma in object
{"name": "Alice",}  // Error: Trailing comma before closing brace in object

// Trailing comma in array
[1, 2,]  // Error: Trailing comma before closing bracket in array

// Unquoted key
{name: "Alice"}  // Error: Unexpected character in object: 'n'
```

**Recovery**: Fix JSON structure according to RFC 8259.

---

### 3. Incomplete JSON

**Description**: JSON stream ends unexpectedly before parsing completes.

**Error Messages**:
- `"Incomplete JSON data: empty or whitespace-only stream"`
- `"Incomplete JSON data"`

**Common Causes**:
- Empty input stream
- Whitespace-only input
- Truncated JSON (missing closing brackets/braces)
- Network interruption during streaming

**Examples**:
```javascript
// Empty stream
""  // Error: Incomplete JSON data: empty or whitespace-only stream

// Whitespace only
"   \n\t  "  // Error: Incomplete JSON data: empty or whitespace-only stream

// Truncated object
{"name": "Alice", "age":  // Error: Incomplete JSON data

// Truncated array
[1, 2, 3  // Error: Incomplete JSON data
```

**Recovery**: Ensure complete JSON data is sent. Check network/stream integrity.

---

### 4. Extra Characters After JSON

**Description**: Non-whitespace characters appear after the root JSON value completes.

**Error Message**: `"Unexpected character after JSON: '<char>'"`

**Common Causes**:
- Multiple root values (RFC 8259 violation)
- Trailing non-whitespace data

**Examples**:
```javascript
// Multiple root objects
{"a": 1}{"b": 2}  // Error: Unexpected character after JSON: '{'

// Multiple root arrays
[1, 2][3, 4]  // Error: Unexpected character after JSON: '['

// Trailing data
{"valid": true}extra  // Error: Unexpected character after JSON: 'e'
```

**Recovery**: Remove extra data or wrap multiple values in an array: `[{"a": 1}, {"b": 2}]`

---

### 5. Invalid Values

**Description**: Invalid literal values or number formats.

**Error Messages**:
- `"Invalid literal start character: '<char>'"`
- Various JSON.parse() errors from native parser

**Common Causes**:
- Invalid boolean/null literals (e.g., `True`, `NULL`, `tru`)
- Invalid number formats (leading zeros, multiple decimal points)
- Invalid escape sequences in strings
- Incomplete Unicode escapes

**Examples**:
```javascript
// Invalid literal
{"value": tru}  // Error during parsing

// Invalid number
{"value": 01234}  // Error during parsing

// Invalid escape
{"value": "test\x"}  // Error during parsing

// Incomplete Unicode
{"value": "test\u12"}  // Error during parsing
```

**Recovery**: Use valid JSON literal syntax per RFC 8259.

## JsonTransformer Error Properties

`JsonTransformer` throws standard JavaScript `Error` objects with these properties:

- **`name`** (string): `"Error"`
- **`message`** (string): Descriptive error message (see categories above)
- **`stack`** (string): Stack trace for debugging

**Note**: `JsonTransformer` does not provide structured error properties like `position`, `path`, or `type`. Error messages contain all necessary diagnostic information.

## Error Handling Best Practices

### 1. Always Wrap Stream Reading in Try-Catch

```javascript
const transformer = new JsonTransformer();

try {
    const resultStream = inputStream.pipeThrough(transformer);
    const reader = resultStream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        console.log(value);
    }
} catch (error) {
    console.error('JSON parsing error:', error.message);
    // Handle error appropriately
}
```

### 2. Check Error Message for Specific Handling

```javascript
try {
    const resultStream = inputStream.pipeThrough(new JsonTransformer());
    const reader = resultStream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processValue(value);
    }
} catch (error) {
    if (error.message.includes('Incomplete JSON')) {
        console.error('JSON data is incomplete or truncated');
        console.error('Check if stream was interrupted');
    } else if (error.message.includes('Unexpected character at start')) {
        console.error('Invalid JSON start. Must begin with { or [');
    } else if (error.message.includes('Trailing comma')) {
        console.error('JSON contains trailing commas (not allowed in RFC 8259)');
    } else if (error.message.includes('Unexpected character after JSON')) {
        console.error('Multiple root values detected. Wrap in array if needed.');
    } else {
        console.error('JSON parsing error:', error.message);
    }
}
```

### 3. Log Full Error for Debugging

```javascript
try {
    const resultStream = inputStream.pipeThrough(new JsonTransformer());
    const reader = resultStream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processValue(value);
    }
} catch (error) {
    // Log complete error information
    console.error('=== JSON Parsing Error ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================');

    // Send to monitoring service
    logger.error('JSON parsing failed', {
        message: error.message,
        stack: error.stack
    });
}
```

### 4. Handle Incomplete Streams Gracefully

```javascript
const transformer = new JsonTransformer();
const resultStream = inputStream.pipeThrough(transformer);
const reader = resultStream.getReader();

try {
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processValue(value);
    }
} catch (error) {
    if (error.message.includes('Incomplete JSON data')) {
        console.error('Stream ended unexpectedly');
        console.error('Possible causes: network interruption, truncated file');
        // Retry logic or partial result handling
    } else {
        throw error; // Re-throw other errors
    }
}
```

## Common Error Scenarios

### Scenario 1: Empty or Whitespace-Only Input

```javascript
// Input: ""
// or: "   \n\t  "

// Error message:
// "Incomplete JSON data: empty or whitespace-only stream"
```

**Solution**: Ensure input stream contains valid JSON data.

---

### Scenario 2: Multiple Root Values

```javascript
// Input: {"a": 1}{"b": 2}

// Error message:
// "Unexpected character after JSON: '{'"
```

**Solution**: RFC 8259 allows only one root value. Wrap multiple objects in an array: `[{"a": 1}, {"b": 2}]`

---

### Scenario 3: Primitive Root Values

```javascript
// Input: 42
// or: "hello"
// or: true

// Error message:
// "Unexpected character at start of JSON: '4'"
// "Unexpected character at start of JSON: '"'"
// "Unexpected character at start of JSON: 't'"
```

**Solution**: Wrap primitive in an object or array: `{"value": 42}` or `[42]`

---

### Scenario 4: Invalid Number Format

```javascript
// Input: {"value": 01234}

// Error thrown during native JSON.parse() call
```

**Solution**: Use valid JSON number format: `{"value": 1234}`

---

### Scenario 5: UTF-8 Encoding

The parser automatically handles multi-byte UTF-8 characters split across chunk boundaries by buffering incomplete sequences. Invalid UTF-8 byte sequences will throw errors from the native `TextDecoder`:

```javascript
// Invalid UTF-8 sequence in chunk
const invalidBytes = new Uint8Array([0xFF, 0xFE]);
// Error from TextDecoder
```

**Solution**: Ensure input stream contains valid UTF-8 data.

## Error Recovery Guidelines

All `JsonTransformer` errors are non-recoverable. When an error occurs:

1. **Stop Processing**: Transformer state becomes invalid
2. **Report Error**: Log error message and stack trace
3. **Fix Source**: Correct the JSON data
4. **Retry**: Create new transformer instance with corrected input

The parser does not support:
- Lenient parsing modes
- Automatic error correction
- Partial result extraction from malformed JSON

All errors require fixing the input data before retrying.

## Testing Error Handling

The library includes comprehensive error tests in `test/json-transformer-error-handling.test.js`:

- Syntax errors (invalid characters, missing brackets)
- Structure errors (trailing commas, unquoted keys)
- Number format errors (leading zeros, invalid notation)
- Literal errors (invalid boolean/null values)
- Incomplete JSON (truncated objects/arrays)
- Escape sequence errors
- Multiple root values
- Deep nesting (up to 1000 levels)

Run error tests:
```bash
npm test -- json-transformer-error-handling.test.js
```

## Summary

`JsonTransformer` error handling:

| Error Category | Typical Message Pattern | Recovery |
|---------------|------------------------|----------|
| Invalid JSON Start | `"Unexpected character at start of JSON: '<char>'"` | Fix JSON to start with `{` or `[` |
| Structural Errors | `"Trailing comma..."`, `"Unexpected character..."` | Fix JSON structure per RFC 8259 |
| Incomplete JSON | `"Incomplete JSON data..."` | Ensure complete JSON data |
| Extra Characters | `"Unexpected character after JSON: '<char>'"` | Remove extra data or wrap in array |
| Invalid Values | Native parser errors | Fix literals, numbers, escapes |

All errors provide:
- Descriptive error message
- Stack trace for debugging

Use error messages to diagnose issues and guide users toward corrections.

---

## JsonStreamParserError (Legacy API)

The `JsonStreamParserError` class is available for use with the legacy `JsonStreamParser` API. It provides structured error information with these properties:

- **`name`**: `"JsonStreamParserError"`
- **`message`**: Error description
- **`type`**: Error type (`'PARSE'|'STRUCTURE'|'ENCODING'|'VALIDATION'`)
- **`position`**: Byte position where error occurred
- **`path`**: JsonPath location (e.g., `$.users[0].name`)
- **`recoverable`**: Whether error can be recovered from (currently always `false`)

### Factory Methods

```javascript
const { JsonStreamParserError } = require('json-stream-parser');

// Create typed errors
JsonStreamParserError.parse(message, position, path);
JsonStreamParserError.structure(message, position, path);
JsonStreamParserError.encoding(message, position);
JsonStreamParserError.validation(message, position, path);
JsonStreamParserError.from(error, options);
```

### Example

```javascript
try {
    throw JsonStreamParserError.parse('Unexpected character', 42, '$.data');
} catch (error) {
    console.log(error.name);     // 'JsonStreamParserError'
    console.log(error.type);     // 'PARSE'
    console.log(error.position); // 42
    console.log(error.path);     // '$.data'
    console.log(error.toJSON()); // Complete error info as object
}
```

**Note**: `JsonTransformer` does not use `JsonStreamParserError`. This class is only relevant when using the legacy `JsonStreamParser` API.
