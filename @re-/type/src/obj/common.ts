export * from "../node/index.js"
export * as Utils from "../utils.js"
import { Node } from "../node/index.js"
import { Root } from "../root.js"
import * as Utils from "../utils.js"

export type ChildEntry<KeyType> = [KeyType, Node.base]

export abstract class obj extends Node.nonTerminal<Node.base[]> {
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

    override references(opts: Node.References.Options) {
        if (opts.preserveStructure) {
            const references: Node.References.StructuredReferences = {}
            for (const [k, childNode] of this.entries) {
                references[k] = childNode.references(opts)
            }
            return references
        }
        return super.references(opts)
    }
}
