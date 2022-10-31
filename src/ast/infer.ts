import type { Evaluate } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"
import type { Keyword } from "../parser/string/operand/keyword.js"
import type { NumberLiteral } from "../parser/string/operand/numeric.js"
import type { Scanner } from "../parser/string/state/scanner.js"

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
        : ast[1] extends Scanner.Comparator
        ? ast[0] extends NumberLiteral
            ? inferAst<ast[2], resolutions>
            : inferAst<ast[0], resolutions>
        : ast[1] extends "%"
        ? inferAst<ast[0], resolutions>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          Evaluate<{
              [i in keyof ast]: inferAst<ast[i], resolutions>
          }>
    : inferObjectLiteral<ast, resolutions>

type inferTerminal<token extends string, resolutions> = token extends Keyword
    ? Keyword.Inferences[token]
    : token extends keyof resolutions
    ? inferAst<resolutions[token], resolutions>
    : token extends Enclosed.StringLiteral<infer Text>
    ? Text
    : token extends Enclosed.RegexLiteral
    ? string
    : token extends number | bigint
    ? token
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
