import type { ParserContext, StaticParserContext } from "../common.js"
import type { fullParse } from "./full.js"
import { Unenclosed } from "./operand/unenclosed.js"
import { ArrayOperator } from "./operator/array.js"

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions. Unfortunately,
 * parsing from right to left makes maintaining a tree that can either be returned
 * or discarded in favor of a full parse tree much more costly.
 *
 * Hence, this repetitive (but efficient) shallow parse that decides whether to
 * delegate parsing in a single pass.
 */
export type tryNaiveParse<
    def extends string,
    context extends StaticParserContext
> = def extends `${infer Child}?`
    ? Child extends `${infer GrandChild}[]`
        ? Unenclosed.isResolvableIdentifier<GrandChild, context> extends true
            ? [[GrandChild, "[]"], "?"]
            : fullParse<def, context>
        : Unenclosed.isResolvableIdentifier<Child, context> extends true
        ? [Child, "?"]
        : fullParse<def, context>
    : def extends `${infer Child}[]`
    ? Unenclosed.isResolvableIdentifier<Child, context> extends true
        ? [Child, "[]"]
        : fullParse<def, context>
    : Unenclosed.isResolvableIdentifier<def, context> extends true
    ? def
    : fullParse<def, context>

export const tryNaiveParse = (def: string, context: ParserContext) => {
    if (def.endsWith("?")) {
        const maybeParsedAttributes = tryNaiveParseArray(
            def.slice(0, -1),
            context
        )
        if (maybeParsedAttributes) {
            // TODO: Add optional
            return maybeParsedAttributes
        }
    }
    return tryNaiveParseArray(def, context)
}

const tryNaiveParseArray = (def: string, context: ParserContext) => {
    if (def.endsWith("[]")) {
        const maybeParsedAttributes = Unenclosed.maybeParseIdentifier(
            def.slice(0, -2),
            context
        )
        if (maybeParsedAttributes) {
            return ArrayOperator.arrayOf(maybeParsedAttributes)
        }
    }
    return Unenclosed.maybeParseIdentifier(def, context)
}
