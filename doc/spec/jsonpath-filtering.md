# JsonPath Filtering Specification

## Overview

json-stream-parser implements a **restricted JsonPath subset** for the `acceptableJsonPath` option. This specification defines the supported patterns and matching behavior for filtering JSON values during streaming.

**Key Restriction**: Wildcards (`*`) are only supported at the end of patterns. Recursive wildcards (`**`) are not supported.

## Supported Patterns

### 1. Exact Path Match

Matches a specific path exactly.

```javascript
'$.name'              // Root property
'$.user.email'        // Nested property
'$.users[0].name'     // Array element property
```

**Examples:**

| Pattern          | Matches                           | Does Not Match |
| ---------------- | --------------------------------- | -------------- |
| `$.name`         | `$.name`                          | `$.name.first`, `$.user.name` |
| `$.user.email`   | `$.user.email`                    | `$.user`, `$.email` |

### 2. Object Wildcard (End of Pattern Only)

Matches all direct properties of an object (one level only).

```javascript
'$.*'               // All root object properties
'$.config.*'        // All properties of config object
'$.user.settings.*' // All properties of user.settings object
```

**Behavior:**
- Matches only **direct children** (one level)
- Does not match nested properties

**Examples:**

| Pattern      | Matches                           | Does Not Match |
| ------------ | --------------------------------- | -------------- |
| `$.*`        | `$.name`, `$.age`, `$.email`      | `$.user.name`, `$[0]` |
| `$.config.*` | `$.config.host`, `$.config.port`  | `$.config`, `$.config.db.host` |

### 3. Array Wildcard (End of Pattern Only)

Matches all elements of an array.

```javascript
'$[*]'          // All elements of root array
'$.users[*]'    // All elements of users array
'$.data.items[*]' // All elements of data.items array
```

**Behavior:**
- Matches complete array elements (objects, primitives, nested arrays)
- Does not match properties within array elements

**Examples:**

| Pattern      | Matches                           | Does Not Match |
| ------------ | --------------------------------- | -------------- |
| `$[*]`       | `$[0]`, `$[1]`, `$[2]`            | `$`, `$[0].name` |
| `$.users[*]` | `$.users[0]`, `$.users[1]`        | `$.users`, `$.users[0].email` |

## Unsupported Patterns

The following patterns are **not supported** in this specification:

### 1. Specific Array Index

```javascript
// ❌ Not supported
'$[0]'              // Specific array index
'$.users[0]'        // Specific user
'$.users[0].name'   // Property of specific element

// ✅ Alternative
'$[*]'              // Get all elements, filter by index in application code
'$.users[*]'        // Get all users, access first in application code
```

### 2. Mid-path Wildcards

```javascript
// ❌ Not supported
'$.users[*].email'     // Wildcard followed by property
'$.departments.*.name' // Wildcard followed by property
'$.*.*.value'          // Multiple wildcards

// ✅ Alternative
'$.users[*]'           // Get user objects, access .email from each
'$.departments.*'      // Get department objects, access .name from each
```

**Example application code:**

```javascript
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.users[*]']  // Get user objects
});

for await (const { path, value } of stream) {
    console.log(value.email);  // Access email property from object
}
```

### 3. Recursive Descent (Deep Wildcard)

```javascript
// ❌ Not supported
'$.**'              // Recursive wildcard - all descendant values
'$.**.email'        // Deep wildcard followed by property
'$.data.**.id'      // Path before/after deep wildcard

// ✅ Alternative
'$.*'               // Get root-level properties, filter by path in application code
['$.email', '$.user.email', '$.users[*]']  // Enumerate specific paths
```

**Example application code:**

```javascript
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['$.*']  // Get all root-level properties
});

for await (const { path, value } of stream) {
    if (path.endsWith('.email')) {
        console.log(value);  // Process only email fields
    }
}
```

## Pattern Matching Behavior

### Multiple Patterns

When multiple patterns are specified, a value is emitted if it matches **any** pattern:

```javascript
acceptableJsonPath: [
    '$.name',           // Exact match
    '$.users[*]',       // Array elements
    '$.config.*'        // Object properties
]
```

**Evaluation:**
- Patterns are evaluated in array order
- First match wins (subsequent patterns are not checked)
- OR logic: match any pattern

### Pattern Priority

All patterns have equal priority. Order matters only for performance (commonly matched patterns should be listed first).

## Configuration

### JsonTransformStream Options

```typescript
interface JsonTransformStreamOptions {
    acceptableJsonPath: string[];  // Required, non-empty array
}
```

**Requirements:**
- `acceptableJsonPath` is **required**
- Must be a non-empty array
- Each element must be a string

**Examples:**

```javascript
// ✅ Valid
new JsonTransformStream({ acceptableJsonPath: ['$.users[*]'] });
new JsonTransformStream({ acceptableJsonPath: ['$.*'] });
new JsonTransformStream({ acceptableJsonPath: ['$.name', '$.email'] });

// ❌ Invalid
new JsonTransformStream({});  // Error: acceptableJsonPath is required
new JsonTransformStream({ acceptableJsonPath: [] });  // Error: empty array
new JsonTransformStream({ acceptableJsonPath: ['$.**'] });  // Error: recursive wildcard not supported
```

