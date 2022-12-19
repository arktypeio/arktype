import type { Domain } from "../utils/domains.js"
import type { entryOf } from "../utils/generics.js"
import type { TypeNode } from "./node.js"
import type { Rules } from "./rules/rules.js"

export type FlatCondition = ["value", unknown] | entryOf<Omit<Rules, "props">>

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
