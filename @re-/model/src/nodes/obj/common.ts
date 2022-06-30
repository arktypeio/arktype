import { Entry } from "@re-/tools"
import { Common } from "../common.js"

export abstract class Branch<
    DefType extends object,
    Next extends Entry<string | number, Common.Parser.Node>[]
> extends Common.Branch<DefType, Next> {
    defToString() {
        return this.stringifyDef()
    }
    // references(args: Common.References.Options) {
    //     const result: string[] = []
    //     for (const [, valueNode] of this.next()) {
    //         result.push(...valueNode.references(args))
    //     }
    //     return result
    // }
}
