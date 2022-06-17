import { asNumber } from "@re-/tools"
import { Common } from "../common.js"
import { Literal } from "../literal/literal.js"
import { Regex } from "../obj/regex.js"

/**
 * These expressions act like other terminal nodes (i.e. they are never parsed further),
 * but are instantiated as their non-string literal counterparts.
 **/
export namespace EmbeddedRegex {
    export type Definition<Expression extends string> =
        Expression extends `${string}/${string}` ? never : `/${Expression}/`

    const matcher = /^\/[^/]*\/$/

    /** Matches a definition enclosed by forward slashes that does not contain any other forward slashes*/
    export const matches = (def: string): def is Definition<string> =>
        matcher.test(def)

    export const expressionFrom = (def: Definition<string>) => def.slice(1, -1)

    export const parse: Common.Parser.Parser<Definition<string>> = (def, ctx) =>
        new Regex.Node(new RegExp(expressionFrom(def)), ctx)
}

export namespace EmbeddedNumber {
    export type Definition<Value extends number = number> = `${Value}`

    const matcher = /^-?(0|[1-9]\d*)(\.\d+)?$/

    /** Matches a well-formatted numeric expression */
    export const matches = (def: string): def is Definition => matcher.test(def)

    export const valueFrom = (def: Definition) =>
        asNumber(def, { assert: true })

    export const parse: Common.Parser.Parser<Definition> = (def, ctx) =>
        new Literal.Node(valueFrom(def), ctx)
}

export namespace EmbeddedBigInt {
    export type Definition<Value extends bigint = bigint> = `${Value}n`

    const matcher = /^-?(0|[1-9]\d*)n$/

    /** Matches a well-formatted integer expression followed by "n" */
    export const matches = (def: string): def is Definition => matcher.test(def)

    export const valueFrom = (def: Definition) => BigInt(def.slice(0, -1))

    export const parse: Common.Parser.Parser<Definition> = (def, ctx) =>
        new Literal.Node(valueFrom(def), ctx)
}
