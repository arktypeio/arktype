import type { dynamicTypeOf } from "../../utils/dynamicTypes.js"
import { hasDynamicType } from "../../utils/dynamicTypes.js"
import type { DynamicParserContext, ParseError } from "../common.js"
import { throwParseError } from "../common.js"
import { unclosedGroupMessage } from "../operand/groupOpen.js"
import type { unpairedLeftBoundError } from "../operator/bounds/left.js"
import type { mergeUnionDescendants } from "../operator/union/parse.js"
import { mergeUnionDescendantsToRoot } from "../operator/union/parse.js"
import type { Attributes } from "./attributes/attributes.js"
import { AttributeState } from "./attributes/state.js"
import type {
    SerializablePrimitive,
    SerializedPrimitives
} from "./attributes/value.js"
import { deserializePrimitive } from "./attributes/value.js"
import { Scanner } from "./scanner.js"

type BaseDynamic = {
    root: AttributeState
    branches: DynamicOpenBranches
    groups: DynamicOpenBranches[]
    scanner: Scanner
    context: DynamicParserContext
}

export type DynamicState<preconditions extends DynamicPreconditions = {}> =
    Omit<BaseDynamic, keyof preconditions> & preconditions

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

export type DynamicPreconditions = {
    readonly root?: AttributeState
    branches?: Partial<DynamicOpenBranches>
    groups?: DynamicOpenBranches[]
}

export type StaticPreconditions = {
    root?: unknown
    branches?: Partial<StaticOpenBranches>
    groups?: StaticOpenBranches[]
    unscanned?: StringOrReturnCode
}

type ReturnCode = 0 | 1

type StringOrReturnCode = string | ReturnCode

export type DynamicWithRoot<
    attributePreconditions extends Attributes = Attributes
> = DynamicState<{
    readonly root: AttributeState<attributePreconditions>
}>

export type StaticWithRoot<ast = {}> = StaticState<{
    root: ast
}>

export const initializeState = (
    def: string,
    context: DynamicParserContext
): DynamicState => ({
    root: new AttributeState(),
    branches: initializeBranches(),
    groups: [],
    scanner: new Scanner(def),
    context
})

export type initializeState<def extends string> = stateFrom<{
    root: undefined
    branches: initialBranches
    groups: []
    unscanned: def
}>

export type OpenRange = [limit: number, comparator: Scanner.PairableComparator]

export type DynamicOpenBranches = {
    range?: OpenRange
    union?: Attributes[]
    intersection?: Attributes[]
}

export type StaticOpenBranches = {
    range: OpenRange | undefined
    // TODO: Try as list
    union: [unknown, "|"] | undefined
    intersection: [unknown, "&"] | undefined
}

export const stateHasOpenRange = <s extends DynamicState>(
    s: s
): s is s & { branches: { range: OpenRange } } => !!s.branches.range

export type StaticWithOpenRange = { branches: { range: {} } }

export const errorState = (message: string) => throwParseError(message)

export type errorState<message extends string> = unvalidatedStateFrom<{
    root: ParseError<message>
    branches: initialBranches
    groups: []
    unscanned: 1
}>

export const initializeBranches = (): DynamicOpenBranches => ({})

export type initialBranches = {
    range: undefined
    union: undefined
    intersection: undefined
}

export const finalizeBranches = (s: DynamicWithRoot) => {
    mergeUnionDescendantsToRoot(s)
    return s
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

export const finalizeState = (s: DynamicWithRoot) => {
    if (s.groups.length) {
        return errorState(unclosedGroupMessage)
    }
    finalizeGroup(s, {})
    s.scanner.hasBeenFinalized = true
    return s
}

export type finalizeState<
    s extends StaticWithRoot,
    returnCode extends ReturnCode
> = s["groups"] extends []
    ? scanStateTo<
          finalizeGroup<finalizeBranches<s>, initialBranches, []>,
          returnCode
      >
    : errorState<unclosedGroupMessage>

export const finalizeGroup = (
    s: DynamicWithRoot,
    nextBranches: DynamicOpenBranches
) => {
    finalizeBranches(s)
    s.branches = nextBranches
    return s as DynamicState
}

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

export const previousOperator = (s: DynamicState) =>
    s.branches.range?.[1] ?? s.branches.intersection
        ? "&"
        : s.branches.union
        ? "|"
        : undefined

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

export const stateHasRoot = <s extends DynamicState>(
    s: s
): s is s & { root: {} } => !s.root.isUnset()

export const rootValueHasSerializedType = <
    s extends DynamicWithRoot,
    typeName extends dynamicTypeOf<SerializablePrimitive>
>(
    s: s,
    typeName: typeName
): s is s & {
    root: AttributeState<{ value: SerializedPrimitives[typeName] }>
} =>
    typeof s.root.get.value === "string" &&
    hasDynamicType(deserializePrimitive(s.root.get.value), typeName)

/** More transparent mutation in a function with a constrained input state */
export const unset = undefined as any

export const shifted = (s: DynamicState) => {
    s.scanner.shift()
    return s
}

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
