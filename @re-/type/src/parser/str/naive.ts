import type { KeywordDefinition } from "../../nodes/terminals/keywords/keyword.js"
import { ArrayNode } from "../../nodes/unaries/array.js"
import { OptionalNode } from "../../nodes/unaries/optional.js"
import type { ParseContext, parseContext } from "../common.js"
import type { FullParse } from "./full.js"
import { toNodeIfResolvableIdentifier } from "./operand/unenclosed.js"

type IsResolvableName<
    Def,
    Ctx extends ParseContext
> = Def extends KeywordDefinition
    ? true
    : Def extends keyof Ctx["Aliases"]
    ? true
    : false

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
    Ctx extends ParseContext
> = Def extends `${infer Child}?`
    ? Child extends `${infer GrandChild}[]`
        ? IsResolvableName<GrandChild, Ctx> extends true
            ? [[GrandChild, "[]"], "?"]
            : FullParse<Def, Ctx>
        : IsResolvableName<Child, Ctx> extends true
        ? [Child, "?"]
        : FullParse<Def, Ctx>
    : Def extends `${infer Child}[]`
    ? IsResolvableName<Child, Ctx> extends true
        ? [Child, "[]"]
        : FullParse<Def, Ctx>
    : IsResolvableName<Def, Ctx> extends true
    ? Def
    : FullParse<Def, Ctx>

export const tryNaiveParse = (def: string, context: parseContext) => {
    if (def.endsWith("?")) {
        const possibleIdentifierNode = tryNaiveParseArray(
            def.slice(0, -1),
            context
        )
        if (possibleIdentifierNode) {
            return new OptionalNode(possibleIdentifierNode, context)
        }
    }
    return tryNaiveParseArray(def, context)
}

const tryNaiveParseArray = (def: string, context: parseContext) => {
    if (def.endsWith("[]")) {
        const possibleIdentifierNode = toNodeIfResolvableIdentifier(
            def.slice(0, -2),
            context
        )
        if (possibleIdentifierNode) {
            return new ArrayNode(possibleIdentifierNode, context)
        }
    }
    return toNodeIfResolvableIdentifier(def, context)
}
