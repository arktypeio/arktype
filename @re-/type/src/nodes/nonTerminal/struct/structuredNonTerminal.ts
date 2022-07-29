import { Base } from "../../base/index.js"
import { Root } from "../../root.js"
import { NonTerminal } from "../nonTerminal.js"

export type ChildEntry<KeyType> = [KeyType, Base.Node]

export type StructuredReferences = {
    [K in string | number]: string[] | StructuredReferences
}

export abstract class StructuredNonTerminal extends NonTerminal<Base.Node[]> {
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
        const references: StructuredReferences = {}
        for (const [k, childNode] of this.entries) {
            references[k] = childNode.references(opts)
        }
        return references
    }
}
