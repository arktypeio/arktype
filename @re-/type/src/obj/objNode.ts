import { Node } from "../common.js"
import { Root } from "../root.js"

export type ChildEntry<KeyType> = [KeyType, Node.Base]

export type StructuredReferences = {
    [K in string | number]: string[] | StructuredReferences
}

export abstract class ObjNode extends Node.NonTerminal<Node.Base[]> {
    entries: ChildEntry<string>[]

    constructor(private def: object, ctx: Node.Context) {
        const children: Node.Base[] = []
        const entries = Object.entries(def).map(
            ([k, childDef]): ChildEntry<string> => {
                const propNode = Root.parse(childDef, ctx)
                children.push(propNode)
                return [k, propNode]
            }
        )
        super(children, ctx)
        this.entries = entries
    }

    toString() {
        return Node.Utils.defToString(this.def)
    }

    structureReferences(opts: Node.References.Options) {
        const references: StructuredReferences = {}
        for (const [k, childNode] of this.entries) {
            references[k] = childNode.references(opts)
        }
        return references
    }
}
