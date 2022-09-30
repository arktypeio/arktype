import type { Evaluate } from "@re-/tools"
import type { Bound } from "../../nonTerminal/binary/bound.js"
import type { Divisibility } from "../../nonTerminal/binary/divisibility.js"
import type { TypeKeyword } from "../../terminal/keyword/keyword.js"
import type {
    BigintLiteralDefinition,
    BooleanLiteralDefinition,
    NumberLiteralDefinition,
    StringLiteralDefinition
} from "../../terminal/primitiveLiteral.js"

export type Infer<Ast, Resolutions> = Ast extends string
    ? InferTerminal<Ast, Resolutions>
    : Ast extends readonly unknown[]
    ? Ast[1] extends "?"
        ? Infer<Ast[0], Resolutions> | undefined
        : Ast[1] extends "[]"
        ? Infer<Ast[0], Resolutions>[]
        : Ast[1] extends "|"
        ? Infer<Ast[0], Resolutions> | Infer<Ast[2], Resolutions>
        : Ast[1] extends "&"
        ? Evaluate<Infer<Ast[0], Resolutions> & Infer<Ast[2], Resolutions>>
        : Ast[1] extends ConstraintToken
        ? Infer<Ast[0], Resolutions>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          Evaluate<{
              [I in keyof Ast]: Infer<Ast[I], Resolutions>
          }>
    : InferObjectLiteral<Ast, Resolutions>

type ConstraintToken = Bound.Token | Divisibility.Token

type InferTerminal<
    Token extends string,
    Resolutions
> = Token extends TypeKeyword.Definition
    ? TypeKeyword.Infer<Token>
    : Token extends keyof Resolutions
    ? Infer<Resolutions[Token], Resolutions>
    : Token extends StringLiteralDefinition<infer Value>
    ? Value
    : Token extends RegexLiteralDefinition
    ? string
    : Token extends NumberLiteralDefinition<infer Value>
    ? Value
    : Token extends BigintLiteralDefinition<infer Value>
    ? Value
    : Token extends BooleanLiteralDefinition<infer Value>
    ? Value
    : unknown

type InferObjectLiteral<
    Ast,
    Resolutions,
    OptionalKey extends keyof Ast = {
        [K in keyof Ast]: Ast[K] extends [unknown, "?"] ? K : never
    }[keyof Ast],
    RequiredKey extends keyof Ast = Exclude<keyof Ast, OptionalKey>
> = Evaluate<
    {
        [K in RequiredKey]: Infer<Ast[K], Resolutions>
    } & {
        [K in OptionalKey]?: Infer<Ast[K], Resolutions>
    }
>
