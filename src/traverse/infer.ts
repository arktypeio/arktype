import type { Enclosed } from "../parse/operand/enclosed.js"
import type { Keyword } from "../parse/operand/keyword.js"
import type { Scanner } from "../parse/state/scanner.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import type { evaluate } from "../utils/generics.js"
import type { NumberLiteral } from "../utils/numericLiterals.js"

export type inferAst<
    node,
    scope extends dictionary,
    scopeAst extends dictionary
> = node extends TerminalAst
    ? inferTerminal<node, scope, scopeAst>
    : node extends readonly unknown[]
    ? node[1] extends "[]"
        ? inferAst<node[0], scope, scopeAst>[]
        : node[1] extends "|"
        ?
              | inferAst<node[0], scope, scopeAst>
              | inferAst<node[2], scope, scopeAst>
        : node[1] extends "&"
        ? evaluate<
              inferAst<node[0], scope, scopeAst> &
                  inferAst<node[2], scope, scopeAst>
          >
        : node[1] extends Scanner.Comparator
        ? node[0] extends NumberLiteral
            ? inferAst<node[2], scope, scopeAst>
            : inferAst<node[0], scope, scopeAst>
        : node[1] extends "%"
        ? inferAst<node[0], scope, scopeAst>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          evaluate<{
              [i in keyof node]: inferAst<node[i], scope, scopeAst>
          }>
    : inferObjectLiteral<node, scope, scopeAst>

type inferTerminal<
    token extends TerminalAst,
    scope extends dictionary,
    scopeAst extends dictionary
> = token extends Keyword
    ? Keyword.Inferences[token]
    : token extends keyof scope
    ? scope[token]
    : token extends keyof scopeAst
    ? inferAst<scopeAst[token], scope, scopeAst>
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
    scope extends dictionary,
    scopeAst extends dictionary,
    optionalKey extends optionalKeyOf<node> = optionalKeyOf<node>,
    requiredKey extends keyof node = Exclude<keyof node, optionalKey>
> = evaluate<
    {
        [requiredKeyName in requiredKey]: inferAst<
            node[requiredKeyName],
            scope,
            scopeAst
        >
    } & {
        [optionalKeyName in extractNameOfOptionalKey<optionalKey>]?: inferAst<
            node[`${optionalKeyName}?` & keyof node],
            scope,
            scopeAst
        >
    }
>

type optionalKeyWithName<name extends string = string> = `${name}?`

type optionalKeyOf<node> = {
    [k in keyof node]: k extends optionalKeyWithName ? k : never
}[keyof node]

type extractNameOfOptionalKey<k extends optionalKeyWithName> =
    k extends optionalKeyWithName<infer name> ? name : never
