import { ClassOf, InstanceOf } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { ErrorToken } from "./tokens.js"

export namespace Left {
    export type V = {
        bounds: Bound.Partial
        groups: Branches.ValueState[]
        branches: Branches.ValueState
        root: Parse.Node | undefined
    }

    export type T = {
        bounds: Bound.Partial
        groups: Branches.TypeState[]
        branches: Branches.TypeState
        root: unknown
        done?: true
    }

    export const initial = {
        bounds: {},
        groups: [],
        branches: {},
        root: undefined
    }

    export type Initial = From<{
        bounds: {}
        groups: []
        branches: {}
        root: undefined
    }>

    export type From<L extends T> = L

    export type IsPrefixable<L extends T> = From<{
        bounds: {}
        groups: []
        branches: {}
        root: any
    }> extends L
        ? true
        : false

    export type Finalize<Root> = From<{
        bounds: {}
        groups: []
        branches: {}
        root: Root
        done: true
    }>

    export type WithRoot<Node> = SetRoot<T, Node>

    export type SetRoot<L extends T, Node> = From<{
        bounds: L["bounds"]
        groups: L["groups"]
        branches: L["branches"]
        root: Node
    }>

    export type Error<Message extends string> = Finalize<ErrorToken<Message>>
}

export namespace State {
    export type V = {
        l: Left.V
        r: Scanner
    }

    export type T = {
        L: Left.T
        R: string
    }

    export const initialize = (def: string): V => {
        const scanner = new Scanner(def)
        //Lexer.shiftBase(scanner)
        return {
            l: Left.initial,
            r: scanner
        }
    }

    export type Initialize<Def extends string> = From<{
        L: Left.Initial
        R: Def
    }>

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

    export type From<S extends T> = S

    export type ScanTo<S extends T, Unscanned extends string> = From<{
        L: S["L"]
        R: Unscanned
    }>

    export type Error<Message extends string> = {
        L: Left.Error<Message>
        R: ""
    }

    export type WithRoot<Root extends Parse.Node = Parse.Node> = V & {
        L: {
            root: Root
        }
    }

    export class Scanner {
        private chars: string[]
        private i: number

        constructor(def: string) {
            this.chars = [...def]
            this.i = 0
        }

        shift() {
            const char = this.chars[this.i]
            this.i++
            return char
        }

        get lookahead() {
            return this.chars[this.i]
        }

        next() {
            this.i++
        }
    }

    export const rootIs = <NodeClass extends ClassOf<Parse.Node>>(
        S: V,
        nodeClass: NodeClass
    ): S is WithRoot<InstanceOf<NodeClass>> => S.l.root instanceof nodeClass
}
