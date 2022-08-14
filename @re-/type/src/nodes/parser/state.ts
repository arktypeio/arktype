import { ClassOf, InstanceOf } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { Lexer } from "./lexer.js"
import { ErrorToken, TokenSet } from "./tokens.js"

export namespace State {
    export type Type = {
        tree: Tree
        unscanned: string
    }

    export type Tree = {
        bounds: Bound.Raw
        groups: Branches.TypeState[]
        branches: Branches.TypeState
        root: unknown
    }

    export type From<S extends Type> = S

    export type TreeFrom<T extends Tree> = T

    export type Expression<
        S extends Type,
        T extends Tree,
        Unscanned extends string
    > = From<{
        tree: T
        unscanned: Unscanned
    }>

    export type ScanTo<S extends Type, Unscanned extends string> = From<{
        tree: S["tree"]
        unscanned: Unscanned
    }>

    export type SetRoot<T extends Tree, Node> = TreeFrom<{
        bounds: T["bounds"]
        groups: T["groups"]
        branches: T["branches"]
        root: Node
    }>

    export type Error<S extends Type, Message extends string> = From<{
        tree: SetRoot<S["tree"], ErrorToken<Message>>
        unscanned: S["unscanned"]
    }>

    export type Initialize<Def extends string> = From<{
        tree: InitialTree
        unscanned: Def
    }>

    export type InitialTree = TreeFrom<{
        bounds: {}
        groups: []
        branches: {}
        root: undefined
    }>

    export type Value = {
        groups: Branches.ValueState[]
        branches: Branches.ValueState
        bounds: Bound.Raw
        root: Parse.Node | undefined
        scanner: Lexer.ValueScanner
    }

    export type WithLookaheadAndRoot<
        Lookahead extends string,
        Root extends Parse.Node = Parse.Node
    > = Value & {
        unscanned: Lexer.ValueScanner<Lookahead>
        root: Root
    }

    export type WithLookahead<Lookahead extends string> = Value & {
        unscanned: Lexer.ValueScanner<Lookahead>
    }

    export type WithRoot<Root extends Parse.Node = Parse.Node> = Value & {
        root: Root
    }

    export const lookaheadIs = <Token extends string>(
        state: Value,
        token: Token
    ): state is WithLookahead<Token> => state.scanner.lookaheadIs(token)

    export const lookaheadIn = <Tokens extends TokenSet>(
        state: Value,
        tokens: Tokens
    ): state is WithLookahead<Extract<keyof Tokens, string>> =>
        state.scanner.lookaheadIn(tokens)

    export const rootIs = <NodeClass extends ClassOf<Parse.Node>>(
        state: Value,
        nodeClass: NodeClass
    ): state is WithRoot<InstanceOf<NodeClass>> =>
        state.root instanceof nodeClass

    export const initialize = (def: string): Value => {
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
