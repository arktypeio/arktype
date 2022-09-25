import type { KeywordDefinition } from "../../nodes/terminals/keywords/keyword.js"
import { ArrayNode } from "../../nodes/unaries/array.js"
import { OptionalNode } from "../../nodes/unaries/optional.js"
import type { parseContext } from "../common.js"
import type { FullParse } from "./full.js"
import { toNodeIfResolvableIdentifier } from "./operand/unenclosed.js"

type IsResolvableName<Def, Dict> = Def extends KeywordDefinition
    ? true
    : Def extends keyof Dict
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

// /**
//  * Try to parse the definition from right to left using the most common syntax.
//  * This can be much more efficient for simple definitions. Unfortunately,
//  * parsing from right to left makes maintaining a tree that can either be returned
//  * or discarded in favor of a full parse tree much more costly.
//  *
//  * Hence, this repetitive (but efficient) shallow parse that decides whether to
//  * delegate parsing in a single pass.
//  */
// // Maybe just don't naive parse if we have meta defs?
// export type TryNaiveParse<
//     Def extends string,
//     Dict
// > = Def extends `${infer Child}?`
//     ? Child extends `${infer GrandChild}[]`
//         ? GrandChild extends KeywordDefinition
//             ? [GrandChild, "[]"]
//             : GrandChild extends Space.AliasOf<Dict>
//             ? [AliasAst<GrandChild, Dict>, "[]"]
//             : FullParse<Def, Dict>
//         : Child extends KeywordDefinition
//         ? [Child, "[]"]
//         : Child extends Space.AliasOf<Dict>
//         ? [AliasAst<Child, Dict>, "[]"]
//         : FullParse<Def, Dict>
//     : Def extends `${infer Child}[]`
//     ? Child extends KeywordDefinition
//         ? [Child, "[]"]
//         : Child extends Space.AliasOf<Dict>
//         ? [AliasAst<Child, Dict>, "[]"]
//         : FullParse<Def, Dict>
//     : Def extends KeywordDefinition
//     ? Def
//     : Def extends Space.AliasOf<Dict>
//     ? AliasAst<Def, Dict>
//     : FullParse<Def, Dict>

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
