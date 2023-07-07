import { hasKeys } from "@arktype/utils"
import { hasArkKind } from "../../compiler/registry.js"
import type { DisjointsSources } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import { extractArrayIndexRegex } from "./indexed.js"
import type { NamedPropRule } from "./named.js"
import { intersectNamedProp } from "./named.js"
import { PropertiesNode } from "./properties.js"

export const intersectProps = (
    l: PropertiesNode,
    r: PropertiesNode
): PropertiesNode | Disjoint => {
    let indexed = [...l.indexed]
    for (const { key, value } of r.indexed) {
        const matchingIndex = indexed.findIndex((entry) => entry.key === key)
        if (matchingIndex === -1) {
            indexed.push({ key, value })
        } else {
            const result = indexed[matchingIndex].value.intersect(value)
            indexed[matchingIndex] = {
                key,
                value: result instanceof Disjoint ? builtins.never() : result
            }
        }
    }
    const byName = { ...l.byName, ...r.byName }
    const named: NodeEntry[] = []
    const disjointsByPath: DisjointsSources = {}
    for (const k in byName) {
        // TODO: not all discriminatable- if one optional and one required, even if disjoint
        let intersectedValue: NamedPropRule | Disjoint = byName[k]
        if (k in l.byName) {
            if (k in r.byName) {
                // We assume l and r were properly created and the named
                // props from each PropsNode have already been intersected
                // with any matching index props. Therefore, the
                // intersection result will already include index values
                // from both sides whose key types allow k.
                intersectedValue = intersectNamedProp(l.byName[k], r.byName[k])
            } else {
                // If a named key from l matches any index keys of r, intersect
                // the value associated with the name with the index value.
                for (const { key, value } of r.indexed) {
                    if (key.allows(k)) {
                        intersectedValue = intersectNamedProp(l.byName[k], {
                            key: {
                                name: k,
                                prerequisite: false,
                                optional: true
                            },
                            value
                        })
                    }
                }
            }
        } else {
            // If a named key from r matches any index keys of l, intersect
            // the value associated with the name with the index value.
            for (const { key, value } of l.indexed) {
                if (key.allows(k)) {
                    intersectedValue = intersectNamedProp(r.byName[k], {
                        key: {
                            name: k,
                            prerequisite: false,
                            optional: true
                        },
                        value
                    })
                }
            }
        }
        if (intersectedValue instanceof Disjoint) {
            Object.assign(
                disjointsByPath,
                intersectedValue.withPrefixKey(k).sources
            )
        } else {
            named.push(intersectedValue)
        }
    }
    if (hasKeys(disjointsByPath)) {
        return new Disjoint(disjointsByPath)
    }
    if (
        named.some(
            ({ key }) =>
                !hasArkKind(key, "node") &&
                key.name === "length" &&
                key.prerequisite
        )
    ) {
        // if the index key is from and unbounded array and we have a tuple length,
        // it has already been intersected and should be removed
        indexed = indexed.filter((entry) => !extractArrayIndexRegex(entry.key))
    }
    // TODO: review other intersections to make sure meta is handled correclty
    return new PropertiesNode([...named, ...indexed], l.meta)
}
