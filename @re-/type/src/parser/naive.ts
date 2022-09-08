import { Base } from "../nodes/base.js"
import { list } from "../nodes/types/nonTerminal/expression/unary/list.js"
import { optional } from "../nodes/types/nonTerminal/expression/unary/optional.js"
import { FullParse } from "./full.js"
import {
    IsResolvableName,
    toNodeIfResolvableIdentifier
} from "./operand/unenclosed.js"

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
    Dict
> = Def extends `${infer Child}?`
    ? Child extends `${infer Item}[]`
        ? IsResolvableName<Item, Dict> extends true
            ? [[Item, "[]"], "?"]
            : FullParse<Def, Dict>
        : IsResolvableName<Child, Dict> extends true
        ? [Child, "?"]
        : FullParse<Def, Dict>
    : Def extends `${infer Child}[]`
    ? IsResolvableName<Child, Dict> extends true
        ? [Child, "[]"]
        : FullParse<Def, Dict>
    : IsResolvableName<Def, Dict> extends true
    ? Def
    : FullParse<Def, Dict>

export const tryNaiveParse = (def: string, ctx: Base.context) => {
    if (def.endsWith("?")) {
        const possibleIdentifierNode = tryNaiveParseList(def.slice(0, -1), ctx)
        if (possibleIdentifierNode) {
            return new optional(possibleIdentifierNode, ctx)
        }
    }
    return tryNaiveParseList(def, ctx)
}

const tryNaiveParseList = (def: string, ctx: Base.context) => {
    if (def.endsWith("[]")) {
        const possibleIdentifierNode = toNodeIfResolvableIdentifier(
            def.slice(0, -2),
            ctx
        )
        if (possibleIdentifierNode) {
            return new list(possibleIdentifierNode, ctx)
        }
    }
    return toNodeIfResolvableIdentifier(def, ctx)
}
