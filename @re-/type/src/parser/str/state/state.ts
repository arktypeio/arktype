import type { ClassOf, InstanceOf } from "@re-/tools"
import type { Base } from "../../../nodes/base.js"
import { Optional } from "../../../nodes/nonTerminal/unary/optional.js"
import type { MaybeAppend, ParseError } from "../../common.js"
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

    hasRoot<NodeClass extends ClassOf<Base.node> = ClassOf<Base.node>>(
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
    export const finalize = (s: parserState, isOptional: boolean) =>
        s.hasRoot()
            ? !s.l.groups.length
                ? reduceFinal(LeftBoundOperator.assertClosed(s), isOptional)
                : s.error(GroupOpen.unclosedMessage)
            : s.error(scanner.expressionExpectedMessage(""))
}

export namespace ParserState {
    export type Finalize<
        S extends ParserState.RequireRoot,
        IsOptional extends boolean
    > = S["L"]["groups"] extends []
        ? LeftBoundOperator.AssertClosed<S["L"]> extends ParseError<
              infer Message
          >
            ? ParserState.Error<Message>
            : From<{
                  L: {
                      groups: []
                      branches: Left.OpenBranches.Default
                      root: WrapIfOptional<MergeBranches<S>, IsOptional>
                      done: true
                  }
                  R: ""
              }>
        : ParserState.Error<GroupOpen.UnclosedGroupMessage>
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

export namespace ParserState {
    export type ReduceFinal<
        S extends ParserState.RequireRoot,
        IsOptional extends boolean
    > = From<{
        L: {
            groups: []
            branches: Left.OpenBranches.Default
            root: WrapIfOptional<MergeBranches<S>, IsOptional>
            done: true
        }
        R: ""
    }>
}

export namespace parserState {
    export const mergeBranches = (s: parserState.requireRoot) => {
        LeftBoundOperator.assertClosed(s)
        IntersectionOperator.maybeMerge(s)
        UnionOperator.maybeMerge(s)
        return s
    }
}

// TODO: Check how this gets compiled (multiple of the same namespace in single file)
export namespace ParserState {
    export type MergeBranches<
        S extends ParserState.RequireRoot,
        UpdatedGroups extends Left.OpenBranches[] = S["L"]["groups"],
        UpdatedBranches extends Left.OpenBranches = Left.OpenBranches.Default
    > = LeftBoundOperator.AssertClosed<S["L"]> extends ParseError<infer Message>
        ? Left.Error<Message>
        : Left.From<{
              groups: UpdatedGroups
              branches: UpdatedBranches
              root: MaybeAppend<
                  MaybeAppend<
                      S["L"]["root"],
                      S["L"]["branches"]["intersection"]
                  >,
                  S["L"]["branches"]["union"]
              >
          }>
}

type WrapIfOptional<Root, IsOptional extends boolean> = IsOptional extends true
    ? [Root, "?"]
    : Root

export namespace parserState {
    export type requireRoot<Root extends Base.node = Base.node> = parserState<{
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
