/* eslint-disable max-lines */
import type { ClassOf, InstanceOf } from "@re-/tools"
import type { Base } from "../../../nodes/common.js"
import type { Bound } from "../../../nodes/expression/bound.js"
import type { Intersection } from "../../../nodes/expression/intersection.js"
import type { Union } from "../../../nodes/expression/union.js"
import type { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import { parseError } from "../../common.js"
import type { MaybeAppend, ParseError } from "../../common.js"
import { GroupOpen } from "../operand/groupOpen.js"
import { LeftBoundOperator } from "../operator/bound/left.js"
import { intersectionOperator } from "../operator/intersection.js"
import { unionOperator } from "../operator/union.js"
import { scanner } from "./scanner.js"

export type parserState<Preconditions extends parserState.Preconditions = {}> =
    parserState.Base & Preconditions

export type ParserState<Preconditions extends ParserState.Preconditions = {}> =
    ParserState.Base & Preconditions & { unscanned: string }

// TODO: Check namespace parse output
export namespace parserState {
    export type Base = {
        root: Base.Node | null
        branches: OpenBranches
        groups: OpenBranches[]
        scanner: scanner
    }

    export type from<S extends Base> = S
}

export namespace ParserState {
    export type Base = {
        root: unknown
        branches: OpenBranches
        groups: OpenBranches[]
        unscanned: UnscannedOrReturnCode
    }

    export type UnscannedOrReturnCode = ValidUnscanned | 1

    export type ValidUnscanned = string | 0

    export type Unvalidated<Preconditions extends Partial<Base> = {}> = Base &
        Preconditions

    export type Validated<Preconditions extends Partial<Base> = {}> = Base &
        Preconditions & { unscanned: ValidUnscanned }

    export type Unfinalized = {
        unscanned: string
    }
}

export namespace parserState {
    export type Preconditions = {
        root?: Base.Node | null
        branches?: Partial<OpenBranches>
        groups?: OpenBranches[]
    }
}

export namespace ParserState {
    export type Preconditions = {
        root?: unknown
        branches?: Partial<OpenBranches>
        groups?: OpenBranches[]
    }
}

export namespace parserState {
    export const initialize = (def: string): Base => ({
        root: null,
        branches: initializeBranches(),
        groups: [],
        scanner: new scanner(def)
    })
}

export namespace ParserState {
    export type from<s extends Base> = s

    export type scanTo<s extends Base, unscanned extends string> = from<{
        root: s["root"]
        branches: s["branches"]
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type initialize<def extends string> = from<{
        root: null
        branches: initialBranches
        groups: []
        unscanned: def
    }>
}

export namespace parserState {
    export type WithRoot<Root extends Base.Node = Base.Node> = parserState<{
        root: Root
    }>

    export const hasRoot = <
        NodeClass extends ClassOf<Base.Node> = ClassOf<Base.Node>
    >(
        s: parserState,
        ofClass?: NodeClass
    ): s is parserState<{ root: InstanceOf<NodeClass> }> =>
        ofClass ? s.root instanceof ofClass : !!s.root
}

export namespace ParserState {
    export type WithRoot<Root = {}> = ParserState<{ root: Root }>

    export type HasRoot = { root: {} }
}

// TODO: CHeck perf of doing this at runtime
export namespace ParserState {
    export type setRoot<
        S extends ParserState.Validated,
        Node,
        ScanTo extends UnscannedOrReturnCode = S["unscanned"]
    > = from<{
        root: Node
        branches: S["branches"]
        groups: S["groups"]
        unscanned: ScanTo
    }>
}

export namespace parserState {
    export const error = (message: string) => {
        throw new parseError(message)
    }
}

export namespace ParserState {
    export type error<message extends string> = from<{
        root: ParseError<message>
        branches: initialBranches
        groups: []
        unscanned: 1
    }>

    export type Valid = {
        unscanned: ValidUnscanned
    }
}

export namespace parserState {
    export type OpenBranches = {
        leftBound?: OpenLeftBound
        union?: Union.Node
        intersection?: Intersection.Node
    }

    export type OpenLeftBound = [
        PrimitiveLiteral.Node<number>,
        Bound.DoubleToken
    ]
}

export namespace ParserState {
    export type OpenBranches = {
        leftBound: OpenLeftBound | null
        union: [unknown, Union.Token] | null
        intersection: [unknown, Intersection.Token] | null
    }

    export type OpenLeftBound = [PrimitiveLiteral.Number, Bound.DoubleToken]
}

export namespace parserState {
    export const initializeBranches = (): OpenBranches => ({})
}

export namespace ParserState {
    export type initialBranches = {
        leftBound: null
        union: null
        intersection: null
    }
}

export namespace parserState {
    export const mergeIntersectionAndUnionToRoot = (
        s: parserState.WithRoot
    ) => {
        intersectionOperator.maybeMerge(s)
        unionOperator.maybeMerge(s)
        return s
    }
}

export namespace ParserState {
    export type mergeIntersectionAndUnion<S extends ParserState.WithRoot> =
        MaybeAppend<
            MaybeAppend<S["root"], S["branches"]["intersection"]>,
            S["branches"]["union"]
        >
}

export namespace parserState {
    export const finalize = (s: parserState.WithRoot) => {
        if (s.groups.length) {
            return error(GroupOpen.unclosedMessage)
        }
        finalizeGroup(s, {})
        return s
    }
}

export namespace ParserState {
    export type finalize<
        S extends ParserState.WithRoot,
        Unscanned extends UnscannedOrReturnCode
    > = S["groups"] extends []
        ? finalizeGroup<
              LeftBoundOperator.AssertClosed<S>,
              initialBranches,
              [],
              Unscanned
          >
        : error<GroupOpen.UnclosedGroupMessage>
}

export namespace parserState {
    export const finalizeGroup = (
        s: parserState.WithRoot,
        nextBranches: OpenBranches
    ) => {
        mergeIntersectionAndUnionToRoot(s)
        LeftBoundOperator.assertClosed(s)
        s.branches = nextBranches
        return s as parserState
    }
}

export namespace ParserState {
    export type finalizeGroup<
        s extends ParserState.Unvalidated<{ root: {} }>,
        nextBranches extends OpenBranches,
        nextGroups extends OpenBranches[],
        unscanned extends UnscannedOrReturnCode
    > = s extends Unfinalized
        ? from<{
              groups: nextGroups
              branches: nextBranches
              root: mergeIntersectionAndUnion<s>
              unscanned: unscanned
          }>
        : s
}

export namespace parserState {
    export const shifted = (s: parserState) => {
        s.scanner.shift()
        return s
    }
}
