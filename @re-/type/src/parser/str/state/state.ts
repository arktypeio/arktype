import type { ClassOf, InstanceOf } from "@re-/tools"
import type { Base } from "../../../nodes/base.js"
import { Optional } from "../../../nodes/nonTerminal/unary/optional.js"
import type { MaybeAppend, ParseError } from "../../common.js"
import { parseError } from "../../common.js"
import type { UnclosedGroupMessage } from "../operand/groupOpen.js"
import { unclosedGroupMessage } from "../operand/groupOpen.js"
import { LeftBoundOperator } from "../operator/bound/left.js"
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
                : s.error(unclosedGroupMessage)
            : s.error(expressionExpectedMessage(""))
}

export namespace ParserState {
    export type Finalize<
        S extends ParserState.WithRootPrecondition,
        IsOptional extends boolean
    > = S["L"]["groups"] extends []
        ? LeftBoundOperator.AssertClosed<S["L"]> extends ParseError<
              infer Message
          >
            ? ParserState.Error<Message>
            : From<{
                  L: {
                      groups: []
                      branches: {}
                      root: WrapIfOptional<MergeBranches<S>, IsOptional>
                      done: true
                  }
                  R: ""
              }>
        : ParserState.Error<UnclosedGroupMessage>
}

export namespace parserState {
    export const reduceFinal = (
        s: parserState.withPreconditionRoot,
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
        S extends ParserState.WithRootPrecondition,
        IsOptional extends boolean
    > = From<{
        L: {
            groups: []
            branches: {}
            root: WrapIfOptional<MergeBranches<S>, IsOptional>
            done: true
        }
        R: ""
    }>
}

export namespace parserState {
    export const mergeBranches = (s: parserState.withPreconditionRoot) => {
        LeftBoundOperator.assertClosed(s)
        if (s.l.branches.intersection) {
            s.l.branches.intersection.pushChild(s.l.root)
            s.l.root = s.l.branches.intersection
        }
        if (s.l.branches.union) {
            s.l.branches.union.pushChild(s.l.root)
            s.l.root = s.l.branches.union
        }
        return s
    }
}

// TODO: Check how this gets compiled (multiple of the same namespace in single file)
export namespace ParserState {
    export type MergeBranches<
        S extends ParserState.WithRootPrecondition,
        UpdatedGroups extends Left.OpenBranches[] = S["L"]["groups"]
    > = LeftBoundOperator.AssertClosed<S["L"]> extends ParseError<infer Message>
        ? Left.Error<Message>
        : Left.From<{
              groups: UpdatedGroups
              branches: {}
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
    export type withPreconditionRoot<Root extends Base.node = Base.node> =
        parserState<{
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
            branches: {}
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

    export type WithRootPrecondition<Root = {}> = From<{
        L: Left.WithRoot<Root>
        R: string
    }>

    export type Suffixable = {
        L: {
            nextSuffix: string
        }
    }
}

export type ExpressionExpectedMessage<Unscanned extends string> =
    `Expected an expression${Unscanned extends ""
        ? ""
        : ` before '${Unscanned}'`}.`

export const expressionExpectedMessage = <Unscanned extends string>(
    unscanned: Unscanned
) =>
    `Expected an expression${
        unscanned ? ` before '${unscanned}'` : ""
    }.` as ExpressionExpectedMessage<Unscanned>
