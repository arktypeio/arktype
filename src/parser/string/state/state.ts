import type {
    AttributeKey,
    Attributes
} from "../../../attributes/attributes2.js"
import type { dynamicTypeOf, DynamicTypes } from "../../../internal.js"
import { hasDynamicType } from "../../../internal.js"
import type { ParseError } from "../../common.js"
import { throwParseError } from "../../common.js"
import { GroupOpen } from "../operand/groupOpen.js"
import type { LeftBoundOperator } from "../operator/bound/left.js"
import { UnionOperator } from "../operator/union.js"
import { Scanner } from "./scanner.js"

// TODO: Check namespace parse output

type BaseDynamicState = {
    root: Attributes | null
    branches: DynamicState.OpenBranches
    groups: DynamicState.OpenBranches[]
    scanner: Scanner
}

export type DynamicState<
    preconditions extends DynamicState.Preconditions = {}
> = Omit<BaseDynamicState, keyof preconditions> & preconditions

type BaseStaticState = {
    root: unknown
    branches: StaticState.OpenBranches
    groups: StaticState.OpenBranches[]
    unscanned: StaticState.StringOrReturnCode
}

export type StaticState<preconditions extends StaticState.Preconditions = {}> =
    Omit<BaseStaticState, keyof preconditions> & {
        unscanned: string
    } & preconditions

export namespace DynamicState {
    export type Preconditions = {
        root?: Attributes
        branches?: Partial<OpenBranches>
        groups?: OpenBranches[]
    }
}

export namespace StaticState {
    export type Preconditions = {
        root?: unknown
        branches?: Partial<OpenBranches>
        groups?: OpenBranches[]
        unscanned?: StringOrReturnCode
    }

    export type ReturnCode = 0 | 1

    export type StringOrReturnCode = string | ReturnCode
}

export namespace DynamicState {
    export type WithRoot<
        attributePreconditions extends Partial<Attributes> = {}
    > = DynamicState<{
        root: Attributes.With<attributePreconditions>
    }>
}

export namespace StaticState {
    export type WithRoot<ast = {}> = StaticState<{
        root: ast
    }>
}

export namespace DynamicState {
    export const initialize = (def: string): DynamicState => ({
        root: null,
        branches: initializeBranches(),
        groups: [],
        scanner: new Scanner(def)
    })
}

export namespace StaticState {
    export type initialize<def extends string> = from<{
        root: null
        branches: initialBranches
        groups: []
        unscanned: def
    }>
}

type SharedOpenLeftBound = [number, Scanner.PairableComparator]

export namespace DynamicState {
    export type OpenBranches = {
        leftBound?: OpenLeftBound | null
        union?: Attributes | null
        intersection?: Attributes | null
    }

    export type OpenLeftBound = SharedOpenLeftBound

    export const hasOpenLeftBound = <s extends DynamicState>(
        s: s
    ): s is s & { branches: { leftBound: OpenLeftBound } } =>
        !!s.branches.leftBound
}

export namespace StaticState {
    export type OpenBranches = {
        leftBound: OpenLeftBound | null
        union: [unknown, "|"] | null
        intersection: [unknown, "&"] | null
    }

    export type OpenLeftBound = SharedOpenLeftBound

    export type WithOpenLeftBound = { branches: { leftBound: {} } }
}

export namespace DynamicState {
    export const error = (message: string) => throwParseError(message)
}

export namespace StaticState {
    export type error<message extends string> = unvalidatedFrom<{
        root: ParseError<message>
        branches: initialBranches
        groups: []
        unscanned: 1
    }>
}

export namespace DynamicState {
    export const initializeBranches = (): OpenBranches => ({})
}

export namespace StaticState {
    export type initialBranches = {
        leftBound: null
        union: null
        intersection: null
    }
}

export namespace DynamicState {
    export const finalizeBranches = (s: WithRoot) => {
        UnionOperator.mergeDescendantsToRootIfPresent(s)
        return s
    }
}

export namespace StaticState {
    export type finalizeBranches<s extends WithRoot> =
        s extends WithOpenLeftBound
            ? LeftBoundOperator.unpairedError<s>
            : from<{
                  root: UnionOperator.collectBranches<s>
                  groups: s["groups"]
                  branches: initialBranches
                  unscanned: s["unscanned"]
              }>
}

export namespace DynamicState {
    export const finalize = (s: DynamicState.WithRoot) => {
        if (s.groups.length) {
            return error(GroupOpen.unclosedMessage)
        }
        finalizeGroup(s, {})
        s.scanner.hasBeenFinalized = true
        return s
    }
}

export namespace StaticState {
    export type finalize<
        s extends WithRoot,
        returnCode extends ReturnCode
    > = s["groups"] extends []
        ? scanTo<
              finalizeGroup<finalizeBranches<s>, initialBranches, []>,
              returnCode
          >
        : error<GroupOpen.unclosedMessage>
}

export namespace DynamicState {
    export const finalizeGroup = (
        s: DynamicState.WithRoot,
        nextBranches: OpenBranches
    ) => {
        finalizeBranches(s)
        s.branches = nextBranches
        return s as DynamicState
    }
}

export namespace StaticState {
    export type finalizeGroup<
        s extends StaticState.WithRoot,
        nextBranches extends OpenBranches,
        nextGroups extends OpenBranches[]
    > = from<{
        groups: nextGroups
        branches: nextBranches
        root: UnionOperator.collectBranches<s>
        unscanned: s["unscanned"]
    }>
}

export namespace DynamicState {
    export const previousOperator = (s: DynamicState) =>
        s.branches.leftBound?.[1] ?? s.branches.intersection
            ? "&"
            : s.branches.union
            ? "|"
            : null
}

export namespace StaticState {
    export type previousOperator<s extends StaticState> =
        s extends WithOpenLeftBound
            ? s["branches"]["leftBound"][1]
            : s["branches"]["intersection"] extends {}
            ? "&"
            : s["branches"]["union"] extends {}
            ? "|"
            : null
}

export namespace DynamicState {
    export const hasRoot = <s extends DynamicState>(
        s: s
    ): s is s & { root: {} } => s.root !== null

    export const rootAttributeEquals = <
        s extends DynamicState,
        k extends AttributeKey,
        v extends Attributes[k]
    >(
        s: s,
        k: k,
        v: v
    ): s is s & {
        root: { [_ in k]: v }
    } => s.root?.[k] === v

    export const rootAttributeHasType = <
        s extends DynamicState,
        k extends AttributeKey,
        typeName extends dynamicTypeOf<Attributes[k]>
    >(
        s: s,
        k: k,
        typeName: typeName
    ): s is s & {
        root: { [_ in k]: DynamicTypes[typeName] }
    } => hasDynamicType(s.root?.[k], typeName)

    /** More transparent mutation in a function with a constrained input state */
    export const unset = null as any

    export const shifted = (s: DynamicState) => {
        s.scanner.shift()
        return s
    }
}

export namespace StaticState {
    export type Unvalidated = BaseStaticState

    export type from<s extends StaticState> = s

    export type unvalidatedFrom<s extends BaseStaticState> = s

    export type scanTo<
        s extends StaticState,
        unscanned extends StringOrReturnCode
    > = unvalidatedFrom<{
        root: s["root"]
        branches: s["branches"]
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type setRoot<
        s extends StaticState,
        node,
        scanTo extends string = s["unscanned"]
    > = from<{
        root: node
        branches: s["branches"]
        groups: s["groups"]
        unscanned: scanTo
    }>
}
