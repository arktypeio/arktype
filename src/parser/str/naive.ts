import { Attributes } from "../../attributes/attributes.js"
import type { ParserContext, parserContext } from "../common.js"
import type { FullParse } from "./full.js"
import { Unenclosed } from "./operand/unenclosed.js"

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
    Def extends string,
    Ctx extends ParserContext
> = Def extends `${infer Child}?`
    ? Child extends `${infer GrandChild}[]`
        ? Unenclosed.isResolvableIdentifier<GrandChild, Ctx> extends true
            ? [[GrandChild, "[]"], "?"]
            : FullParse<Def, Ctx>
        : Unenclosed.isResolvableIdentifier<Child, Ctx> extends true
        ? [Child, "?"]
        : FullParse<Def, Ctx>
    : Def extends `${infer Child}[]`
    ? Unenclosed.isResolvableIdentifier<Child, Ctx> extends true
        ? [Child, "[]"]
        : FullParse<Def, Ctx>
    : Unenclosed.isResolvableIdentifier<Def, Ctx> extends true
    ? Def
    : FullParse<Def, Ctx>

export const tryNaiveParse = (def: string, ctx: parserContext) => {
    if (def.endsWith("?")) {
        const maybeParsedAttributes = tryNaiveParseArray(def.slice(0, -1), ctx)
        if (maybeParsedAttributes) {
            Attributes.add(maybeParsedAttributes, "optional")
        }
    }
    return tryNaiveParseArray(def, ctx)
}

const tryNaiveParseArray = (def: string, ctx: parserContext) => {
    if (def.endsWith("[]")) {
        const maybeParsedAttributes = Unenclosed.maybeParseIdentifier(
            def.slice(0, -2),
            ctx
        )
        if (maybeParsedAttributes) {
            return Attributes.initialize({
                type: "array",
                values: maybeParsedAttributes
            })
        }
    }
    return Unenclosed.maybeParseIdentifier(def, ctx)
}
