import { Get, Iterate, ListChars } from "@re-/tools"
import { Base } from "../base/index.js"
import {
    Bound,
    Branches,
    Group,
    Intersection,
    List,
    Optional,
    Union
} from "../nonTerminal/index.js"
import {
    EnclosedLiteralDefinition,
    LiteralDefinition,
    NumberLiteralNode,
    Terminal
} from "../terminal/index.js"
import { Expression } from "./expression.js"
import { Scan, Shift2 } from "./shift2.js"
import { ErrorToken, suffixTokens } from "./tokens.js"

export namespace Core {
    export type Parse<Def extends string, Dict> = Get<
        Get<ParseDefinition<Def, Dict>, "tree">,
        "root"
    >

    export type ParseDefinition<Def extends string, Dict> = ParseExpression<
        Expression.T.Initial<Def>,
        Dict
    >

    export const parse = (def: string, ctx: Base.Parsing.Context) => {
        const s = Expression.initialize(def)
        parsePossiblePrefixes(s, ctx)
        parseExpression(s, ctx)
        reduceExpression(s)
        // @ts-ignore TODO: Allow parse functions to assert their state returned.
        parseSuffixes(s, ctx)
        return s.root!
    }

    const parsePossiblePrefixes = (
        s: Expression.State,
        ctx: Base.Parsing.Context
    ) => {
        parseToken(s, ctx)
        if (Expression.rootIs(s, NumberLiteralNode)) {
            Bound.parsePossibleLeft(s)
        }
    }

    type Z = ParseBase<
        Expression.T.InitialTree,
        Shift2.Branch<"string[][][]|number?">["lookahead"],
        {}
    >

    export type ParseBranches<
        Tree extends Expression.T.Tree,
        Tokens extends string[],
        Dict
    > = Tokens extends [] ? Tree : {}

    export type ParseBase<
        Tree extends Expression.T.Tree,
        Tokens extends string[],
        Dict
    > = Tokens extends ["("]
        ? Group.ReduceOpen<Tree>
        : Tokens extends Iterate<infer Base, infer Operators>
        ? Terminal.IsResolvable<Base, Dict> extends true
            ? ParseOperators<Expression.T.SetRoot<Tree, Base>, Operators>
            : Expression.T.SetRoot<
                  Tree,
                  ErrorToken<`'${Base &
                      string}' is not a builtin type and does not exist in your space.`>
              >
        : never

    export type ParseOperators<
        Tree extends Expression.T.Tree,
        Tokens extends unknown[]
    > = Tree["root"] extends ErrorToken<string>
        ? Tree
        : Tokens extends Iterate<infer Next, infer Rest>
        ? ParseOperators<
              Next extends "?" | "[]"
                  ? Expression.T.SetRoot<Tree, [Tree["root"], Next]>
                  : Next extends "|"
                  ? Union.Reduce<Tree>
                  : Next extends "&"
                  ? Intersection.Reduce<Tree>
                  : Next extends ")"
                  ? Group.ReduceClose<Tree>
                  : Expression.T.SetRoot<
                        Tree,
                        ErrorToken<`Unexpected token ${Next}.`>
                    >,
              Rest
          >
        : Tree

    // TOdo: Add group validation.
    export type ReduceTree<T extends Expression.T.Tree> =
        Expression.T.TreeFrom<{
            groups: T["groups"]
            branches: {}
            root: Branches.MergeAll<T["branches"], T["root"]>
        }>

    const parseExpression = (
        s: Expression.State,
        ctx: Base.Parsing.Context
    ) => {
        while (!(s.scanner.lookahead in suffixTokens)) {
            parseToken(s, ctx)
        }
    }

    const parseToken = (s: Expression.State, ctx: Base.Parsing.Context) => {
        switch (s.scanner.lookahead) {
            case "[]":
                return List.parse(s, ctx)
            case "|":
                return Union.parse(s, ctx)
            case "&":
                return Intersection.parse(s, ctx)
            case "(":
                return Group.parseOpen(s)
            case ")":
                return Group.parseClose(s)
            default:
                return Terminal.parse(s, ctx)
        }
    }

    export const UNCLOSED_GROUP_MESSAGE = "Missing )."
    type UnclosedGroupMessage = typeof UNCLOSED_GROUP_MESSAGE

    const reduceExpression = (s: Expression.State) => {
        Branches.mergeAll(s)
        validateExpression(s)
    }

    type ValidateExpression<S extends Expression.T.State> =
        S["tree"]["groups"] extends []
            ? S
            : Expression.T.Error<S, UnclosedGroupMessage>

    const validateExpression = (s: Expression.State) => {
        if (s.groups.length) {
            throw new Error(UNCLOSED_GROUP_MESSAGE)
        }
    }

    const parseSuffixes = (
        s: Expression.WithRoot,
        ctx: Base.Parsing.Context
    ) => {
        while (s.scanner.lookahead !== "END") {
            parseSuffix(s, ctx)
        }
    }

    type UnexpectedSuffixMessage<Token extends string> =
        `Unexpected suffix token '${Token}'.`

    export const unexpectedSuffixMessage = <Token extends string>(
        token: Token
    ): UnexpectedSuffixMessage<Token> => `Unexpected suffix token '${token}'.`

    const parseSuffix = (s: Expression.WithRoot, ctx: Base.Parsing.Context) => {
        if (s.scanner.lookahead === "?") {
            Optional.parse(s, ctx)
        } else if (Expression.lookaheadIn(s, Bound.tokens)) {
            Bound.parseRight(s, ctx)
        } else {
            throw new Error(unexpectedSuffixMessage(s.scanner.lookahead))
        }
    }
}
