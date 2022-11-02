import type { evaluate } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"
import type { Keyword } from "../parser/string/operand/keyword.js"
import type { NumberLiteral } from "../parser/string/operand/numeric.js"
import type { Scanner } from "../parser/string/state/scanner.js"
import type { ArktypeSpace } from "../space.js"

export type inferAst<node, space> = node extends TerminalAst
    ? inferTerminal<node, space>
    : node extends readonly unknown[]
    ? node[1] extends "?"
        ? inferAst<node[0], space> | undefined
        : node[1] extends "[]"
        ? inferAst<node[0], space>[]
        : node[1] extends "|"
        ? inferAst<node[0], space> | inferAst<node[2], space>
        : node[1] extends "&"
        ? evaluate<inferAst<node[0], space> & inferAst<node[2], space>>
        : node[1] extends Scanner.Comparator
        ? node[0] extends NumberLiteral
            ? inferAst<node[2], space>
            : inferAst<node[0], space>
        : node[1] extends "%"
        ? inferAst<node[0], space>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          evaluate<{
              [i in keyof node]: inferAst<node[i], space>
          }>
    : inferObjectLiteral<node, space>

type inferTerminal<token extends TerminalAst, space> = token extends Keyword
    ? Keyword.Inferences[token]
    : token extends keyof space
    ? inferAlias<token, space>
    : token extends Enclosed.StringLiteral<infer Text>
    ? Text
    : token extends Enclosed.RegexLiteral
    ? string
    : token extends number | bigint
    ? token
    : unknown

type inferAlias<token extends keyof space, space> = space extends ArktypeSpace<
    infer inferred
>
    ? token extends keyof inferred
        ? inferred[token]
        : never
    : inferAst<space[token], space>

type TerminalAst = string | number | bigint

type inferObjectLiteral<
    node,
    spaceAst,
    optionalKey extends keyof node = {
        [K in keyof node]: node[K] extends [unknown, "?"] ? K : never
    }[keyof node],
    requiredKey extends keyof node = Exclude<keyof node, optionalKey>
> = evaluate<
    {
        [k in requiredKey]: inferAst<node[k], spaceAst>
    } & {
        [k in optionalKey]?: inferAst<node[k], spaceAst>
    }
>
