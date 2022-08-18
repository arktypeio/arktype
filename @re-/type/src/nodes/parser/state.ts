import { ClassOf, InstanceOf, isEmpty } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { ErrorToken } from "./tokens.js"

export namespace Left {
    export type V = {
        bounds: Bound.State
        groups: Branches.ValueState[]
        branches: Branches.ValueState
        root: Parse.Node | undefined
        nextSuffix?: SuffixToken
    }

    export type T = {
        bounds: Bound.State
        groups: Branches.TypeState[]
        branches: Branches.TypeState
        root: unknown
        nextSuffix?: SuffixToken
    }

    export type SuffixToken = "END" | "?" | Bound.Token

    export type Suffix = {
        bounds: Bound.State
        root: unknown
        nextSuffix: SuffixToken
    }

    export type SuffixFrom<S extends Suffix> = S

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

    export type WithRoot<Node> = SetRoot<T, Node>

    export type RootOf<Node> = {
        root: Node
    }

    export type SetRoot<L extends T, Node> = From<{
        bounds: L["bounds"]
        groups: L["groups"]
        branches: L["branches"]
        root: Node
    }>

    export type ErrorFrom<Message extends string> = From<{
        bounds: {}
        groups: []
        branches: {}
        root: ErrorToken<Message>
        nextSuffix: "END"
    }>
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

    export type SuffixV = V & {
        l: {
            root: Parse.Node
            nextSuffix: Left.SuffixToken
        }
    }

    export type ValidatedSuffixV = SuffixV & {
        l: {
            root: Parse.Node
        }
    }

    export type Suffix = {
        L: Left.Suffix
        R: string
    }

    export type SuffixFrom<S extends Suffix> = S

    export const initialize = (def: string): V => ({
        l: Left.initial,
        r: new Scanner(def)
    })

    export type Initialize<Def extends string> = From<{
        L: Left.Initial
        R: Def
    }>

    export const isSuffixable = (s: State.V): s is State.SuffixV =>
        s.l.nextSuffix !== undefined

    export type Suffixable = {
        L: {
            nextSuffix: string
        }
    }

    export type From<S extends T> = S

    export type ScanTo<S extends T, Unscanned extends string> = From<{
        L: S["L"]
        R: Unscanned
    }>

    export const errorFrom = (message: string) => {
        throw Error(message)
    }

    export type ErrorFrom<Message extends string> = {
        L: Left.ErrorFrom<Message>
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
            return this.chars[this.i++] ?? "END"
        }

        get lookahead() {
            return this.chars[this.i] ?? "END"
        }

        shiftUntil(condition: UntilCondition, opts?: ShiftUntilOptions) {
            let shifted = opts?.shiftTo ?? ""
            while (!condition(this, shifted)) {
                if (this.lookahead === "END") {
                    return opts?.onInputEnd?.(this, shifted) ?? shifted
                }
                shifted += this.shift()
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
