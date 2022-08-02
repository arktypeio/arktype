import { Base } from "./base/index.js"
import { List, OptionalNode } from "./nonTerminal/index.js"
import { Parser } from "./parse.js"
import { ParserType } from "./parser.js"
import { AliasNode, InferTerminalStr, Keyword } from "./terminal/index.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = TryNaiveParse<Def, Dict>

    /**
     * Try to parse the definition from right to left using the most common syntax.
     * This can be much more efficient for simple definitions. Unfortunately,
     * parsing from right to left makes maintaining a tree that can either be returned
     * or discarded in favor of a full parse tree much more costly.
     *
     * Hence, this repetitive (but efficient) shallow parse that decides whether to
     * delegate parsing in a single pass.
     */
    type TryNaiveParse<Def extends string, Dict> = Def extends `${infer Child}?`
        ? Child extends `${infer Item}[]`
            ? IsResolvableName<Item, Dict> extends true
                ? [[Item, "[]"], "?"]
                : ParserType.Parse<Def, Dict>
            : IsResolvableName<Child, Dict> extends true
            ? [Child, "?"]
            : ParserType.Parse<Def, Dict>
        : Def extends `${infer Child}[]`
        ? IsResolvableName<Child, Dict> extends true
            ? [Child, "[]"]
            : ParserType.Parse<Def, Dict>
        : IsResolvableName<Def, Dict> extends true
        ? Def
        : ParserType.Parse<Def, Dict>

    type IsResolvableName<Def, Dict> = Def extends Keyword.Definition
        ? true
        : Def extends keyof Dict
        ? true
        : false

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends ParserType.Error<infer Message>
        ? Message
        : Def

    export type Infer<
        Def extends string,
        Ctx extends Base.Parsing.InferenceContext
    > = InferTree<Parse<Def, Ctx["dict"]>, Ctx>

    type InferTree<
        Tree,
        Ctx extends Base.Parsing.InferenceContext
    > = Tree extends string
        ? InferTerminalStr<Tree, Ctx>
        : Tree extends [infer Next, "?"]
        ? InferTree<Next, Ctx> | undefined
        : Tree extends [infer Next, "[]"]
        ? InferTree<Next, Ctx>[]
        : Tree extends [infer Left, "|", infer Right]
        ? InferTree<Left, Ctx> | InferTree<Right, Ctx>
        : Tree extends [infer Left, "&", infer Right]
        ? InferTree<Left, Ctx> & InferTree<Right, Ctx>
        : unknown

    export type References<Def extends string, Dict> = LeavesOf<
        Parse<Def, Dict>
    >

    type LeavesOf<Tree> = Tree extends [infer Child, string]
        ? LeavesOf<Child>
        : Tree extends [infer Left, string, infer Right]
        ? [...LeavesOf<Right>, ...LeavesOf<Left>]
        : [Tree]

    export const parse: Base.Parsing.ParseFn<string> = (def, ctx) =>
        tryNaiveParse(def, ctx) ?? fullParse(def, ctx)

    const tryNaiveParse = (def: string, ctx: Base.Parsing.Context) => {
        if (def.endsWith("?")) {
            const possibleIdentifierNode = tryNaiveParseList(
                def.slice(0, -1),
                ctx
            )
            if (possibleIdentifierNode) {
                return new OptionalNode(possibleIdentifierNode, ctx)
            }
        }
        return tryNaiveParseList(def, ctx)
    }

    const tryNaiveParseList = (def: string, ctx: Base.Parsing.Context) => {
        if (def.endsWith("[]")) {
            const possibleIdentifierNode = tryNaiveParseIdentifier(
                def.slice(0, -2),
                ctx
            )
            if (possibleIdentifierNode) {
                return new List.ListNode(possibleIdentifierNode, ctx)
            }
        }
        return tryNaiveParseIdentifier(def, ctx)
    }

    const tryNaiveParseIdentifier = (
        possibleIdentifier: string,
        ctx: Base.Parsing.Context
    ) => {
        if (Keyword.matches(possibleIdentifier)) {
            return Keyword.parse(possibleIdentifier)
        } else if (AliasNode.matches(possibleIdentifier, ctx)) {
            return new AliasNode(possibleIdentifier, ctx)
        }
    }

    const fullParse = (def: string, ctx: Base.Parsing.Context) => {
        const parser = new Parser(def, ctx)
        parser.shiftBranches()
        return parser.expression!
    }
}
