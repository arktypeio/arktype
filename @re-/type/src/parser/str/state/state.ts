import type { ClassOf, InstanceOf } from "@re-/tools"
import type { Base } from "../../../nodes/common.js"
import { parseError } from "../../common.js"
import type { Left, left } from "./left.js"
import { scanner } from "./scanner.js"

export class parserState<preconditions extends Partial<left> = {}> {
    l: left<preconditions>
    r: scanner

    constructor(def: string) {
        this.l = { groups: [], branches: {} } as any
        this.r = new scanner(def)
    }

    error(message: string): never {
        throw new parseError(message)
    }

    hasRoot<NodeClass extends ClassOf<Base.Node> = ClassOf<Base.Node>>(
        ofClass?: NodeClass
    ): this is parserState<{ root: InstanceOf<NodeClass> }> {
        return ofClass ? this.l.root instanceof ofClass : !!this.l.root
    }

    shifted() {
        this.r.shift()
        return this
    }
}

export namespace parserState {
    export type requireRoot<Root extends Base.Node = Base.Node> = parserState<{
        root: Root
    }>
}

export type ParserState<Preconditions extends Partial<Left> = {}> = {
    L: Left & Preconditions
    R: string
}

export namespace ParserState {
    export type New<Def extends string> = From<{
        L: Left.From<{
            groups: []
            branches: Left.OpenBranches.Default
            root: undefined
        }>
        R: Def
    }>

    export type SetRoot<
        S extends ParserState,
        Node,
        ScanTo extends string = S["R"]
    > = From<{
        L: Left.SetRoot<S["L"], Node>
        R: ScanTo
    }>

    export type Of<L extends Left> = {
        L: L
        R: string
    }

    export type From<S extends ParserState> = S

    export type Error<Message extends string> = {
        L: Left.Error<Message>
        R: ""
    }

    export type RequireRoot<Root = {}> = From<{
        L: Left.WithRoot<Root>
        R: string
    }>
}
