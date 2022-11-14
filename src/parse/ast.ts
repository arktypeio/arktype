import type {
    SerializablePrimitive,
    serializePrimitive
} from "../utils/primitiveSerialization.js"

export type astToString<ast, result extends string = ""> = ast extends [
    infer head,
    ...infer tail
]
    ? astToString<tail, `${result}${astToString<head>}`>
    : ast extends SerializablePrimitive
    ? `${result}${serializePrimitive<ast>}`
    : "..."
