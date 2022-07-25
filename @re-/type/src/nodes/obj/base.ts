import { TreeOf } from "@re-/tools"
import { Base } from "../base/index.js"
import { defToString } from "../base/utils.js"
import { Root } from "../root.js"
export { Base } from "../base/index.js"

export type ChildEntry<KeyType> = [KeyType, Base.Parsing.Node]

export abstract class StructuredNonTerminal extends Base.NonTerminal<
    Base.Parsing.Node[]
> {
    entries: ChildEntry<string>[]

    constructor(private def: object, ctx: Base.Parsing.Context) {
        const children: Base.Parsing.Node[] = []
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
        return defToString(this.def)
    }

    structureReferences(opts: Base.References.Options) {
        const references: TreeOf<string[]> = {}
        for (const [k, childNode] of this.entries) {
            references[k] = childNode.references(opts)
        }
        return references
    }
}
