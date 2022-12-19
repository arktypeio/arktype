import type { Domain, ObjectKind } from "../utils/domains.js"
import type { entryOf, extend } from "../utils/generics.js"
import type { TypeNode } from "./node.js"
import type { Range } from "./rules/range.js"
import type { Rules, Validator } from "./rules/rules.js"

export type FlatConditions = extend<
    { [k in keyof Rules]-?: unknown },
    {
        value: unknown
        regex: RegExp
        divisor: number
        kind: ObjectKind
        range: Range
        props: FlattenedProps
        validator: Validator
    }
>

type FlattenedProps = {
    readonly optional: FlattenedPropGroup
    readonly required: FlattenedPropGroup
    readonly mapped: FlattenedPropGroup
}

type FlattenedPropGroup = { readonly [k in string]: FlatNode }

export type FlatCondition = entryOf<FlatConditions>

export type FlatNode =
    | string
    | {
          readonly [domain in Domain]?: readonly FlatCondition[]
      }

export const flatten = (node: TypeNode): FlatNode => {
    if (typeof node === "string") {
        return {}
    }
    return {}
}