### JsonStreamParser Options

```typescript
interface JsonStreamParserOptions extends JsonTransformStreamOptions {
    acceptableJsonPath: string[];  // Required, inherited from JsonTransformStreamOptions
    onValueParsed?: (path: string, value: JsonValue) => void;
    onError?: (error: JsonStreamParserError) => void;
}
```

## Error Handling

### Missing acceptableJsonPath

**Error Type:** Constructor error
**Message:** `"acceptableJsonPath is required. Please specify at least one JsonPath pattern."`

```javascript
// Throws error
const transformer = new JsonTransformStream({});
```

### Empty acceptableJsonPath

**Error Type:** Constructor error
**Message:** `"acceptableJsonPath is required. Please specify at least one JsonPath pattern."`

```javascript
// Throws error
const transformer = new JsonTransformStream({ acceptableJsonPath: [] });
```

### Invalid Patterns

Invalid patterns (e.g., malformed syntax) do not throw errors. They simply don't match any values.

```javascript
// No error, but no matches
const transformer = new JsonTransformStream({
    acceptableJsonPath: ['invalid syntax!!!']
});
```

## Pattern Examples

### Example 1: Extract Specific Fields

```javascript
// Input JSON
{
    "name": "Alice",
    "email": "alice@example.com",
    "age": 30
}

// Pattern
acceptableJsonPath: ['$.name', '$.email']

// Emitted values
{ path: '$.name', value: 'Alice' }
{ path: '$.email', value: 'alice@example.com' }
// $.age is NOT emitted
```

### Example 2: Extract All User Objects

```javascript
// Input JSON
{
    "users": [
        { "id": 1, "email": "alice@example.com" },
        { "id": 2, "email": "bob@example.com" }
    ]
}

// Pattern
acceptableJsonPath: ['$.users[*]']

// Emitted values
{ path: '$.users[0]', value: { id: 1, email: 'alice@example.com' } }
{ path: '$.users[1]', value: { id: 2, email: 'bob@example.com' } }
```

### Example 3: Extract All Configuration Properties

```javascript
// Input JSON
{
    "config": {
        "host": "localhost",
        "port": 8080,
        "ssl": {
            "enabled": true
        }
    }
}

// Pattern
acceptableJsonPath: ['$.config.*']

// Emitted values (one level only)
{ path: '$.config.host', value: 'localhost' }
{ path: '$.config.port', value: 8080 }
{ path: '$.config.ssl', value: { enabled: true } }
// $.config.ssl.enabled is NOT emitted (not direct child)
```

### Example 4: Extract All Root-Level Properties

```javascript
// Input JSON
{ "name": "Alice", "age": 30, "address": { "city": "Tokyo" } }

// Pattern
acceptableJsonPath: ['$.*']

// Emitted values
{ path: '$.name', value: 'Alice' }
{ path: '$.age', value: 30 }
{ path: '$.address', value: { city: 'Tokyo' } }
```

## Implementation Notes

### Internal Components

1. **JsonPath** (`src/json-path.js`)
   - Pre-parses patterns into optimized instances at initialization
   - Determines pattern type (exact/array_wildcard/object_wildcard/recursive_wildcard)
   - Pre-compiles regular expressions for array wildcard patterns
   - Provides high-speed instance methods: `match()` and `isParentOf()`

2. **JsonTransformStream** (`src/json-transform-stream.js`)
   - Parses all `acceptableJsonPath` patterns once in constructor
   - Stores parsed JsonPath instances in `options.parsedJsonPaths`
   - Shares instances across all child parsers via options
   - Uses instance methods for O(1) matching without regex recompilation

3. **ParserBase** (`src/parser/parser-base.js`)
   - Receives parsed JsonPath instances through options
   - Filters values using pre-parsed instances
   - Only enqueues matching values to stream

### Performance Characteristics

- **Initialization**: O(p) where p = number of patterns (one-time cost)
- **Matching**: O(1) per pattern check (regex pre-compiled, no string parsing)
- **Space Complexity**: O(p) for storing parsed instances
- **Optimization**: Pattern parsing and regex compilation happen only once at initialization

## Relationship to RFC 9535

This specification implements a **restricted subset** of RFC 9535 (JSONPath standard):

**Supported from RFC 9535:**
- Root identifier (`$`)
- Dot notation (`.field`)
- Bracket notation (`[*]`)
- Wildcard selectors (`*`) - only at pattern end

**Not Supported from RFC 9535:**
- Array slices (`[0:5]`)
- Filter expressions (`[?(@.price < 10)]`)
- Script expressions
- Union/set operations
- Recursive descent / Descendant operator (`**`, `$.**`, `$..email`)
- Specific array indices (`[0]`, `[1]`)
- Mid-path wildcards (`$.users[*].email`)

**Design Rationale:**
- Simplicity: Easier to implement and understand
- Performance: Faster matching for streaming use cases
- Predictability: Clear, unambiguous behavior

## See Also

- [API Reference](api-reference.md) - Complete API documentation
- [Error Handling Specification](error-handling.md) - Error handling guide
- [RFC 9535](../rfc/rfc9535.txt) - JSONPath standard specification
