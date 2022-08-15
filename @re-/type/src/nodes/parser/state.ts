import { ClassOf, InstanceOf } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { Lexer } from "./lexer.js"
import { ErrorToken, TokenSet } from "./tokens.js"

export namespace State {
    export type Type = {
        L: Tree
        R: string
    }

    export type BoundState = {
        left?: Bound.RawLeft
        bounded?: unknown
        rightToken?: Bound.Token
    }

    export type Tree = {
        bounds: BoundState
        groups: Branches.TypeState[]
        branches: Branches.TypeState
        root: unknown
    }

    export type From<S extends Type> = S

    export type TreeFrom<T extends Tree> = T

    export type Expression<T extends Tree, Unscanned extends string> = From<{
        L: T
        R: Unscanned
    }>

    export type ScanTo<S extends Type, Unscanned extends string> = From<{
        L: S["L"]
        R: Unscanned
    }>

    export type SetTreeRoot<T extends Tree, Node> = TreeFrom<{
        bounds: T["bounds"]
        groups: T["groups"]
        branches: T["branches"]
        root: Node
    }>

    export type Error<S extends Type, Message extends string> = From<{
        L: ErrorTree<Message>
        R: ""
    }>

    export type ErrorTree<Message extends string> = TreeFrom<{
        bounds: {}
        groups: []
        branches: {}
        root: ErrorToken<Message>
    }>

    export type Initialize<Def extends string> = From<{
        L: InitialTree
        R: Def
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
        R: Lexer.ValueScanner<Lookahead>
        root: Root
    }

    export type WithLookahead<Lookahead extends string> = Value & {
        R: Lexer.ValueScanner<Lookahead>
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
