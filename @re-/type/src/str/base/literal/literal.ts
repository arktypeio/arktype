import {
    RegexLiteralDefinition,
    StringLiteralDefinition
} from "./enclosed/index.js"
import {
    BigintLiteralDefinition,
    NumberLiteralDefinition
} from "./numeric/index.js"

export type EnclosedLiteralDefinition =
    | StringLiteralDefinition
    | RegexLiteralDefinition

export type UnenclosedLiteralDefinition =
    | NumberLiteralDefinition
    | BigintLiteralDefinition

export type LiteralDefinition =
    | EnclosedLiteralDefinition
    | UnenclosedLiteralDefinition

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
