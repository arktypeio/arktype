import type { dynamicTypeOf, DynamicTypes } from "../../utils/dynamicTypes.js"
import { hasDynamicType } from "../../utils/dynamicTypes.js"
import type { DynamicParserContext, ParseError } from "../common.js"
import { throwParseError } from "../common.js"
import { unclosedGroupMessage } from "../operand/groupOpen.js"
import type { unpairedLeftBoundError } from "../operator/bounds/left.js"
import type { mergeUnionDescendants } from "../operator/union/parse.js"
import { mergeUnionDescendantsToRoot } from "../operator/union/parse.js"
import type { AttributeKey, Attributes } from "./attributes.js"
import { Scanner } from "./scanner.js"
import type { SerializablePrimitive, SerializedPrimitives } from "./value.js"
import { deserializePrimitive } from "./value.js"

export namespace State {
    type BaseDynamic = {
        root: Attributes | undefined
        branches: DynamicOpenBranches
        groups: DynamicOpenBranches[]
        scanner: Scanner
        context: DynamicParserContext
    }

    export type Dynamic<preconditions extends DynamicPreconditions = {}> = Omit<
        BaseDynamic,
        keyof preconditions
    > &
        preconditions

    type BaseStatic = {
        root: unknown
        branches: StaticOpenBranches
        groups: StaticOpenBranches[]
        unscanned: StringOrReturnCode
    }

    export type Static<preconditions extends StaticPreconditions = {}> = Omit<
        BaseStatic,
        keyof preconditions
    > & {
        unscanned: string
    } & preconditions

    export type DynamicPreconditions = {
        root?: Attributes
        branches?: Partial<DynamicOpenBranches>
        groups?: DynamicOpenBranches[]
    }

    export type StaticPreconditions = {
        root?: unknown
        branches?: Partial<StaticOpenBranches>
        groups?: StaticOpenBranches[]
        unscanned?: StringOrReturnCode
    }

    export type ReturnCode = 0 | 1

    export type StringOrReturnCode = string | ReturnCode

    export type DynamicWithRoot<
        attributePreconditions extends Attributes = Attributes
    > = Dynamic<{
        root: attributePreconditions
    }>

    export type StaticWithRoot<ast = {}> = Static<{
        root: ast
    }>

    export const initialize = (
        def: string,
        context: DynamicParserContext
    ): Dynamic => ({
        root: undefined,
        branches: initializeBranches(),
        groups: [],
        scanner: new Scanner(def),
        context
    })

    export type initialize<def extends string> = from<{
        root: undefined
        branches: initialBranches
        groups: []
        unscanned: def
    }>

    export type OpenRange = [
        limit: number,
        comparator: Scanner.PairableComparator
    ]

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

    export const hasOpenRange = <s extends Dynamic>(
        s: s
    ): s is s & { branches: { range: OpenRange } } => !!s.branches.range

    export type StaticWithOpenRange = { branches: { range: {} } }

    export const error = (message: string) => throwParseError(message)

    export type error<message extends string> = unvalidatedFrom<{
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
            : from<{
                  root: mergeUnionDescendants<s>
                  groups: s["groups"]
                  branches: initialBranches
                  unscanned: s["unscanned"]
              }>

    export const finalize = (s: DynamicWithRoot) => {
        if (s.groups.length) {
            return error(unclosedGroupMessage)
        }
        finalizeGroup(s, {})
        s.scanner.hasBeenFinalized = true
        return s
    }

    export type finalize<
        s extends StaticWithRoot,
        returnCode extends ReturnCode
    > = s["groups"] extends []
        ? scanTo<
              finalizeGroup<finalizeBranches<s>, initialBranches, []>,
              returnCode
          >
        : error<unclosedGroupMessage>

    export const finalizeGroup = (
        s: DynamicWithRoot,
        nextBranches: DynamicOpenBranches
    ) => {
        finalizeBranches(s)
        s.branches = nextBranches
        return s as Dynamic
    }

    export type finalizeGroup<
        s extends StaticWithRoot,
        nextBranches extends StaticOpenBranches,
        nextGroups extends StaticOpenBranches[]
    > = from<{
        groups: nextGroups
        branches: nextBranches
        root: mergeUnionDescendants<s>
        unscanned: s["unscanned"]
    }>

    export const previousOperator = (s: Dynamic) =>
        s.branches.range?.[1] ?? s.branches.intersection
            ? "&"
            : s.branches.union
            ? "|"
            : undefined

    export type previousOperator<s extends Static> =
        s extends StaticWithOpenRange
            ? s["branches"]["range"]
            : s["branches"]["intersection"] extends {}
            ? "&"
            : s["branches"]["union"] extends {}
            ? "|"
            : undefined

    export type setRoot<
        s extends Static,
        node,
        scanTo extends string = s["unscanned"]
    > = from<{
        root: node
        branches: s["branches"]
        groups: s["groups"]
        unscanned: scanTo
    }>

    export const hasRoot = <s extends Dynamic>(s: s): s is s & { root: {} } =>
        s.root !== undefined

    export const rootAttributeEquals = <
        s extends Dynamic,
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
        s extends Dynamic,
        k extends AttributeKey,
        typeName extends dynamicTypeOf<Attributes[k]>
    >(
        s: s,
        k: k,
        typeName: typeName
    ): s is s & {
        root: { [_ in k]: DynamicTypes[typeName] }
    } => hasDynamicType(s.root?.[k], typeName)

    export const rootValueHasSerializedType = <
        s extends DynamicWithRoot,
        typeName extends dynamicTypeOf<SerializablePrimitive>
    >(
        s: s,
        typeName: typeName
    ): s is s & {
        root: { value: SerializedPrimitives[typeName] }
    } =>
        typeof s.root.value === "string" &&
        hasDynamicType(deserializePrimitive(s.root.value), typeName)

    /** More transparent mutation in a function with a constrained input state */
    export const unset = undefined as any

    export const shifted = (s: Dynamic) => {
        s.scanner.shift()
        return s
    }

    export type Unvalidated = BaseStatic

    export type from<s extends Static> = s

    export type unvalidatedFrom<s extends BaseStatic> = s

    export type scanTo<
        s extends Static,
        unscanned extends StringOrReturnCode
    > = unvalidatedFrom<{
        root: s["root"]
        branches: s["branches"]
        groups: s["groups"]
        unscanned: unscanned
    }>
}
