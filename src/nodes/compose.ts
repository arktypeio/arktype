import type { Type } from "../scopes/type.ts"
import type { Domain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { constructor, Dict, extend, mutable } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { Branches } from "./branch.ts"
import type { Compilation } from "./compile.ts"
import type { Range } from "./rules/range.ts"
import type { LiteralRules, NarrowableRules } from "./rules/rules.ts"

export type Intersector<t> = (
    l: t,
    r: t,
    state: IntersectionState
) => IntersectionResult<t>

export type Compiler<t> = (t: t, c: Compilation) => string

type allowUndefinedOperands<f extends Intersector<any>> = f extends Intersector<
    infer operand
>
    ? Intersector<operand | undefined>
    : never

export const composeIntersection = <
    t,
    reducer extends Intersector<t> = Intersector<t>
>(
    reducer: reducer
) =>
    ((l, r, state) =>
        l === undefined
            ? r === undefined
                ? throwInternalError(undefinedOperandsMessage)
                : r
            : r === undefined
            ? l
            : reducer(l, r, state)) as allowUndefinedOperands<reducer>

export const undefinedOperandsMessage = `Unexpected operation two undefined operands`

export type IntersectionResult<t> = t | Empty | Equal

export type DisjointKinds = extend<
    Record<string, { l: unknown; r: unknown }>,
    {
        domain: {
            l: Domain[]
            r: Domain[]
        }
        range: {
            l: Range
            r: Range
        }
        tupleLength: {
            l: number
            r: number
        }
        class: {
            l: DefaultObjectKind | constructor
            r: DefaultObjectKind | constructor
        }
        value: {
            l: unknown
            r: unknown
        }
        leftAssignability: {
            l: LiteralRules
            r: NarrowableRules
        }
        rightAssignability: {
            l: NarrowableRules
            r: LiteralRules
        }
        union: {
            l: Branches
            r: Branches
        }
    }
>

export const disjointDescriptionWriters = {
    domain: ({ l, r }) => `${l.join(", ")} and ${r.join(", ")}`,
    range: ({ l, r }) => `${stringifyRange(l)} and ${stringifyRange(r)}`,
    class: ({ l, r }) =>
        `classes ${typeof l === "string" ? l : l.name} and ${
            typeof r === "string" ? r : r.name
        }`,
    tupleLength: ({ l, r }) => `tuples of length ${l} and ${r}`,
    value: ({ l, r }) => `literal values ${stringify(l)} and ${stringify(r)}`,
    leftAssignability: ({ l, r }) =>
        `literal value ${stringify(l.value)} and ${stringify(r)}`,
    rightAssignability: ({ l, r }) =>
        `literal value ${stringify(r.value)} and ${stringify(l)}`,
    union: ({ l, r }) => `branches ${stringify(l)} and branches ${stringify(r)}`
} satisfies {
    [k in DisjointKind]: (context: DisjointContext<k>) => string
}

export const stringifyRange = (range: Range) =>
    "limit" in range
        ? `the range of exactly ${range.limit}`
        : range.min
        ? range.max
            ? `the range bounded by ${range.min.comparator}${range.min.limit} and ${range.max.comparator}${range.max.limit}`
            : `${range.min.comparator}${range.min.limit}`
        : range.max
        ? `${range.max.comparator}${range.max.limit}`
        : "the unbounded range"

export type DisjointKind = keyof DisjointKinds

export class IntersectionState {
    path = new Path()
    domain: Domain | undefined
    #disjoints: DisjointsByPath = {}

    constructor(public type: Type, public lastOperator: "|" | "&") {}

    get disjoints() {
        return this.#disjoints as Readonly<DisjointsByPath>
    }

    addDisjoint<kind extends DisjointKind>(
        kind: kind,
        l: DisjointKinds[kind]["l"],
        r: DisjointKinds[kind]["r"]
    ): Empty {
        this.#disjoints[`${this.path}`] = { kind, l, r }
        return empty
    }
}

export type DisjointsByPath = Record<string, DisjointContext>

export type DisjointContext<kind extends DisjointKind = DisjointKind> = {
    kind: kind
} & DisjointKinds[kind]

const empty = Symbol("empty")

export type Empty = typeof empty

export const anonymousDisjoint = (): Empty => empty

export const isDisjoint = (result: unknown): result is Empty => result === empty

const equal = Symbol("equal")

export type Equal = typeof equal

export const equality = (): Equal => equal

export const isEquality = (result: unknown): result is Equal => result === equal

export type IntersectionReducerMap<root extends Dict> = {
    [k in keyof root]-?: Intersector<root[k]>
}

export type KeyIntersectionFn<root extends Dict> = <key extends keyof root>(
    key: key,
    l: root[key],
    r: root[key],
    state: IntersectionState
) => IntersectionResult<root[key]>

export type IntersectionReducer<root extends Dict> =
    | KeyIntersectionFn<root>
    | IntersectionReducerMap<root>

export type KeyedOperationConfig = {
    onEmpty: "omit" | "bubble"
}

export const composeKeyedIntersection =
    <root extends Dict>(
        reducer: IntersectionReducer<root>,
        config: KeyedOperationConfig
    ): Intersector<root> =>
    (l, r, state) => {
        const result = {} as mutable<root>
        const keys = keysOf({ ...l, ...r } as root)
        let lImpliesR = true
        let rImpliesL = true
        for (const k of keys) {
            const keyResult =
                typeof reducer === "function"
                    ? reducer(k, l[k], r[k], state)
                    : reducer[k](l[k], r[k], state)
            if (isEquality(keyResult)) {
                if (l[k] !== undefined) {
                    result[k] = l[k]
                }
            } else if (isDisjoint(keyResult)) {
                if (config.onEmpty === "omit") {
                    lImpliesR = false
                    rImpliesL = false
                } else {
                    return empty
                }
            } else {
                if (keyResult !== undefined) {
                    result[k] = keyResult
                }
                lImpliesR &&= keyResult === l[k]
                rImpliesL &&= keyResult === r[k]
            }
        }
        return lImpliesR ? (rImpliesL ? equality() : l) : rImpliesL ? r : result
    }

export abstract class BaseNode<def> {
    constructor(public def: def) {}

    protected create(def: def): this {
        return new (this.constructor as any)(def)
    }

    abstract intersection(
        node: this,
        state: IntersectionState
    ): IntersectionResult<this>

    // TODO: Add compile

    // TODO: make all comparable as type nodes? e.g. a rule could be checked
    // against an entire type directly
}

export abstract class KeyedNode<
    def extends Dict<string, BaseNode<unknown>>
> extends BaseNode<def> {
    abstract onEmpty: "omit" | "bubble"

    intersection(node: this, state: IntersectionState) {
        const result = {} as mutable<def>
        const keys = keysOf({ ...this.def, ...node.def })
        let thisImpliesNode = true
        let nodeImpliesThis = true
        for (const k of keys) {
            const keyResult = this.def[k].intersection(node.def[k], state)
            if (isEquality(keyResult)) {
                if (this.def[k] !== undefined) {
                    result[k] = this.def[k]
                }
            } else if (isDisjoint(keyResult)) {
                if (this.onEmpty === "omit") {
                    thisImpliesNode = false
                    nodeImpliesThis = false
                } else {
                    return empty
                }
            } else {
                if (keyResult !== undefined) {
                    result[k] = keyResult
                }
                thisImpliesNode &&= keyResult === this.def[k]
                nodeImpliesThis &&= keyResult === node.def[k]
            }
        }
        return thisImpliesNode
            ? nodeImpliesThis
                ? equality()
                : this
            : nodeImpliesThis
            ? node
            : this.create(result)
    }
}
