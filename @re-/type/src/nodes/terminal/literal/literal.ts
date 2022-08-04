import {
    RegexLiteralDefinition,
    StringLiteralDefinition
} from "./enclosed/index.js"
import {
    BigintLiteralDefinition,
    NumberLiteralDefinition
} from "./numeric/index.js"

export type LiteralDefinition =
    | StringLiteralDefinition
    | RegexLiteralDefinition
    | NumberLiteralDefinition
    | BigintLiteralDefinition

export type InferLiteral<Token extends string> =
    Token extends StringLiteralDefinition<infer Value>
        ? Value
        : Token extends RegexLiteralDefinition
        ? string
        : Token extends NumberLiteralDefinition<infer Value>
        ? Value
        : Token extends BigintLiteralDefinition<infer Value>
        ? Value
        : unknown
