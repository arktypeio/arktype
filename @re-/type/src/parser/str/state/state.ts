import type { ClassOf, InstanceOf } from "@re-/tools"
import type { Base } from "../../../nodes/common.js"
import type { Intersection } from "../../../nodes/expression/branching/intersection.js"
import type { Union } from "../../../nodes/expression/branching/union.js"
import type { Bound } from "../../../nodes/expression/infix/bound.js"
import type { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import { parseError } from "../../common.js"
import type { MaybeAppend, ParseError } from "../../common.js"
import { GroupOpen } from "../operand/groupOpen.js"
import { LeftBoundOperator } from "../operator/bound/left.js"
import { IntersectionOperator } from "../operator/intersection.js"
import { UnionOperator } from "../operator/union.js"
import { scanner } from "./scanner.js"

// TODO: Check namespace parse output
export namespace ParserState {
    export type Base = {
        root: Base.Node | null
        branches: OpenBranches
        groups: OpenBranches[]
        scanner: scanner
    }

    export namespace T {
        export type Base = {
            root: unknown
            branches: OpenBranches
            groups: OpenBranches[]
            unscanned: UnscannedOrReturnCode
        }
    }

    export type Of<Conditions extends Preconditions> = Base & Conditions

    export namespace T {
        export type Unvalidated<Conditions extends Preconditions = {}> = Base &
            Conditions

        export type Unfinished<Conditions extends Preconditions = {}> = Base &
            Conditions &
            Incomplete

        export type Incomplete = {
            unscanned: string
        }

        export type Finished = {
            unscanned: number
        }

        export type Valid = {
            unscanned: ValidUnscanned
        }

        export type ValidUnscanned = string | 0

        export type UnscannedOrReturnCode = ValidUnscanned | 1
    }

    export type Preconditions = {
        root?: Base.Node | null
        branches?: Partial<OpenBranches>
        groups?: OpenBranches[]
    }

    export namespace T {
        export type Preconditions = {
            root?: unknown
            branches?: Partial<OpenBranches>
            groups?: OpenBranches[]
        }
    }
    export type WithRoot<Root extends Base.Node = Base.Node> = Of<{
        root: Root
    }>

    export namespace T {
        export type WithRoot<Root = {}> = Unfinished<{ root: Root }>
    }

    export type OpenBranches = {
        leftBound?: OpenLeftBound
        union?: Union.Node
        intersection?: Intersection.Node
    }

    export namespace T {
        export type OpenBranches = {
            leftBound: OpenLeftBound | null
            union: [unknown, Union.Token] | null
            intersection: [unknown, Intersection.Token] | null
        }
    }

    export type OpenLeftBound = [
        PrimitiveLiteral.Node<number>,
        Bound.DoubleToken
    ]

    export namespace T {
        export type OpenLeftBound = [PrimitiveLiteral.Number, Bound.DoubleToken]
    }

    export type from<s extends T.Base> = s

    export const initialize = (def: string): Base => ({
        root: null,
        branches: initializeBranches(),
        groups: [],
        scanner: new scanner(def)
    })

    export type initialize<def extends string> = from<{
        root: null
        branches: initialBranches
        groups: []
        unscanned: def
    }>

    export const rooted = <
        nodeClass extends ClassOf<Base.Node> = ClassOf<Base.Node>
    >(
        s: ParserState.Base,
        ofClass?: nodeClass
    ): s is ParserState.Of<{ root: InstanceOf<nodeClass> }> =>
        ofClass ? s.root instanceof ofClass : !!s.root

    export type rooted<ast = {}> = { root: ast }

    export const error = (message: string) => {
        throw new parseError(message)
    }

    export type error<message extends string> = from<{
        root: ParseError<message>
        branches: initialBranches
        groups: []
        unscanned: 1
    }>

    export const initializeBranches = (): OpenBranches => ({})

    export type initialBranches = {
        leftBound: null
        union: null
        intersection: null
    }

    export const mergeIntersectionAndUnion = (s: ParserState.WithRoot) => {
        IntersectionOperator.maybeMerge(s)
        UnionOperator.maybeMerge(s)
        return s
    }

    export type mergeIntersectionAndUnion<S extends T.WithRoot> = MaybeAppend<
        MaybeAppend<S["root"], S["branches"]["intersection"]>,
        S["branches"]["union"]
    >

    export const finalize = (s: ParserState.WithRoot) => {
        if (s.groups.length) {
            return error(GroupOpen.unclosedMessage)
        }
        finalizeGroup(s, {})
        return s
    }

    export type finalize<
        s extends T.WithRoot,
        unscanned extends T.UnscannedOrReturnCode
    > = s["groups"] extends []
        ? finalizeGroup<
              // @ts-expect-error
              LeftBoundOperator.assertClosed<s>,
              initialBranches,
              [],
              unscanned
          >
        : error<GroupOpen.unclosedMessage>

    export const finalizeGroup = (
        s: ParserState.WithRoot,
        nextBranches: OpenBranches
    ) => {
        mergeIntersectionAndUnion(s)
        LeftBoundOperator.assertClosed(s)
        s.branches = nextBranches
        return s as ParserState.Base
    }

    export type finalizeGroup<
        s extends T.Unvalidated<{ root: {} }>,
        nextBranches extends T.OpenBranches,
        nextGroups extends T.OpenBranches[],
        unscanned extends T.UnscannedOrReturnCode
    > = s extends T.Incomplete
        ? from<{
              groups: nextGroups
              branches: nextBranches
              root: mergeIntersectionAndUnion<s>
              unscanned: unscanned
          }>
        : s

    export const shifted = (s: ParserState.Base) => {
        s.scanner.shift()
        return s
    }

    export type scanTo<s extends T.Base, unscanned extends string> = from<{
        root: s["root"]
        branches: s["branches"]
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type setRoot<
        s extends T.Unfinished,
        node,
        scanTo extends T.UnscannedOrReturnCode = s["unscanned"]
    > = from<{
        root: node
        branches: s["branches"]
        groups: s["groups"]
        unscanned: scanTo
    }>
}
