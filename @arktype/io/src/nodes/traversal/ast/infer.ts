import type { Evaluate } from "@arktype/tools"
import type { Keyword } from "../../terminal/keyword/keyword.js"
import type {
    BigintLiteral,
    NumberLiteral,
    StringLiteral
} from "../../terminal/primitiveLiteral.js"
import type { RegexLiteral } from "../../terminal/regexLiteral.js"
import type { Bound } from "../../unary/bound.js"

export type inferAst<node, resolutions> = node extends string
    ? inferTerminal<node, resolutions>
    : node extends readonly unknown[]
    ? node[1] extends "?"
        ? inferAst<node[0], resolutions> | undefined
        : node[1] extends "[]"
        ? inferAst<node[0], resolutions>[]
        : node[1] extends "|"
        ? inferAst<node[0], resolutions> | inferAst<node[2], resolutions>
        : node[1] extends "&"
        ? Evaluate<
              inferAst<node[0], resolutions> & inferAst<node[2], resolutions>
          >
        : node[1] extends Bound.Token
        ? node[0] extends NumberLiteral.Definition
            ? inferAst<node[2], resolutions>
            : inferAst<node[0], resolutions>
        : node[1] extends "%"
        ? inferAst<node[0], resolutions>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          Evaluate<{
              [I in keyof node]: inferAst<node[I], resolutions>
          }>
    : inferObjectLiteral<node, resolutions>

type inferTerminal<
    token extends string,
    resolutions
> = token extends Keyword.Definition
    ? Keyword.Infer<token>
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
