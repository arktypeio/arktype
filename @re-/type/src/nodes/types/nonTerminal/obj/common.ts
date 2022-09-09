import { Root } from "../../../../root.js"
import { Base } from "../../../base.js"
import { References } from "../../../traversal/references.js"

export type ChildEntry<KeyType> = [KeyType, Base.node]

export abstract class obj<defType extends object> extends Base.node {
    entries: ChildEntry<string>[]

    constructor(protected definition: defType, private ctx: Base.context) {
        super()
        const entries = Object.entries(definition).map(
            ([k, childDef]): ChildEntry<string> => [
                k,
                Root.parse(childDef, { ...ctx, path: [...ctx.path, k] })
            ]
        )
        this.entries = entries
    }

    toString() {
        const isArray = Array.isArray(this.definition)
        const indentation = "    ".repeat(this.ctx.path.length)
        const nestedIndentation = indentation + "    "
        let result = isArray ? "[" : "{"
        for (let i = 0; i < this.entries.length; i++) {
            result += "\n" + nestedIndentation
            if (!isArray) {
                result += this.entries[i][0] + ": "
            }
            result += this.entries[i][1].toString()
            if (i !== this.entries.length - 1) {
                result += ","
            } else {
                result += "\n"
            }
        }
        return result + indentation + (isArray ? "]" : "}")
    }

    collectReferences(
        opts: References.Options<string, boolean>,
        collected: References.Collection
    ) {
        for (const entry of this.entries) {
            entry[1].collectReferences(opts, collected)
        }
    }

    override references(opts: References.Options) {
        if (opts.preserveStructure) {
            const references: References.StructuredReferences = {}
            for (const [k, childNode] of this.entries) {
                references[k] = childNode.references(opts)
            }
            return references
        }
        return super.references(opts)
    }
}
