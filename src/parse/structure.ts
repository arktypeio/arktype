import type { Attributes } from "../attributes/attributes.js"
import type { ScopeRoot } from "../scope.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import { throwInternalError } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import type { inferDefinition } from "./definition.js"
import { parseDefinition } from "./definition.js"
import type { Scanner } from "./reduce/scanner.js"

export const parseStructure = (
    def: Record<string | number, unknown>,
    scope: ScopeRoot
): Attributes => {
    if (isTupleExpression(def)) {
        return parseTupleExpression(def, scope)
    }
    const type = Array.isArray(def) ? "array" : "dictionary"
    const props: dictionary<Attributes> = {}
    for (const definitionKey in def) {
        const isOptional = definitionKey.endsWith("?")
        const keyName = isOptional ? definitionKey.slice(0, -1) : definitionKey
        props[keyName] = parseDefinition(def[definitionKey], scope)
        if (!isOptional) {
            props[keyName].required = true
        }
    }
    return { type, props }
}

export type inferStructure<
    def,
    scope extends dictionary,
    aliases
> = def extends readonly unknown[]
    ? { [i in keyof def]: inferDefinition<def[i], scope, aliases> }
    : inferObjectLiteral<def, scope, aliases>

type inferObjectLiteral<def, scope extends dictionary, aliases> = evaluate<
    {
        [requiredKeyName in requiredKeyOf<def>]: inferDefinition<
            def[requiredKeyName],
            scope,
            aliases
        >
    } & {
        [optionalKeyName in optionalKeyOf<def>]?: inferDefinition<
            // @ts-expect-error We're just undoing the optional key extraction
            // we just did to access the prop
            def[`${optionalKeyName}?`],
            scope,
            aliases
        >
    }
>

type optionalKeyWithName<name extends string = string> = `${name}?`

type optionalKeyOf<def> = {
    [k in keyof def]: k extends optionalKeyWithName<infer name> ? name : never
}[keyof def]

type requiredKeyOf<def> = {
    [k in keyof def]: k extends optionalKeyWithName ? never : k
}[keyof def]

const parseTupleExpression = (
    expression: TupleExpression,
    scope: ScopeRoot
) => {
    return throwInternalError("Not yet implemented.")
}

// type parseTupleExpression<
//     def extends TupleExpression,
//     scope extends dictionary
// > = def[1] extends Scanner.InfixToken
//     ? def[2] extends undefined
//         ? [
//               parseRoot<def[0], scope>,
//               error<buildMissingRightOperandMessage<def[1], "">>
//           ]
//         : [parseRoot<def[0], scope>, def[1], parseRoot<def[2], scope>]
//     : [parseRoot<def[0], scope>, def[1]]

type TupleExpression = [unknown, Scanner.OperatorToken, ...unknown[]]

const isTupleExpression = (def: unknown): def is TupleExpression =>
    Array.isArray(def) && (def[1] as any) in {}
