import { Root } from "../../parser/root.js"
import { Allows } from "../allows.js"
import { Base } from "../base.js"
import type { References } from "../references.js"
import { KeywordDiagnostic } from "../terminals/keywords/common.js"

export type ChildEntry<KeyType> = [KeyType, Base.node]

export abstract class structure<defType extends object> extends Base.node {
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

export type ObjectKind = "array" | "dictionary"

export const checkObjectRoot = <Kind extends ObjectKind>(
    args: Allows.Args,
    kind: Kind
): args is Allows.Args<
    Kind extends "array" ? unknown[] : Record<string, unknown>
> => {
    if (typeof args.data !== "object" || args.data === null) {
        args.diagnostics.push(new KeywordDiagnostic("object", args))
        return false
    }
    if ((kind === "array") !== Array.isArray(args.data)) {
        args.diagnostics.push(new ObjectKindDiagnostic(kind, args))
        return false
    }
    return true
}

export class ObjectKindDiagnostic extends Allows.Diagnostic<"ObjectKind"> {
    public message: string

    constructor(public type: ObjectKind, args: Allows.Args) {
        super("ObjectKind", args)
        this.message = `Must ${type === "dictionary" ? "not " : ""}be an array.`
    }
}
