import { ClassOf, InstanceOf, Iterate } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { Lexer } from "./lexer.js"
import { Scan, Shift } from "./shift.js"
import { ErrorToken, TokenSet } from "./tokens.js"

export namespace Expression {
    export namespace T {
        export type State = {
            tree: Tree
            scanner: Shift.TypeScanner
        }

        export type Tree = {
            groups: Branches.TypeState[]
            branches: Branches.TypeState
            root: unknown
        }

        export type Affixes = {
            bounds: Bound.Raw
            optional: boolean
        }

        type InitialAffixes = AffixesFrom<{
            bounds: {}
            optional: false
        }>

        type AffixesFrom<A extends Affixes> = A

        export type Error<S extends State, Message extends string> = From<{
            tree: SetRoot<S["tree"], ErrorToken<Message>>
            scanner: S["scanner"]
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

        export type Initial<Tokens extends unknown[]> = From<{
            tree: InitialTree
            scanner: Shift.Base<Tokens>
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
        scanner: Lexer.ValueScanner<Lookahead>
        root: Root
    }

    export type WithLookahead<Lookahead extends string> = State & {
        scanner: Lexer.ValueScanner<Lookahead>
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
