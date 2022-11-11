import type { RegexLiteral, StringLiteral } from "../parse/operand/enclosed.js"
import type { Keyword } from "../parse/operand/keyword.js"
import type { BadDefinitionType } from "../parse/parse.js"
import type { Scanner } from "../parse/state/scanner.js"
import type { parseString } from "../parse/string.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import type { evaluate, isTopType } from "../utils/generics.js"
import type { NumberLiteral } from "../utils/numericLiterals.js"

export type inferRoot<
    def,
    scope extends dictionary,
    aliases extends dictionary
    // TODO: Remove maybe?
> = isTopType<def> extends true
    ? unknown
    : def extends string
    ? inferAst<parseString<def, aliases>, scope, aliases>
    : def extends BadDefinitionType
    ? unknown
    : evaluate<{
          [k in keyof def]: inferRoot<def[k], scope, aliases>
      }>

export type inferAst<
    ast,
    scope extends dictionary,
    aliases extends dictionary
> = ast extends TerminalAst
    ? inferTerminal<ast, scope, aliases>
    : ast extends readonly unknown[]
    ? ast[1] extends "[]"
        ? inferAst<ast[0], scope, aliases>[]
        : ast[1] extends "|"
        ? inferAst<ast[0], scope, aliases> | inferAst<ast[2], scope, aliases>
        : ast[1] extends "&"
        ? evaluate<
              inferAst<ast[0], scope, aliases> &
                  inferAst<ast[2], scope, aliases>
          >
        : ast[1] extends Scanner.Comparator
        ? ast[0] extends NumberLiteral
            ? inferAst<ast[2], scope, aliases>
            : inferAst<ast[0], scope, aliases>
        : ast[1] extends "%"
        ? inferAst<ast[0], scope, aliases>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          evaluate<{
              [i in keyof ast]: inferAst<ast[i], scope, aliases>
          }>
    : inferObjectLiteral<ast, scope, aliases>

type inferTerminal<
    token extends TerminalAst,
    scope extends dictionary,
    aliases extends dictionary
> = token extends Keyword
    ? Keyword.Inferences[token]
    : token extends keyof scope
    ? scope[token]
    : token extends keyof aliases
    ? inferRoot<aliases[token], scope, aliases>
    : token extends StringLiteral<infer Text>
    ? Text
    : token extends RegexLiteral
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
