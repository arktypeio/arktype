import type { Domain } from "../utils/domains.js"
import type { entryOf, mutable } from "../utils/generics.js"
import { entriesOf, listFrom } from "../utils/generics.js"
import type { TypeSet } from "./node.js"
import type { PropsRules } from "./rules/props.js"
import type { Rules } from "./rules/rules.js"
import { isExactValuePredicate } from "./utils.js"

export const flatten = (node: TypeSet): FlatNode => {
    let domain: Domain
    const result = {} as mutable<FlatNode>
    for (domain in node) {
        const predicate = node[domain]!
        if (predicate === true) {
            result[domain] = true
        } else {
            result[domain] = listFrom(predicate).map((condition) => {
                if (typeof condition === "string") {
                    return condition
                }
                if (isExactValuePredicate(condition)) {
                    return ["value", condition.value]
                }
                const flatEntries = entriesOf(condition)
                return flatEntries.map((entry) =>
                    entry[0] === "props"
                        ? [entry[0], flattenProps(entry[1])]
                        : entry
                )
            }) as FlatCondition[]
        }
    }
    return result
}

const flattenProps = (props: PropsRules) => {
    const result = {} as mutable<FlattenedProps>
    let k: keyof PropsRules
    for (k in props) {
        result[k] = entriesOf(props[k]!).map(([k, node]) => [
            k,
            typeof node === "string" ? node : flatten(node)
        ]) as FlattenedPropGroup
    }
    return result
}

export const flattenAll = <nodes extends { readonly [k in string]: TypeSet }>(
    nodes: nodes
) => {
    const result = {} as { [k in keyof nodes]: FlatNode }
    for (const name in nodes) {
        result[name] = flatten(nodes[name])
    }
    return result
}

export type FlatNode = {
    readonly [domain in Domain]?: true | readonly FlatCondition[]
}

type FlatCondition = string | readonly FlatRule[]

// TODO: Sort
type FlatRule =
    | (entryOf<Omit<Rules, "props">> & {})
    | ["props", FlattenedProps]
    | ["value", unknown]

type FlattenedProps = {
    readonly required?: FlattenedPropGroup
    readonly optional?: FlattenedPropGroup
    readonly mapped?: FlattenedPropGroup
}

type FlattenedPropGroup = [key: string, node: FlatNode][]
