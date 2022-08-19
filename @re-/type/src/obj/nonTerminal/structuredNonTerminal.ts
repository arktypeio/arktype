import { Root } from "../../../root.js"
import { Core } from "../../core/index.js"
import { NonTerminal } from "../nonTerminal.js"

export type ChildEntry<KeyType> = [KeyType, Core.Node]

export type StructuredReferences = {
    [K in string | number]: string[] | StructuredReferences
}

export abstract class StructuredNonTerminal extends NonTerminal<Core.Node[]> {
    entries: ChildEntry<string>[]

    constructor(private def: object, ctx: Core.Parsing.Context) {
        const children: Core.Node[] = []
        const entries = Object.entries(def).map(
            ([k, childDef]): ChildEntry<string> => {
                const propNode = Root.parse(childDef, {
                    ...ctx,
                    path: Core.pathAdd(ctx.path, k)
                })
                children.push(propNode)
                return [k, propNode]
            }
        )
        super(children, ctx)
        this.entries = entries
    }

    toString() {
        return Core.defToString(this.def)
    }

    structureReferences(opts: Core.References.Options) {
        const references: StructuredReferences = {}
        for (const [k, childNode] of this.entries) {
            references[k] = childNode.references(opts)
        }
        return references
    }
}
