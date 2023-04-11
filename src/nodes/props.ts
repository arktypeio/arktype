import type { Dict, List, mutable } from "../utils/generics.js"
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
                    : TypeNode.from(...keyInput),
                valueInput instanceof TypeNode
                    ? valueInput
                    : TypeNode.from(...valueInput)
            ]
        )
        const child: PropsChild = {
            named,
            indexed
        }
        return new PropsNode(child)
    }

    static compile(child: PropsChild, s: CompilationState) {
        const propChecks: string[] = []
        // // if we don't care about extraneous keys, compile props so we can iterate over the definitions directly
        // for (const k in named) {
        //     const prop = named[k]
        //     c.path.push(k)
        //     propChecks.push(prop.type.compile(c))
        //     c.path.pop()
        // }
        return propChecks.length ? s.mergeChecks(propChecks) : "true"
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

export type PropValueInput = TypeNode | TypeNodeInput

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
                    : TypeNode.from(...input.value)
        }
        return new NamedPropNode(child)
    }

    static compile(child: NamedPropChild, s: CompilationState) {
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
