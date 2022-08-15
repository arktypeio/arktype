import { ClassOf, InstanceOf } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { Lexer } from "./lexer.js"
import { ErrorToken, TokenSet } from "./tokens.js"

export namespace State {
    export type Expression = {
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
        done?: true
    }

    export type Final = {
        L: {
            root: unknown
            done: true
        }
    }

    // This isn't even my...
    export type FinalFrom<Root> = From<{
        L: {
            bounds: {}
            groups: []
            branches: {}
            root: Root
            done: true
        }
        R: ""
    }>

    export type Update<T extends Tree, Changes extends Partial<Tree>> = {
        bounds: "bounds" extends keyof Changes ? Changes["bounds"] : T["bounds"]
        branches: "branches" extends keyof Changes
            ? Changes["branches"]
            : T["branches"]
        groups: "groups" extends keyof Changes ? Changes["groups"] : T["groups"]
        root: "root" extends keyof Changes ? Changes["root"] : T["root"]
    }
    //     Omit<
    //     T,
    //     keyof Changes
    // > &
    //     Changes

    export type From<S extends Expression> = S

    export type TreeFrom<T extends Tree> = T

    export type ScanTo<S extends Expression, Unscanned extends string> = From<{
        L: S["L"]
        R: Unscanned
    }>

    export type SetTreeRoot<T extends Tree, Node> = TreeFrom<{
        bounds: T["bounds"]
        groups: T["groups"]
        branches: T["branches"]
        root: Node
    }>

    export type Throw<Message extends string> = {
        L: ErrorTree<Message>
        R: ""
    }

    export type ErrorTree<Message extends string> = TreeFrom<{
        bounds: {}
        groups: []
        branches: {}
        root: ErrorToken<Message>
        done: true
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
