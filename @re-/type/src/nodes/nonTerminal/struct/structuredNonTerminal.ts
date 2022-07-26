import { TreeOf } from "@re-/tools"
import { Base } from "../../base/index.js"
import { Root } from "../../root.js"

export type ChildEntry<KeyType> = [KeyType, Base.Node]

export abstract class StructuredNonTerminal extends Base.NonTerminal<
    Base.Node[]
> {
    entries: ChildEntry<string>[]

    constructor(private def: object, ctx: Base.Parsing.Context) {
        const children: Base.Node[] = []
        const entries = Object.entries(def).map(
            ([k, childDef]): ChildEntry<string> => {
                const propNode = Root.parse(childDef, {
                    ...ctx,
                    path: Base.pathAdd(ctx.path, k)
                })
                children.push(propNode)
                return [k, propNode]
            }
        )
        super(children, ctx)
        this.entries = entries
    }

    toString() {
        return Base.defToString(this.def)
    }

    structureReferences(opts: Base.References.Options) {
        const references: TreeOf<string[]> = {}
        for (const [k, childNode] of this.entries) {
            references[k] = childNode.references(opts)
        }
        return references
    }
}
