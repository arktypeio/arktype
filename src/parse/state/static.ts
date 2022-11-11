import type {
    buildUnmatchedGroupCloseMessage,
    parseError,
    unclosedGroupMessage
} from "../errors.js"
import type { buildUnpairedLeftBoundMessage } from "../operator/bounds/left.js"
import type { morphisms, MorphName } from "./attributes/morph.js"
import type { Scanner } from "./scanner.js"

export namespace state {
    export type initialize<def extends string> = from<{
        root: undefined
        branches: initialBranches
        groups: []
        unscanned: def
    }>

    type initialBranches = branchesFrom<{
        range: undefined
        intersection: undefined
        union: undefined
    }>

    export type setRoot<
        s extends StaticState,
        node,
        unscanned extends string = s["unscanned"]
    > = from<{
        root: node
        branches: s["branches"]
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type morphRoot<
        s extends StaticState,
        to extends MorphName,
        unscanned extends string = s["unscanned"]
    > = from<{
        root: [s["root"], morphisms[to]]
        branches: s["branches"]
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type reduceBranch<
        s extends StaticWithRoot,
        token extends Scanner.BranchToken,
        unscanned extends string
    > = s["branches"]["range"] extends {}
        ? state.error<
              buildUnpairedLeftBoundMessage<
                  s["branches"]["range"][0],
                  s["branches"]["range"][1]
              >
          >
        : from<{
              root: undefined
              branches: token extends "|"
                  ? {
                        range: undefined
                        intersection: undefined
                        union: pushUnion<
                            s["branches"]["union"],
                            s["branches"]["intersection"],
                            s["root"]
                        >
                    }
                  : {
                        range: undefined
                        intersection: pushIntersection<
                            s["branches"]["intersection"],
                            s["root"]
                        >
                        union: s["branches"]["union"]
                    }
              groups: s["groups"]
              unscanned: unscanned
          }>

    export type reduceOpenRange<
        s extends StaticWithRoot,
        limit extends number,
        comparator extends Scanner.PairableComparator
    > = from<{
        root: undefined
        branches: {
            range: [limit, comparator]
            intersection: s["branches"]["intersection"]
            union: s["branches"]["union"]
        }
        groups: s["groups"]
        unscanned: s["unscanned"]
    }>

    export type finalizeRange<
        s extends StaticWithRoot,
        leftLimit extends number,
        leftComparator extends Scanner.PairableComparator,
        rightComparator extends Scanner.PairableComparator,
        rightLimit extends number,
        unscanned extends string
    > = state.from<{
        root: [
            leftLimit,
            leftComparator,
            [s["root"], rightComparator, rightLimit]
        ]
        branches: {
            range: undefined
            intersection: s["branches"]["intersection"]
            union: s["branches"]["union"]
        }
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type reduceSingleBound<
        s extends StaticWithRoot,
        limit extends number,
        comparator extends Scanner.Comparator,
        unscanned extends string
    > = state.from<{
        root: [s["root"], comparator, limit]
        branches: {
            range: undefined
            intersection: s["branches"]["intersection"]
            union: s["branches"]["union"]
        }
        groups: s["groups"]
        unscanned: unscanned
    }>

    type pushUnion<unionState, intersectionState, root> =
        unionState extends undefined
            ? pushIntersection<intersectionState, root>
            : [unionState, "|", pushIntersection<intersectionState, root>]

    type pushIntersection<intersectionState, root> =
        intersectionState extends undefined
            ? root
            : [intersectionState, "&", root]

    type popGroup<stack extends BranchState[], top extends BranchState> = [
        ...stack,
        top
    ]

    export type finalizeGroup<
        s extends StaticWithRoot,
        unscanned extends string
    > = s["groups"] extends popGroup<infer stack, infer top>
        ? from<{
              groups: stack
              branches: top
              root: pushUnion<
                  s["branches"]["union"],
                  s["branches"]["intersection"],
                  s["root"]
              >
              unscanned: unscanned
          }>
        : error<buildUnmatchedGroupCloseMessage<s["unscanned"]>>

    export type reduceGroupOpen<
        s extends StaticState,
        unscanned extends string
    > = from<{
        groups: [...s["groups"], s["branches"]]
        branches: initialBranches
        root: undefined
        unscanned: unscanned
    }>

    export type finalize<
        s extends StaticWithRoot,
        returnCode extends ReturnCode
    > = s["groups"] extends []
        ? s["branches"]["range"] extends {}
            ? state.error<
                  buildUnpairedLeftBoundMessage<
                      s["branches"]["range"][0],
                      s["branches"]["range"][1]
                  >
              >
            : unvalidatedFrom<{
                  root: pushUnion<
                      s["branches"]["union"],
                      s["branches"]["intersection"],
                      s["root"]
                  >
                  groups: s["groups"]
                  branches: initialBranches
                  unscanned: returnCode
              }>
        : error<unclosedGroupMessage>

    export type error<message extends string> = unvalidatedFrom<{
        root: parseError<message>
        branches: initialBranches
        groups: []
        unscanned: 1
    }>

    export type previousOperator<s extends StaticState> =
        s["branches"]["range"] extends {}
            ? s["branches"]["range"][1]
            : s["branches"]["intersection"] extends {}
            ? "&"
            : s["branches"]["union"] extends {}
            ? "|"
            : undefined

    export type scanTo<
        state extends StaticState,
        unscanned extends StringOrReturnCode
    > = unvalidatedFrom<{
        root: state["root"]
        branches: state["branches"]
        groups: state["groups"]
        unscanned: unscanned
    }>

    export type from<s extends StaticState> = s

    export type unvalidatedFrom<s extends BaseStatic> = s

    export type branchesFrom<b extends BranchState> = b
}

type BaseStatic = {
    root: unknown
    branches: BranchState
    groups: BranchState[]
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
    branches?: Partial<BranchState>
    groups?: BranchState[]
    unscanned?: StringOrReturnCode
}

// TODO: Can use just try/catch?
type ReturnCode = 0 | 1

type StringOrReturnCode = string | ReturnCode

export type StaticWithRoot<ast = {}> = StaticState<{
    root: ast
}>

type BranchState = {
    range: [limit: number, comparator: Scanner.PairableComparator] | undefined
    union: unknown
    intersection: unknown
}

export type UnvalidatedState = BaseStatic
