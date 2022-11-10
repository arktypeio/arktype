import type { maybePush } from "../../utils/generics.js"
import type { buildUnmatchedGroupCloseMessage, parseError } from "../errors.js"
import type { unclosedGroupMessage } from "../operand/groupOpen.js"
import type { unpairedLeftBoundError } from "../operator/bounds/left.js"
import type { mergeUnionDescendants } from "../operator/union/parse.js"
import type { Attributes } from "./attributes/attributes.js"
import type { Scanner } from "./scanner.js"

export type mergeIntersectionDescendants<s extends StaticWithRoot> = maybePush<
    s["branches"]["&"],
    s["root"]
>

export namespace state {
    export type initialize<def extends string> = from<{
        root: undefined
        branches: initialBranches
        groups: []
        unscanned: def
    }>

    type initialBranches = branchesFrom<{
        range: undefined
        "|": []
        "&": []
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

    export type reduceBranch<
        s extends StaticWithRoot,
        token extends Scanner.BranchToken,
        unscanned extends string
    > = s extends StaticWithOpenRange
        ? unpairedLeftBoundError<s>
        : from<{
              root: undefined
              branches: token extends "|" ? pushUnion<s> : pushIntersection<s>
              groups: s["groups"]
              unscanned: unscanned
          }>

    type finalizeIntersection<
        branches extends unknown[],
        root
    > = branches extends [] ? root : ["&", ...branches, root]

    type finalizeUnion<branches extends unknown[], root> = branches extends []
        ? root
        : ["|", ...branches, root]

    type pushIntersection<s extends StaticWithRoot> = branchesFrom<{
        range: undefined
        "|": s["branches"]["|"]
        "&": [...s["branches"]["&"], s["root"]]
    }>

    type pushUnion<s extends StaticWithRoot> = branchesFrom<{
        range: undefined
        "|": [
            ...s["branches"]["|"],
            finalizeIntersection<s["branches"]["&"], s["root"]>
        ]
        "&": []
    }>

    export type finalizeBranches<s extends StaticWithRoot> =
        s extends StaticWithOpenRange
            ? unpairedLeftBoundError<s>
            : from<{
                  root: mergeUnionDescendants<s>
                  groups: s["groups"]
                  branches: initialBranches
                  unscanned: s["unscanned"]
              }>

    type popGroup<
        stack extends StaticBranchState[],
        top extends StaticBranchState
    > = [...stack, top]

    export type finalizeGroup<
        s extends StaticWithRoot,
        unscanned extends string
    > = s["groups"] extends popGroup<infer stack, infer top>
        ? from<{
              groups: stack
              branches: top
              root: mergeUnionDescendants<s>
              unscanned: unscanned
          }>
        : error<buildUnmatchedGroupCloseMessage<s["unscanned"]>>

    export type finalize<
        s extends StaticWithRoot,
        returnCode extends ReturnCode
    > = s["groups"] extends []
        ? scanTo<finalizeBranches<s>, returnCode>
        : error<unclosedGroupMessage>

    export type error<message extends string> = unvalidatedFrom<{
        root: parseError<message>
        branches: initialBranches
        groups: []
        unscanned: 1
    }>

    export type previousOperator<s extends StaticState> =
        s["branches"]["range"] extends OpenRange
            ? s["branches"]["range"][1]
            : s["branches"]["&"] extends []
            ? s["branches"]["|"] extends []
                ? "|"
                : "&"
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

    export type branchesFrom<b extends StaticBranchState> = b
}

type BaseStatic = {
    root: unknown
    branches: StaticBranchState
    groups: StaticBranchState[]
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
    branches?: Partial<StaticBranchState>
    groups?: StaticBranchState[]
    unscanned?: StringOrReturnCode
}

type ReturnCode = 0 | 1

type StringOrReturnCode = string | ReturnCode

export type StaticWithRoot<ast = {}> = StaticState<{
    root: ast
}>

export type OpenRange = [limit: number, comparator: Scanner.PairableComparator]

export type StaticBranchState = {
    range: OpenRange | undefined
    "|": unknown[]
    "&": unknown[]
}

export type StaticWithOpenRange = { branches: { range: {} } }

export type UnvalidatedState = BaseStatic
