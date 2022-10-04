import type { ClassOf, InstanceOf } from "@re-/tools"
import type { Base } from "../../../nodes/common.js"
import { Optional } from "../../../nodes/expression/optional.js"
import type { MaybeAppend } from "../../common.js"
import { parseError } from "../../common.js"
import { GroupOpen } from "../operand/groupOpen.js"
import { LeftBoundOperator } from "../operator/bound/left.js"
import { IntersectionOperator } from "../operator/intersection.js"
import { UnionOperator } from "../operator/union.js"
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
    export const finalize = (s: parserState.requireRoot, isOptional: boolean) =>
        !s.l.groups.length
            ? reduceFinal(s, isOptional)
            : s.error(GroupOpen.unclosedMessage)
}

export namespace ParserState {
    export type Finalize<
        S extends ParserState,
        IsOptional extends boolean
    > = S["L"]["groups"] extends []
        ? ParserState.From<{
              L: {
                  groups: []
                  branches: Left.OpenBranches.Default
                  root: WrapIfOptional<MergeBranches<S["L"]>, IsOptional>
                  done: true
              }
              R: ""
          }>
        : ParserState.Error<GroupOpen.UnclosedGroupMessage>

    type WrapIfOptional<
        Root,
        IsOptional extends boolean
    > = IsOptional extends true ? [Root, "?"] : Root
}

export namespace parserState {
    export const reduceFinal = (
        s: parserState.requireRoot,
        isOptional: boolean
    ) => {
        mergeBranches(s)
        if (isOptional) {
            s.l.root = new Optional.Node(s.l.root)
        }
        s.l.done = true
        return s
    }
}

export namespace parserState {
    export const mergeBranches = (s: parserState.requireRoot) => {
        // TODO: Ensure type check is also done for this
        LeftBoundOperator.assertClosed(s)
        IntersectionOperator.maybeMerge(s)
        UnionOperator.maybeMerge(s)
        return s
    }
}

// TODO: Check how this gets compiled (multiple of the same namespace in single file)
export namespace ParserState {
    export type MergeBranches<L extends Left> = MaybeAppend<
        MaybeAppend<L["root"], L["branches"]["intersection"]>,
        L["branches"]["union"]
    >
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
