import type { Dict } from "../../utils/generics.ts"
import type { ComparisonState, CompilationState } from "../node.ts"
import { Node } from "../node.ts"
import { Type } from "../type.ts"

export class PropsNode extends Node<typeof PropsNode> {
    constructor(
        public readonly named: NamedProps,
        public readonly indexed: IndexedProps = []
    ) {
        super(PropsNode, named, indexed)
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
        return new PropsNode(named, indexed)
    }
}

export type PropKind = "required" | "optional" | "prerequisite"

export type NamedProps = Dict<string, NamedProp>
type IndexedProps = readonly IndexProp[]

type IndexProp = [keyType: Type, valueType: Type]

export class NamedProp extends Node<typeof NamedProp> {
    constructor(public readonly kind: PropKind, public readonly type: Type) {
        super(NamedProp, kind, type)
    }

    static compile(kind: PropKind, type: Type, s: CompilationState) {
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

        return new NamedProp(kind, type)
    }
}
