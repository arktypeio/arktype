import type { Evaluate } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"
import type { Keyword } from "../parser/string/operand/keyword.js"
import type { NumberLiteral } from "../parser/string/operand/numeric.js"
import type { Scanner } from "../parser/string/state/scanner.js"

export type InferAst<Ast, Resolutions> = Ast extends TerminalAst
    ? InferTerminal<Ast, Resolutions>
    : Ast extends readonly unknown[]
    ? Ast[1] extends "?"
        ? InferAst<Ast[0], Resolutions> | undefined
        : Ast[1] extends "[]"
        ? InferAst<Ast[0], Resolutions>[]
        : Ast[1] extends "|"
        ? InferAst<Ast[0], Resolutions> | InferAst<Ast[2], Resolutions>
        : Ast[1] extends "&"
        ? Evaluate<
              InferAst<Ast[0], Resolutions> & InferAst<Ast[2], Resolutions>
          >
        : Ast[1] extends Scanner.Comparator
        ? Ast[0] extends NumberLiteral
            ? InferAst<Ast[2], Resolutions>
            : InferAst<Ast[0], Resolutions>
        : Ast[1] extends "%"
        ? InferAst<Ast[0], Resolutions>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          Evaluate<{
              [i in keyof Ast]: InferAst<Ast[i], Resolutions>
          }>
    : InferObjectLiteral<Ast, Resolutions>

type InferTerminal<
    Token extends TerminalAst,
    Resolutions
> = Token extends Keyword
    ? Keyword.Inferences[Token]
    : Token extends keyof Resolutions
    ? InferAst<Resolutions[Token], Resolutions>
    : Token extends Enclosed.StringLiteral<infer Text>
    ? Text
    : Token extends Enclosed.RegexLiteral
    ? string
    : Token extends number | bigint
    ? Token
    : unknown

type TerminalAst = string | number | bigint

type InferObjectLiteral<
    Node,
    Resolutions,
    OptionalKey extends keyof Node = {
        [K in keyof Node]: Node[K] extends [unknown, "?"] ? K : never
    }[keyof Node],
    RequiredKey extends keyof Node = Exclude<keyof Node, OptionalKey>
> = Evaluate<
    {
        [k in RequiredKey]: InferAst<Node[k], Resolutions>
    } & {
        [k in OptionalKey]?: InferAst<Node[k], Resolutions>
    }
>
