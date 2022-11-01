import type { evaluate } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"
import type { Keyword } from "../parser/string/operand/keyword.js"
import type { NumberLiteral } from "../parser/string/operand/numeric.js"
import type { Scanner } from "../parser/string/state/scanner.js"

export type inferAst<node, resolutions> = node extends TerminalAst
    ? inferTerminal<node, resolutions>
    : node extends readonly unknown[]
    ? node[1] extends "?"
        ? inferAst<node[0], resolutions> | undefined
        : node[1] extends "[]"
        ? inferAst<node[0], resolutions>[]
        : node[1] extends "|"
        ? inferAst<node[0], resolutions> | inferAst<node[2], resolutions>
        : node[1] extends "&"
        ? evaluate<
              inferAst<node[0], resolutions> & inferAst<node[2], resolutions>
          >
        : node[1] extends Scanner.Comparator
        ? node[0] extends NumberLiteral
            ? inferAst<node[2], resolutions>
            : inferAst<node[0], resolutions>
        : node[1] extends "%"
        ? inferAst<node[0], resolutions>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          evaluate<{
              [i in keyof node]: inferAst<node[i], resolutions>
          }>
    : inferObjectLiteral<node, resolutions>

type inferTerminal<
    token extends TerminalAst,
    resolutions
> = token extends Keyword
    ? Keyword.Inferences[token]
    : token extends keyof resolutions
    ? resolutions[token]
    : token extends Enclosed.StringLiteral<infer Text>
    ? Text
    : token extends Enclosed.RegexLiteral
    ? string
    : token extends number | bigint
    ? token
    : unknown

type TerminalAst = string | number | bigint

type inferObjectLiteral<
    node,
    resolutions,
    optionalKey extends keyof node = {
        [K in keyof node]: node[K] extends [unknown, "?"] ? K : never
    }[keyof node],
    requiredKey extends keyof node = Exclude<keyof node, optionalKey>
> = evaluate<
    {
        [k in requiredKey]: inferAst<node[k], resolutions>
    } & {
        [k in optionalKey]?: inferAst<node[k], resolutions>
    }
>
