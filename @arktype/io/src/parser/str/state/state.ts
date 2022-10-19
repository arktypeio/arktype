import type { ClassOf, InstanceOf } from "@arktype/tools"
import type { Base } from "../../../nodes/base/base.js"
import type { Intersection } from "../../../nodes/branching/intersection.js"
import type { Union } from "../../../nodes/branching/union.js"
import type { NumberLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import type { Bound } from "../../../nodes/unary/bound.js"
import type { ParseError } from "../../common.js"
import { throwParseError } from "../../common.js"
import { GroupOpen } from "../operand/groupOpen.js"
import type { LeftBoundOperator } from "../operator/bound/left.js"
import { UnionOperator } from "../operator/union.js"
import { Scanner } from "./scanner.js"

// TODO: Check namespace parse output
export namespace ParserState {
    export type Base = {
        root: Base.Node | null
        branches: OpenBranches
        groups: OpenBranches[]
        scanner: Scanner
    }

    export namespace T {
        export type Base = {
            root: unknown
            branches: OpenBranches
            groups: OpenBranches[]
            unscanned: UnscannedOrReturnCode
        }
    }

    export type Of<Conditions extends Preconditions> = Omit<
        Base,
        keyof Conditions
    > &
        Conditions

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
            union: [unknown, "|"] | null
            intersection: [unknown, "&"] | null
        }
    }

    export type OpenLeftBound = [number, Bound.DoublableToken]

    export namespace T {
        export type OpenLeftBound = [
            NumberLiteral.Definition,
            Bound.DoublableToken
        ]
    }

    export type from<s extends T.Base> = s

    export const initialize = (def: string): Base => ({
        root: null,
        branches: initializeBranches(),
        groups: [],
        scanner: new Scanner(def)
    })

    export type initialize<def extends string> = from<{
        root: null
        branches: initialBranches
        groups: []
        unscanned: def
    }>

    export const rooted = <
        s extends ParserState.Base,
        nodeClass extends ClassOf<Base.Node> = ClassOf<Base.Node>
    >(
        s: s,
        ofClass?: nodeClass
    ): s is s & { root: InstanceOf<nodeClass> } =>
        ofClass ? s.root instanceof ofClass : !!s.root

    export type rooted<ast = {}> = { root: ast }

    export const openLeftBounded = <s extends ParserState.Base>(
        s: s
    ): s is s & { branches: { leftBound: OpenLeftBound } } =>
        !!s.branches.leftBound

    export type openLeftBounded = { branches: { leftBound: {} } }

    export const error = (message: string) => throwParseError(message)

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

    export const finalizeBranches = (s: ParserState.WithRoot) => {
        UnionOperator.mergeDescendantsToRootIfPresent(s)
        return s
    }

    export type finalizeBranches<s extends T.WithRoot> =
        s extends openLeftBounded
            ? LeftBoundOperator.unpairedError<s>
            : ParserState.from<{
                  root: UnionOperator.collectBranches<s>
                  groups: s["groups"]
                  branches: initialBranches
                  unscanned: s["unscanned"]
              }>

    export const finalize = (s: ParserState.WithRoot) => {
        if (s.groups.length) {
            return error(GroupOpen.unclosedMessage)
        }
        finalizeGroup(s, {})
        s.scanner.hasBeenFinalized = true
        return s
    }

    export type finalize<
        s extends T.WithRoot,
        unscanned extends T.UnscannedOrReturnCode
    > = s["groups"] extends []
        ? finalizeGroup<finalizeBranches<s>, initialBranches, [], unscanned>
        : error<GroupOpen.unclosedMessage>

    export const finalizeGroup = (
        s: ParserState.WithRoot,
        nextBranches: OpenBranches
    ) => {
        finalizeBranches(s)
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
              root: UnionOperator.collectBranches<s>
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

    export const lastOperator = (s: ParserState.Base) =>
        s.branches.leftBound?.[1] ?? s.branches.intersection
            ? "&"
            : s.branches.union
            ? "|"
            : null

    export type lastOperator<s extends T.Unfinished> =
        s extends ParserState.openLeftBounded
            ? s["branches"]["leftBound"][1]
            : s["branches"]["intersection"] extends {}
            ? "&"
            : s["branches"]["union"] extends {}
            ? "|"
            : null
}
