# Error Handling Specification

## Overview

The json-stream-parser library provides error handling for parsing issues:

- **JsonTransformStream** (Streams API, recommended): Throws `JsonStreamParserError` with descriptive messages
- **JsonStreamParser** (Legacy API): Also uses `JsonStreamParserError` class with optional error callback

Both APIs use the same error class for consistency.

## JsonStreamParserError

`JsonStreamParserError` is a simple error class that extends the standard JavaScript `Error`:

```javascript
class JsonStreamParserError extends Error {
    readonly name: 'JsonStreamParserError';
    constructor(message: string);
}
```

**Properties:**
- `name`: `"JsonStreamParserError"`
- `message`: Descriptive error message
- `stack`: Stack trace for debugging

For complete details on `JsonStreamParserError`, see [JsonStreamParserError Specification](jsonstream-parser-error.md).

## Error Categories

### 1. Invalid JSON Start

**Description**: The first non-whitespace character is not a valid JSON start character.

**Error Message**: `"Unexpected character '<char>' at start of JSON. Expected '{', '[', string, number, boolean, or null."`

**Common Causes**:
- Input starts with invalid character (not `{`, `[`, `"`, digit, `t`, `f`, or `n`)
- Typos or corrupted data at the start

**Examples**:
```javascript
// Invalid start character
invalid  // Error: Unexpected character 'i' at start of JSON. Expected '{', '[', string, number, boolean, or null.

// Unquoted string
hello  // Error: Unexpected character 'h' at start of JSON. Expected '{', '[', string, number, boolean, or null.
```

**Note**: Root-level primitives (numbers, strings, booleans, null) ARE supported per RFC 8259.

---

### 2. Structural Errors

**Description**: Issues with JSON structure during parsing.

**Error Messages**:
- `"Trailing comma before closing brace in object at ..."`
- `"Trailing comma before closing bracket in array at ..."`
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
{"name": "Alice",}  // Error: Trailing comma before closing brace in object at ...

// Trailing comma in array
[1, 2,]  // Error: Trailing comma before closing bracket in array at ...

// Unquoted key
{name: "Alice"}  // Error: Unexpected character in object: 'n'
```

---

### 3. Incomplete JSON

**Description**: JSON stream ends unexpectedly before parsing completes.

**Error Messages**:
- `"Incomplete JSON data: The stream is empty or contains only whitespace. Expected a valid JSON value."`
- `"Incomplete JSON data: The JSON structure is not complete. Check for missing closing brackets or braces."`

**Common Causes**:
- Empty input stream
- Whitespace-only input
- Truncated JSON (missing closing brackets/braces)
- Network interruption during streaming

**Examples**:
```javascript
// Empty stream
""  // Error: Incomplete JSON data: The stream is empty or contains only whitespace. Expected a valid JSON value.

// Whitespace only
"   \n\t  "  // Error: Incomplete JSON data: The stream is empty or contains only whitespace. Expected a valid JSON value.

// Truncated object
{"name": "Alice", "age":  // Error: Incomplete JSON data: The JSON structure is not complete. Check for missing closing brackets or braces.

// Truncated array
[1, 2, 3  // Error: Incomplete JSON data: The JSON structure is not complete. Check for missing closing brackets or braces.
```

---

### 4. Extra Characters After JSON

**Description**: Non-whitespace characters appear after the root JSON value completes.

**Error Message**: `"Unexpected character '<char>' after JSON. Only one top-level JSON value is allowed."`

**Common Causes**:
- Multiple root values (RFC 8259 violation)
- Trailing non-whitespace data

**Examples**:
```javascript
// Multiple root objects
{"a": 1}{"b": 2}  // Error: Unexpected character '{' after JSON. Only one top-level JSON value is allowed.

// Multiple root arrays
[1, 2][3, 4]  // Error: Unexpected character '[' after JSON. Only one top-level JSON value is allowed.

// Trailing data
{"valid": true}extra  // Error: Unexpected character 'e' after JSON. Only one top-level JSON value is allowed.
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

---

## Error Handling Best Practices

### 1. Always Wrap Stream Reading in Try-Catch

```javascript
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
    // Handle error appropriately
}
```

### 2. Use Error Messages for Debugging

```javascript
try {
    const resultStream = inputStream.pipeThrough(new JsonTransformStream({ acceptableJsonPath: ['$.*'] }));
    const reader = resultStream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processValue(value);
    }
} catch (error) {
    // error is JsonStreamParserError instance
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
    const resultStream = inputStream.pipeThrough(new JsonTransformStream({ acceptableJsonPath: ['$.*'] }));
    const reader = resultStream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processValue(value);
    }
} catch (error) {
    // Log complete error information
    console.error('=== JSON Parsing Error ===');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================');

    // Send to monitoring service
    logger.error('JSON parsing failed', {
        name: error.name,
        message: error.message,
        stack: error.stack
    });
}
```

### 4. Handle Incomplete Streams Gracefully

```javascript
const transformer = new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
const resultStream = inputStream.pipeThrough(transformer);
const reader = resultStream.getReader();

try {
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processValue(value);
    }
} catch (error) {
    // error is JsonStreamParserError instance
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
// "Incomplete JSON data: The stream is empty or contains only whitespace. Expected a valid JSON value."
```

**Solution**: Ensure input stream contains valid JSON data.

---

### Scenario 2: Multiple Root Values

```javascript
// Input: {"a": 1}{"b": 2}

// Error message:
// "Unexpected character '{' after JSON. Only one top-level JSON value is allowed."
```

**Solution**: RFC 8259 allows only one root value. Wrap multiple objects in an array: `[{"a": 1}, {"b": 2}]`

---

### Scenario 3: Primitive Root Values

```javascript
// Input: 42
// or: "hello"
// or: true
```

**Note**: Primitive root values ARE supported per RFC 8259. These should parse successfully.

**If you get errors**: Ensure the values are properly formatted (e.g., strings must be quoted: `"hello"`, not `hello`)

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

All `JsonTransformStream` errors are non-recoverable. When an error occurs:

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

`JsonTransformStream` error handling:

| Error Category | Typical Message Pattern | Recovery |
|---------------|------------------------|----------|
| Invalid JSON Start | `"Unexpected character '<char>' at start of JSON..."` | Fix invalid start character |
| Structural Errors | `"Trailing comma..."`, `"Unexpected character..."` | Fix JSON structure per RFC 8259 |
| Incomplete JSON | `"Incomplete JSON data: The stream is empty..."`, `"Incomplete JSON data: The JSON structure is not complete..."` | Ensure complete JSON data |
| Extra Characters | `"Unexpected character '<char>' after JSON..."` | Remove extra data or wrap in array |
| Invalid Values | Native parser errors | Fix literals, numbers, escapes |

All `JsonStreamParserError` objects provide:
- `name`: `"JsonStreamParserError"`
- `message`: Descriptive error message
- `stack`: Stack trace for debugging

Use the error message to diagnose issues and fix the JSON input data.

---

## See Also

- [JsonStreamParserError Specification](jsonstream-parser-error.md) - Error class details
- [API Reference](api-reference.md) - API documentation
