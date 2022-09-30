import { Arr } from "../../nodes/nonTerminal/unary/array.js"
import { Optional } from "../../nodes/nonTerminal/unary/optional.js"
import type { ParserContext, parserContext } from "../common.js"
import type { FullParse } from "./full.js"
import type { IsResolvableIdentifier } from "./operand/unenclosed.js"
import { maybeParseIdentifier } from "./operand/unenclosed.js"

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions. Unfortunately,
 * parsing from right to left makes maintaining a tree that can either be returned
 * or discarded in favor of a full parse tree much more costly.
 *
 * Hence, this repetitive (but efficient) shallow parse that decides whether to
 * delegate parsing in a single pass.
 */
export type TryNaiveParse<
    Def extends string,
    Ctx extends ParserContext
> = Def extends `${infer Child}?`
    ? Child extends `${infer GrandChild}[]`
        ? IsResolvableIdentifier<GrandChild, Ctx> extends true
            ? [[GrandChild, "[]"], "?"]
            : FullParse<Def, Ctx>
        : IsResolvableIdentifier<Child, Ctx> extends true
        ? [Child, "?"]
        : FullParse<Def, Ctx>
    : Def extends `${infer Child}[]`
    ? IsResolvableIdentifier<Child, Ctx> extends true
        ? [Child, "[]"]
        : FullParse<Def, Ctx>
    : IsResolvableIdentifier<Def, Ctx> extends true
    ? Def
    : FullParse<Def, Ctx>

export const tryNaiveParse = (def: string, ctx: parserContext) => {
    if (def.endsWith("?")) {
        const possibleIdentifierNode = tryNaiveParseArray(def.slice(0, -1), ctx)
        if (possibleIdentifierNode) {
            return new Optional.Node(possibleIdentifierNode)
        }
    }
    return tryNaiveParseArray(def, ctx)
}

const tryNaiveParseArray = (def: string, ctx: parserContext) => {
    if (def.endsWith("[]")) {
        const possibleIdentifierNode = maybeParseIdentifier(
            def.slice(0, -2),
            ctx
        )
        if (possibleIdentifierNode) {
            return new Arr.Node(possibleIdentifierNode)
        }
    }
    return maybeParseIdentifier(def, ctx)
}
