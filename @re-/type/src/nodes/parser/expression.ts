import { ClassOf, InstanceOf } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { Lexer } from "./lexer.js"
import { ErrorToken, TokenSet } from "./tokens.js"

export namespace Expression {
    export namespace T {
        export type State = {
            tree: Tree
            unscanned: string
        }

        export type Tree = {
            groups: Branches.TypeState[]
            branches: Branches.TypeState
            root: unknown
        }

        export type Error<S extends State, Message extends string> = From<{
            tree: SetRoot<S["tree"], ErrorToken<Message>>
            unscanned: S["unscanned"]
        }>

        export type TreeFrom<T extends Tree> = T

        export type InitialTree = TreeFrom<{
            groups: []
            branches: {}
            root: undefined
        }>

        export type SetRoot<T extends Tree, Node> = TreeFrom<{
            groups: T["groups"]
            branches: T["branches"]
            root: Node
        }>

        export type From<S extends T.State> = S

        export type Initial<Def extends string> = From<{
            tree: InitialTree
            unscanned: Def
        }>
    }

    export type State = {
        groups: Branches.ValueState[]
        branches: Branches.ValueState
        bounds: Bound.Raw
        root: Parse.Node | undefined
        scanner: Lexer.ValueScanner
    }

    export type WithLookaheadAndRoot<
        Lookahead extends string,
        Root extends Parse.Node = Parse.Node
    > = State & {
        unscanned: Lexer.ValueScanner<Lookahead>
        root: Root
    }

    export type WithLookahead<Lookahead extends string> = State & {
        unscanned: Lexer.ValueScanner<Lookahead>
    }

    export type WithRoot<Root extends Parse.Node = Parse.Node> = State & {
        root: Root
    }

    export const lookaheadIs = <Token extends string>(
        state: State,
        token: Token
    ): state is WithLookahead<Token> => state.scanner.lookaheadIs(token)

    export const lookaheadIn = <Tokens extends TokenSet>(
        state: State,
        tokens: Tokens
    ): state is WithLookahead<Extract<keyof Tokens, string>> =>
        state.scanner.lookaheadIn(tokens)

    export const rootIs = <NodeClass extends ClassOf<Parse.Node>>(
        state: State,
        nodeClass: NodeClass
    ): state is WithRoot<InstanceOf<NodeClass>> =>
        state.root instanceof nodeClass

    export const initialize = (def: string): State => {
        const scanner = new Lexer.ValueScanner(def)
        Lexer.shiftBase(scanner)
        return {
            groups: [],
            branches: {},
            bounds: {},
            root: undefined,
            scanner
        }
    }
}
