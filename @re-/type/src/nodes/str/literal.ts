import { asNumber } from "@re-/tools"
import { Regex } from "../obj/regex.js"
import { Base } from "./base.js"

export class LiteralNode extends Base.Terminal<string | number | bigint> {
    allows(args: Base.Validation.Args) {
        if (args.value === this.def) {
            return true
        }
        // this.addUnassignable(args)
        return false
    }

    generate() {
        return this.def
    }
}

/**
 * These expressions act like other terminal nodes (i.e. they are never parsed further),
 * but are instantiated as their non-string literal counterparts.
 **/
export namespace RegexLiteral {
    export type Definition = `/${string}/`

    const matcher = /^\/[^/]*\/$/

    /** Matches a definition enclosed by forward slashes that does not contain any other forward slashes*/
    export const matches = (def: string): def is Definition => matcher.test(def)

    export const expressionFrom = (def: Definition) => def.slice(1, -1)

    export const parse: Base.Parsing.Parser<Definition> = (def) =>
        new Regex.Node(new RegExp(expressionFrom(def)))
}

export namespace NumberLiteral {
    export type Definition<Value extends number = number> = `${Value}`

    const matcher = /^-?(0|[1-9]\d*)(\.\d+)?$/

    /** Matches a well-formatted numeric expression */
    export const matches = (def: string): def is Definition => matcher.test(def)

    export const valueFrom = (def: Definition) =>
        asNumber(def, { assert: true })

    export const parse: Base.Parsing.Parser<Definition> = (def) =>
        new LiteralNode(valueFrom(def))
}

export namespace BigintLiteral {
    export type Definition<Value extends bigint = bigint> = `${Value}n`

    const matcher = /^-?(0|[1-9]\d*)n$/

    /** Matches a well-formatted integer expression followed by "n" */
    export const matches = (def: string): def is Definition => matcher.test(def)

    export const valueFrom = (def: Definition) => BigInt(def.slice(0, -1))

    export const parse: Base.Parsing.Parser<Definition> = (def) =>
        new LiteralNode(valueFrom(def))
}

export namespace StringLiteral {
    export type Definition<Text extends string = string> =
        | SingleQuoted<Text>
        | DoubleQuoted<Text>

    export type SingleQuoted<Text extends string = string> = `'${Text}'`

    export type DoubleQuoted<Text extends string = string> = `"${Text}"`

    /*
     * Matches a definition enclosed by single quotes that does not contain any other single quotes
     * Or a definition enclosed by double quotes that does not contain any other double quotes
     */
    const matcher = /^('[^']*'|^"[^"]*?")$/

    export const matches = (def: string): def is Definition => matcher.test(def)

    export const quotedText = (def: Definition) => def.slice(1, -1)

    export const parse: Base.Parsing.Parser<Definition> = (def) =>
        new LiteralNode(quotedText(def))
}
