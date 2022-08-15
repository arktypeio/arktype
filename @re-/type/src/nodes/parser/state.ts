import { ClassOf, InstanceOf } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { Lexer } from "./lexer.js"
import { ErrorToken, TokenSet } from "./tokens.js"

export namespace Left {
    export type Base = {
        bounds: Bound.BoundState
        groups: Branches.TypeState[]
        branches: Branches.TypeState
        root: unknown
        done?: true
    }

    export type From<T extends Base> = T

    export type Initial = From<{
        bounds: {}
        groups: []
        branches: {}
        root: undefined
    }>

    export type Finalize<Root> = From<{
        bounds: {}
        groups: []
        branches: {}
        root: Root
        done: true
    }>

    export type SetRoot<T extends Base, Node> = From<{
        bounds: T["bounds"]
        groups: T["groups"]
        branches: T["branches"]
        root: Node
    }>

    export type Error<Message extends string> = Finalize<ErrorToken<Message>>
}

export namespace State {
    export type Base = {
        L: Left.Base
        R: string
    }

    export type Final = {
        L: {
            root: unknown
            done: true
        }
    }

    export type Finalize<Root> = From<{
        L: Left.Finalize<Root>
        R: ""
    }>

    export type From<S extends Base> = S

    export type ScanTo<S extends Base, Unscanned extends string> = From<{
        L: S["L"]
        R: Unscanned
    }>

    export type Error<Message extends string> = {
        L: Left.Error<Message>
        R: ""
    }

    export type Initial<Def extends string> = From<{
        L: Left.Initial
        R: Def
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
