import type { ParseError } from "../common.js"
import type { unclosedGroupMessage } from "../operand/groupOpen.js"
import type { unpairedLeftBoundError } from "../operator/bounds/left.js"
import type { mergeUnionDescendants } from "../operator/union/parse.js"
import type { Scanner } from "./scanner.js"

type BaseStatic = {
    root: unknown
    branches: StaticOpenBranches
    groups: StaticOpenBranches[]
    unscanned: StringOrReturnCode
}

export type StaticState<preconditions extends StaticPreconditions = {}> = Omit<
    BaseStatic,
    keyof preconditions
> & {
    unscanned: string
} & preconditions

export type StaticPreconditions = {
    root?: unknown
    branches?: Partial<StaticOpenBranches>
    groups?: StaticOpenBranches[]
    unscanned?: StringOrReturnCode
}

type ReturnCode = 0 | 1

type StringOrReturnCode = string | ReturnCode

export type StaticWithRoot<ast = {}> = StaticState<{
    root: ast
}>

export type initializeState<def extends string> = stateFrom<{
    root: undefined
    branches: initialBranches
    groups: []
    unscanned: def
}>

export type OpenRange = [limit: number, comparator: Scanner.PairableComparator]

export type StaticOpenBranches = {
    range: OpenRange | undefined
    // TODO: Try as list
    union: [unknown, "|"] | undefined
    intersection: [unknown, "&"] | undefined
}

export type StaticWithOpenRange = { branches: { range: {} } }

export type errorState<message extends string> = unvalidatedStateFrom<{
    root: ParseError<message>
    branches: initialBranches
    groups: []
    unscanned: 1
}>

export type initialBranches = {
    range: undefined
    union: undefined
    intersection: undefined
}

export type finalizeBranches<s extends StaticWithRoot> =
    s extends StaticWithOpenRange
        ? unpairedLeftBoundError<s>
        : stateFrom<{
              root: mergeUnionDescendants<s>
              groups: s["groups"]
              branches: initialBranches
              unscanned: s["unscanned"]
          }>

export type finalizeState<
    s extends StaticWithRoot,
    returnCode extends ReturnCode
> = s["groups"] extends []
    ? scanStateTo<
          finalizeGroup<finalizeBranches<s>, initialBranches, []>,
          returnCode
      >
    : errorState<unclosedGroupMessage>

export type finalizeGroup<
    s extends StaticWithRoot,
    nextBranches extends StaticOpenBranches,
    nextGroups extends StaticOpenBranches[]
> = stateFrom<{
    groups: nextGroups
    branches: nextBranches
    root: mergeUnionDescendants<s>
    unscanned: s["unscanned"]
}>

export type previousOperator<s extends StaticState> =
    s extends StaticWithOpenRange
        ? s["branches"]["range"]
        : s["branches"]["intersection"] extends {}
        ? "&"
        : s["branches"]["union"] extends {}
        ? "|"
        : undefined

export type setStateRoot<
    s extends StaticState,
    node,
    scanTo extends string = s["unscanned"]
> = stateFrom<{
    root: node
    branches: s["branches"]
    groups: s["groups"]
    unscanned: scanTo
}>

export type UnvalidatedState = BaseStatic

export type stateFrom<s extends StaticState> = s

export type unvalidatedStateFrom<s extends BaseStatic> = s

export type scanStateTo<
    s extends StaticState,
    unscanned extends StringOrReturnCode
> = unvalidatedStateFrom<{
    root: s["root"]
    branches: s["branches"]
    groups: s["groups"]
    unscanned: unscanned
}>
