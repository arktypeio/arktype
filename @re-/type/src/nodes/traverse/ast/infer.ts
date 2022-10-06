import type { Evaluate } from "@re-/tools"
import type { Infix } from "../../expression/infix/infix.js"
import type { Keyword } from "../../terminal/keyword/keyword.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { RegexLiteral } from "../../terminal/regexLiteral.js"

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
        : Ast[1] extends Infix.TypelessToken
        ? Infer<Ast[0], Resolutions>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          Evaluate<{
              [I in keyof Ast]: Infer<Ast[I], Resolutions>
          }>
    : InferObjectLiteral<Ast, Resolutions>

type InferTerminal<
    Token extends string,
    Resolutions
> = Token extends Keyword.Definition
    ? Keyword.Infer<Token>
    : Token extends keyof Resolutions
    ? Infer<Resolutions[Token], Resolutions>
    : Token extends PrimitiveLiteral.String<infer Text>
    ? Text
    : Token extends RegexLiteral.Definition
    ? string
    : Token extends PrimitiveLiteral.Number<infer Value>
    ? Value
    : Token extends PrimitiveLiteral.Bigint<infer Value>
    ? Value
    : Token extends PrimitiveLiteral.Boolean<infer Value>
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
