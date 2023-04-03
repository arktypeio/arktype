import type { Dict } from "../../utils/generics.ts"
import type { ComparisonState, CompilationState } from "../node.ts"
import { Node } from "../node.ts"
import { RootNode, Type } from "../type.ts"

export type PropsNodeDefinition = {
    named: NamedProps
    indexed: IndexedProps
}

export class PropsNode extends Node<typeof PropsNode> {
    readonly named: NamedProps
    readonly indexed: IndexedProps

    constructor(definition: PropsNodeDefinition) {
        super(PropsNode, definition)
        this.named = definition.named
        this.indexed = definition.indexed
    }

    static compile(
        named: NamedProps,
        indexed: IndexedProps,
        s: CompilationState
    ) {
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

    static intersect(l: PropsNode, r: PropsNode, s: ComparisonState) {
        const indexed = [...l.indexed]
        for (const [rKey, rValue] of r.indexed) {
            const matchingIndex = indexed.findIndex(([lKey]) => lKey === rKey)
            if (matchingIndex === -1) {
                indexed.push([rKey, rValue])
            } else {
                // TODO: path updates here
                indexed[matchingIndex][1] = Type.intersect(
                    indexed[matchingIndex][1],
                    rValue,
                    s
                )
            }
        }
        const named = { ...l.named, ...r.named }
        for (const k in named) {
            let propResult = named[k]
            if (k in l) {
                if (k in r) {
                    // We assume l and r were properly created and the named
                    // props from each PropsNode have already been intersected
                    // with any matching index props. Therefore, the
                    // intersection result will already include index values
                    // from both sides whose key types allow k.
                    propResult = NamedProp.intersect(l.named[k], r.named[k], s)
                } else {
                    // If a named key from l matches any index keys of r, intersect
                    // the value associated with the name with the index value.
                    for (const [rKey, rValue] of r.indexed) {
                        if (rKey.allows(k)) {
                            const rValueAsProp = new NamedProp(
                                "optional",
                                rValue
                            )
                            propResult = NamedProp.intersect(
                                propResult,
                                rValueAsProp,
                                s
                            )
                        }
                    }
                }
            } else {
                // If a named key from r matches any index keys of l, intersect
                // the value associated with the name with the index value.
                for (const [lKey, lValue] of l.indexed) {
                    if (lKey.allows(k)) {
                        const lValueAsProp = new NamedProp("optional", lValue)
                        propResult = NamedProp.intersect(
                            propResult,
                            lValueAsProp,
                            s
                        )
                    }
                }
            }
            if (
                propResult.type.isDisjoint() &&
                propResult.kind !== "optional"
            ) {
                return propResult.type
            }
            named[k] = propResult
        }
        return new PropsNode({ named, indexed })
    }
}

export type NamedProps = Dict<string, NamedProp>
type IndexedProps = readonly IndexProp[]

export type PropKind = "required" | "optional" | "prerequisite"

type IndexProp = [keyType: Type, valueType: Type]

export type NamedPropDefinition = {
    kind: PropKind
    type: Type
}

export class NamedProp extends Node<typeof NamedProp> {
    kind: PropKind
    type: Type

    constructor(definition: NamedPropDefinition) {
        super(NamedProp, definition)
        this.kind = definition.kind
        this.type = new Type(definition)
    }

    static createChildren(definition: NamedPropDefinition) {
        return {
            kind: definition.kind,
            type: definition.type
        }
    }

    static compile(def: NamedPropDefinition, s: CompilationState) {
        return type.compile(s)
    }

    static intersect(l: NamedProp, r: NamedProp, s: ComparisonState) {
        const kind =
            l.kind === "prerequisite" || r.kind === "prerequisite"
                ? "prerequisite"
                : l.kind === "required" || r.kind === "required"
                ? "required"
                : "optional"
        const type = Type.intersect(l.type, r.type, s)
        return new NamedProp({ kind, root: type })
    }
}
