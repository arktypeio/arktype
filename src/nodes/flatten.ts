import type { Domain } from "../utils/domains.js"
import type { entryOf } from "../utils/generics.js"
import type { TypeNode } from "./node.js"
import type { Rules } from "./rules/rules.js"

export const flatten = (node: TypeNode): FlatNode => {
    if (typeof node === "string") {
        return {}
    }
    return {}
}

export type FlatNode =
    | string
    | {
          readonly [domain in Domain]?: true | readonly FlatCondition[]
      }

type FlatCondition = string | readonly FlatRule[]

// TODO: Sort
type FlatRule =
    | entryOf<Omit<Rules, "props">>
    | ["props", FlattenedProps]
    | ["value", unknown]

type FlattenedProps = {
    readonly optional?: FlattenedPropGroup
    readonly required?: FlattenedPropGroup
    readonly mapped?: FlattenedPropGroup
}

type FlattenedPropGroup = { readonly [k in string]: FlatNode }
