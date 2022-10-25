import type { Evaluate } from "../../utils/generics.js"
import type { Bound } from "../expression/infix/bound.js"
import type { Keyword } from "../terminal/keyword/keyword.js"
import type { BigintLiteral } from "../terminal/literal/bigint.js"
import type { NumberLiteral } from "../terminal/literal/number.js"
import type { RegexLiteral } from "../terminal/literal/regexLiteral.js"
import type { StringLiteral } from "../terminal/literal/string.js"

export type inferAst<ast, resolutions> = ast extends string
    ? inferTerminal<ast, resolutions>
    : ast extends readonly unknown[]
    ? ast[1] extends "?"
        ? inferAst<ast[0], resolutions> | undefined
        : ast[1] extends "[]"
        ? inferAst<ast[0], resolutions>[]
        : ast[1] extends "|"
        ? inferAst<ast[0], resolutions> | inferAst<ast[2], resolutions>
        : ast[1] extends "&"
        ? Evaluate<
              inferAst<ast[0], resolutions> & inferAst<ast[2], resolutions>
          >
        : ast[1] extends Bound.Token
        ? ast[0] extends NumberLiteral.Definition
            ? inferAst<ast[2], resolutions>
            : inferAst<ast[0], resolutions>
        : ast[1] extends "%"
        ? inferAst<ast[0], resolutions>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          Evaluate<{
              [I in keyof ast]: inferAst<ast[I], resolutions>
          }>
    : inferObjectLiteral<ast, resolutions>

type inferTerminal<
    token extends string,
    resolutions
> = token extends Keyword.Definition
    ? Keyword.Inferences[token]
    : token extends keyof resolutions
    ? inferAst<resolutions[token], resolutions>
    : token extends StringLiteral.Definition<infer Text>
    ? Text
    : token extends RegexLiteral.Definition
    ? string
    : token extends NumberLiteral.Definition<infer Value>
    ? Value
    : token extends BigintLiteral.Definition<infer Value>
    ? Value
    : unknown

type inferObjectLiteral<
    node,
    resolutions,
    optionalKey extends keyof node = {
        [K in keyof node]: node[K] extends [unknown, "?"] ? K : never
    }[keyof node],
    requiredKey extends keyof node = Exclude<keyof node, optionalKey>
> = Evaluate<
    {
        [k in requiredKey]: inferAst<node[k], resolutions>
    } & {
        [k in optionalKey]?: inferAst<node[k], resolutions>
    }
>
