import { ClassOf, InstanceOf } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { Lexer } from "./lexer.js"
import { ErrorToken, TokenSet } from "./tokens.js"

export namespace Expression {
    export namespace State {
        export type Type = {
            groups: Branches.TypeState[]
            branches: Branches.TypeState
            root: unknown
            scanner: Lexer.TypeScanner
        }

        export type Value = {
            groups: Branches.ValueState[]
            branches: Branches.ValueState
            bounds: Bound.PartialBoundsDefinition
            root: Parse.Node | undefined
            scanner: Lexer.ValueScanner
        }

        export type WithLookaheadAndRoot<
            Lookahead extends string,
            Root extends Parse.Node = Parse.Node
        > = Value & {
            scanner: Lexer.ValueScanner<Lookahead>
            root: Root
        }

        export type WithLookahead<Lookahead extends string> = Value & {
            scanner: Lexer.ValueScanner<Lookahead>
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

        export type From<S extends State.Type> = S

        export type Error<S extends State.Type, Message extends string> = From<{
            groups: S["groups"]
            branches: S["branches"]
            root: ErrorToken<Message>
            scanner: {
                lookahead: "ERR"
                unscanned: S["scanner"]["unscanned"]
            }
        }>

        export type Initialize<Scanner extends Lexer.TypeScanner> = From<{
            groups: []
            branches: {}
            root: undefined
            scanner: Scanner
        }>

        export const initialize = (def: string): State.Value => {
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

        export type Modify<
            S extends State.Type,
            Token extends string
        > = SetRoot<S, [S["root"], Token]>

        export type SetRoot<S extends State.Type, Node> = From<{
            groups: S["groups"]
            branches: S["branches"]
            root: Node
            scanner: S["scanner"]
        }>

        export type ShiftBase<S extends State.Type, Root = S["root"]> = From<{
            groups: S["groups"]
            branches: S["branches"]
            root: Root
            scanner: Lexer.ShiftBase<S["scanner"]["unscanned"]>
        }>

        export type ShiftOperator<
            S extends State.Type,
            Root = S["root"]
        > = From<{
            groups: S["groups"]
            branches: S["branches"]
            root: Root
            scanner: Lexer.ShiftOperator<S["scanner"]["unscanned"]>
        }>
    }
}
