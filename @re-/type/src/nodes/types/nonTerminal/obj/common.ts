export * from "../nodes/index.js"
import { Node } from "../nodes/index.js"
import { Root } from "../root.js"

export type ChildEntry<KeyType> = [KeyType, Nodes.base]

export abstract class obj<defType extends object> extends Nodes.base {
    entries: ChildEntry<string>[]

    constructor(protected definition: defType, private ctx: Nodes.context) {
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
        opts: Nodes.References.Options<string, boolean>,
        collected: Nodes.References.Collection
    ) {
        for (const entry of this.entries) {
            entry[1].collectReferences(opts, collected)
        }
    }

    override references(opts: Nodes.References.Options) {
        if (opts.preserveStructure) {
            const references: Nodes.References.StructuredReferences = {}
            for (const [k, childNode] of this.entries) {
                references[k] = childNode.references(opts)
            }
            return references
        }
        return super.references(opts)
    }
}
