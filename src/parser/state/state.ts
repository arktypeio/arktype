import { reduce } from "../../attributes/reduce.js"
import type { AttributeKey, Attributes } from "../../attributes/shared.js"
import type {
    SerializablePrimitive,
    SerializedPrimitives
} from "../../attributes/value.js"
import { deserializePrimitive } from "../../attributes/value.js"
import type { dynamicTypeOf, DynamicTypes } from "../../internal.js"
import { hasDynamicType } from "../../internal.js"
import type { DynamicParserContext, ParseError } from "../common.js"
import { throwParseError } from "../common.js"
import { GroupOpen } from "../operand/groupOpen.js"
import type { LeftBoundOperator } from "../operator/bound/left.js"
import { UnionOperator } from "../operator/union.js"
import { Scanner } from "./scanner.js"

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

    export type OpenLeftBound = [
        limit: number,
        comparator: Scanner.PairableComparator
    ]

    export type DynamicOpenBranches = {
        leftBound?: OpenLeftBound
        union?: Attributes[]
        intersection?: Attributes[]
    }

    export const hasOpenLeftBound = <s extends Dynamic>(
        s: s
    ): s is s & { branches: { leftBound: OpenLeftBound } } =>
        !!s.branches.leftBound

    // TODO: Try as list
    export type StaticOpenBranches = {
        leftBound: OpenLeftBound | undefined
        union: [unknown, "|"] | undefined
        intersection: [unknown, "&"] | undefined
    }

    export type StaticWithOpenLeftBound = { branches: { leftBound: {} } }

    export const error = (message: string) => throwParseError(message)

    export type error<message extends string> = unvalidatedFrom<{
        root: ParseError<message>
        branches: initialBranches
        groups: []
        unscanned: 1
    }>

    export const initializeBranches = (): DynamicOpenBranches => ({})

    export type initialBranches = {
        leftBound: undefined
        union: undefined
        intersection: undefined
    }

    export const finalizeBranches = (s: DynamicWithRoot) => {
        UnionOperator.mergeDescendantsToRootIfPresent(s)
        return s
    }

    export type finalizeBranches<s extends StaticWithRoot> =
        s extends StaticWithOpenLeftBound
            ? LeftBoundOperator.unpairedError<s>
            : from<{
                  root: UnionOperator.collectBranches<s>
                  groups: s["groups"]
                  branches: initialBranches
                  unscanned: s["unscanned"]
              }>

    export const finalize = (s: DynamicWithRoot) => {
        if (s.groups.length) {
            return error(GroupOpen.unclosedMessage)
        }
        finalizeGroup(s, {})
        s.root = reduce(s.root, s.context)
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
        : error<GroupOpen.unclosedMessage>

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
        root: UnionOperator.collectBranches<s>
        unscanned: s["unscanned"]
    }>

    export const previousOperator = (s: Dynamic) =>
        s.branches.leftBound?.[1] ?? s.branches.intersection
            ? "&"
            : s.branches.union
            ? "|"
            : undefined

    export type previousOperator<s extends Static> =
        s extends StaticWithOpenLeftBound
            ? s["branches"]["leftBound"][1]
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
