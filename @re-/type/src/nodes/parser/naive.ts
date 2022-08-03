import { Base } from "../base/index.js"
import { ListNode, OptionalNode } from "../nonTerminal/index.js"
import { AliasNode, Keyword } from "../terminal/index.js"
import { CoreParser } from "./core.js"
import { IsResolvableName } from "./shared.js"

export namespace Naive {
    /**
     * Try to parse the definition from right to left using the most common syntax.
     * This can be much more efficient for simple definitions. Unfortunately,
     * parsing from right to left makes maintaining a tree that can either be returned
     * or discarded in favor of a full parse tree much more costly.
     *
     * Hence, this repetitive (but efficient) shallow parse that decides whether to
     * delegate parsing in a single pass.
     */
    export type TryParse<
        Def extends string,
        Dict
    > = Def extends `${infer Child}?`
        ? Child extends `${infer Item}[]`
            ? IsResolvableName<Item, Dict> extends true
                ? [[Item, "[]"], "?"]
                : CoreParser.Parse<Def, Dict>
            : IsResolvableName<Child, Dict> extends true
            ? [Child, "?"]
            : CoreParser.Parse<Def, Dict>
        : Def extends `${infer Child}[]`
        ? IsResolvableName<Child, Dict> extends true
            ? [Child, "[]"]
            : CoreParser.Parse<Def, Dict>
        : IsResolvableName<Def, Dict> extends true
        ? Def
        : CoreParser.Parse<Def, Dict>

    export const tryParse = (def: string, ctx: Base.Parsing.Context) => {
        if (def.endsWith("?")) {
            const possibleIdentifierNode = tryParseList(def.slice(0, -1), ctx)
            if (possibleIdentifierNode) {
                return new OptionalNode(possibleIdentifierNode, ctx)
            }
        }
        return tryParseList(def, ctx)
    }

    const tryParseList = (def: string, ctx: Base.Parsing.Context) => {
        if (def.endsWith("[]")) {
            const possibleIdentifierNode = tryParseIdentifier(
                def.slice(0, -2),
                ctx
            )
            if (possibleIdentifierNode) {
                return new ListNode(possibleIdentifierNode, ctx)
            }
        }
        return tryParseIdentifier(def, ctx)
    }

    const tryParseIdentifier = (
        possibleIdentifier: string,
        ctx: Base.Parsing.Context
    ) => {
        if (Keyword.matches(possibleIdentifier)) {
            return Keyword.parse(possibleIdentifier)
        } else if (AliasNode.matches(possibleIdentifier, ctx)) {
            return new AliasNode(possibleIdentifier, ctx)
        }
    }
}
