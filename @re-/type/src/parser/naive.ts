import { Node } from "./common.js"
import { Parse } from "./main.js"
import {
    IsResolvableName,
    toNodeIfResolvableIdentifier
} from "./operand/index.js"
import { Operator } from "./operator/index.js"

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions. Unfortunately,
 * parsing from right to left makes maintaining a tree that can either be returned
 * or discarded in favor of a full parse tree much more costly.
 *
 * Hence, this repetitive (but efficient) shallow parse that decides whether to
 * delegate parsing in a single pass.
 */
export type TryParse<Def extends string, Dict> = Def extends `${infer Child}?`
    ? Child extends `${infer Item}[]`
        ? IsResolvableName<Item, Dict> extends true
            ? [[Item, "[]"], "?"]
            : Parse<Def, Dict>
        : IsResolvableName<Child, Dict> extends true
        ? [Child, "?"]
        : Parse<Def, Dict>
    : Def extends `${infer Child}[]`
    ? IsResolvableName<Child, Dict> extends true
        ? [Child, "[]"]
        : Parse<Def, Dict>
    : IsResolvableName<Def, Dict> extends true
    ? Def
    : Parse<Def, Dict>

export const tryParse = (def: string, ctx: Nodes.context) => {
    if (def.endsWith("?")) {
        const possibleIdentifierNode = tryParseList(def.slice(0, -1), ctx)
        if (possibleIdentifierNode) {
            return new Operator.optional(possibleIdentifierNode, ctx)
        }
    }
    return tryParseList(def, ctx)
}

const tryParseList = (def: string, ctx: Nodes.context) => {
    if (def.endsWith("[]")) {
        const possibleIdentifierNode = toNodeIfResolvableIdentifier(
            def.slice(0, -2),
            ctx
        )
        if (possibleIdentifierNode) {
            return new Operator.list(possibleIdentifierNode, ctx)
        }
    }
    return toNodeIfResolvableIdentifier(def, ctx)
}
