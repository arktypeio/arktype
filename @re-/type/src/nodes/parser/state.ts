import { ClassOf, InstanceOf, isEmpty } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { ErrorToken } from "./tokens.js"

export namespace Left {
    export type V = {
        bounds: Bound.V
        groups: Branches.ValueState[]
        branches: Branches.ValueState
        root: Parse.Node | undefined
    }

    export type T = {
        bounds: Bound.T
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

    export const isPrefixable = (l: V) =>
        isEmpty(l.bounds) && isEmpty(l.branches) && !l.groups.length

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
        // TODO: Lexer.shiftBase(scanner)
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

    export type WithRoot<Root extends Parse.Node | undefined = Parse.Node> =
        V & {
            l: {
                root: Root
            }
        }

    // TODO: Better way to differentiate runtime and type utilities
    export type With<Values> = V & Values

    export type UntilCondition = (scanner: Scanner, shifted: string) => boolean

    export type OnInputEndFn = (scanner: Scanner, shifted: string) => string

    export type ShiftUntilOptions = {
        onInputEnd?: OnInputEndFn
        inclusive?: boolean
        shiftTo?: string
    }

    export class Scanner {
        private chars: string[]
        private i: number

        constructor(def: string) {
            this.chars = [...def]
            this.i = 0
        }

        shift() {
            return this.chars[this.i++]
        }

        get lookahead() {
            return this.chars[this.i]
        }

        shiftUntil(condition: UntilCondition, opts?: ShiftUntilOptions) {
            let shifted = opts?.shiftTo ?? ""
            while (this.lookahead && !condition(this, shifted)) {
                shifted += this.shift()
            }
            if (!this.lookahead) {
                return opts?.onInputEnd?.(this, shifted) ?? shifted
            }
            if (opts?.inclusive) {
                shifted += this.shift()
            }
            return shifted
        }
    }

    export const rootIs = <NodeClass extends ClassOf<Parse.Node>>(
        S: V,
        nodeClass: NodeClass
    ): S is WithRoot<InstanceOf<NodeClass>> => S.l.root instanceof nodeClass
}
