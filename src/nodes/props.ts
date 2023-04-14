import {
    type Dict,
    type List,
    listFrom,
    type mutable
} from "../utils/generics.js"
import type { ComparisonState, CompilationState } from "./node.js"
import { Disjoint, Node } from "./node.js"
import type { TypeNodeInput } from "./type.js"
import { never, TypeNode } from "./type.js"

export class PropsNode extends Node<typeof PropsNode> {
    readonly named: PropsChild["named"]
    readonly indexed: PropsChild["indexed"]

    constructor(child: PropsChild) {
        super(PropsNode, child)
        this.named = child.named
        this.indexed = child.indexed
    }

    static from(input: PropsInput) {
        const named = {} as mutable<PropsChild["named"]>
        for (const k in input.named) {
            const namedPropDefinition = input.named[k]
            named[k] =
                namedPropDefinition instanceof NamedPropNode
                    ? namedPropDefinition
                    : NamedPropNode.from(namedPropDefinition)
        }
        const indexed: PropsChild["indexed"] = input.indexed.map(
            ([keyInput, valueInput]) => [
                keyInput instanceof TypeNode
                    ? keyInput
                    : TypeNode.from(...listFrom(keyInput)),
                valueInput instanceof TypeNode
                    ? valueInput
                    : TypeNode.from(...listFrom(valueInput))
            ]
        )
        const child: PropsChild = {
            named,
            indexed
        }
        return new PropsNode(child)
    }

    static checks({ named }: PropsChild, s: CompilationState) {
        const checks: string[] = []
        const names = Object.keys(named).sort()
        for (const k of names) {
            s.path.push(k)
            // TODO: precedence
            checks.push(...named[k].compile(s))
            s.path.pop()
        }
        return checks
    }

    intersect(other: PropsNode, s: ComparisonState) {
        const indexed = [...this.indexed]
        for (const [rKey, rValue] of other.indexed) {
            const matchingIndex = indexed.findIndex(([lKey]) => lKey === rKey)
            if (matchingIndex === -1) {
                indexed.push([rKey, rValue])
            } else {
                // TODO: path updates here
                const result = indexed[matchingIndex][1].intersect(rValue, s)
                indexed[matchingIndex][1] =
                    result instanceof Disjoint ? never : result
            }
        }
        const named = { ...this.named, ...other.named }
        for (const k in named) {
            let propResult = named[k]
            if (k in this.named) {
                if (k in other.named) {
                    // We assume l and r were properly created and the named
                    // props from each PropsNode have already been intersected
                    // with any matching index props. Therefore, the
                    // intersection result will already include index values
                    // from both sides whose key types allow k.
                    const result = this.named[k].intersect(other.named[k], s)
                    if (result instanceof Disjoint) {
                        return result
                    }
                    propResult = result
                } else {
                    // If a named key from l matches any index keys of r, intersect
                    // the value associated with the name with the index value.
                    for (const [rKey, rValue] of other.indexed) {
                        if (rKey(k)) {
                            const rValueAsProp = new NamedPropNode({
                                kind: "optional",
                                value: rValue
                            })
                            const result = propResult.intersect(rValueAsProp, s)
                            if (result instanceof Disjoint) {
                                return result
                            }
                            propResult = result
                        }
                    }
                }
            } else {
                // If a named key from r matches any index keys of l, intersect
                // the value associated with the name with the index value.
                for (const [lKey, lValue] of this.indexed) {
                    if (lKey(k)) {
                        const lValueAsProp = new NamedPropNode({
                            kind: "optional",
                            value: lValue
                        })
                        const result = propResult.intersect(lValueAsProp, s)
                        if (result instanceof Disjoint) {
                            return result
                        }
                        propResult = result
                    }
                }
            }
            named[k] = propResult
        }
        return new PropsNode({ named, indexed })
    }
}

export type PropValueInput = TypeNode | TypeNodeInput | TypeNodeInput[number]

export type PropsInput = {
    named: Dict<string, NamedPropNode | NamedPropInput>
    indexed: List<[keyType: PropValueInput, valueType: PropValueInput]>
}

export type PropsChild = {
    named: Dict<string, NamedPropNode>
    indexed: List<[keyType: TypeNode, valueType: TypeNode]>
}

export type PropKind = "required" | "optional" | "prerequisite"

export type NamedPropInput = {
    kind: PropKind
    value: PropValueInput
}

export type NamedPropChild = {
    kind: PropKind
    value: TypeNode
}

export class NamedPropNode extends Node<typeof NamedPropNode> {
    constructor(child: NamedPropChild) {
        super(NamedPropNode, child)
    }

    static from(input: NamedPropInput) {
        const child: NamedPropChild = {
            kind: input.kind,
            value:
                input.value instanceof TypeNode
                    ? input.value
                    : TypeNode.from(...listFrom(input.value))
        }
        return new NamedPropNode(child)
    }

    static checks(child: NamedPropChild, s: CompilationState) {
        return child.value.compile(s)
    }

    intersect(
        other: NamedPropNode,
        s: ComparisonState
    ): NamedPropNode | Disjoint {
        const kind =
            this.child.kind === "prerequisite" ||
            other.child.kind === "prerequisite"
                ? "prerequisite"
                : this.child.kind === "required" ||
                  other.child.kind === "required"
                ? "required"
                : "optional"
        const result = this.child.value.intersect(other.child.value, s)
        return result instanceof Disjoint
            ? kind === "optional"
                ? new NamedPropNode({
                      kind,
                      value: never
                  })
                : result
            : new NamedPropNode({
                  kind,
                  value: result
              })
    }
}

// const keysOfPredicate = (domain: Domain, predicate: Predicate) =>
//     domain !== "object" || predicate === true
//         ? baseKeysByDomain[domain]
//         : sharedKeysOf(
//               listFrom(predicate).map((branch) => keysOfObjectBranch(branch))
//           )

// const sharedKeysOf = (keyBranches: List<KeyValue>[]): List<KeyValue> => {
//     if (!keyBranches.length) {
//         return []
//     }
//     let sharedKeys = keyBranches[0]
//     for (let i = 1; i < keyBranches.length; i++) {
//         // we can filter directly by equality here because the RegExp we're
//         // using will always be reference equal to
//         // wellFormedNonNegativeIntegerMatcher
//         sharedKeys = sharedKeys.filter((k) => keyBranches[i].includes(k))
//     }
//     return sharedKeys
// }

// const keysOfObjectBranch = (branch: BranchDefinition<"object">): KeyValue[] => {
//     const result: KeyValue[] = []
//     if ("props" in branch) {
//         for (const key of Object.keys(branch.props)) {
//             if (key === mappedKeys.index) {
//                 // if any number is a valid key push this RegExp
//                 result.push(wellFormedNonNegativeIntegerMatcher)
//             } else if (!result.includes(key)) {
//                 result.push(key)
//                 if (wellFormedNonNegativeIntegerMatcher.test(key)) {
//                     // allow numeric access to keys
//                     result.push(
//                         tryParseWellFormedInteger(
//                             key,
//                             `Unexpectedly failed to parse an integer from key '${key}'`
//                         )
//                     )
//                 }
//             }
//         }
//     }
//     if ("instance" in branch) {
//         for (const key of prototypeKeysOf(branch.instance.prototype)) {
//             if (!result.includes(key)) {
//                 result.push(key)
//             }
//         }
//     }
//     return result
// }
