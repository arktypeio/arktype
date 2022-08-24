export * from "../common.js"
import { Root } from "../../../root.js"
import { Node, Utils } from "../common.js"

export type ChildEntry<KeyType> = [KeyType, Node.base]

export type StructuredReferences = {
    [K in string | number]: string[] | StructuredReferences
}

export abstract class ObjNode extends Node.NonTerminal<Node.base[]> {
    entries: ChildEntry<string>[]

    constructor(private def: object, ctx: Node.context) {
        const children: Node.base[] = []
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
        return Utils.defToString(this.def)
    }

    structureReferences(opts: Node.References.Options) {
        const references: StructuredReferences = {}
        for (const [k, childNode] of this.entries) {
            references[k] = childNode.references(opts)
        }
        return references
    }
}
