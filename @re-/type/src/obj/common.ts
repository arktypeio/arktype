export * from "../node/index.js"
export * as Utils from "../utils.js"
import { Node } from "../node/index.js"
import { Root } from "../root.js"

export type ChildEntry<KeyType> = [KeyType, Node.base]

export abstract class obj extends Node.base {
    entries: ChildEntry<string>[]

    constructor(private def: object, private ctx: Node.context) {
        super()
        const entries = Object.entries(def).map(
            ([k, childDef]): ChildEntry<string> => [
                k,
                Root.parse(childDef, { ...ctx, path: [...ctx.path, k] })
            ]
        )
        this.entries = entries
    }

    toString() {
        const isArray = Array.isArray(this.def)
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
        opts: Node.References.Options<string, boolean>,
        collected: Node.References.Collection
    ) {
        for (const entry of this.entries) {
            entry[1].collectReferences(opts, collected)
        }
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
