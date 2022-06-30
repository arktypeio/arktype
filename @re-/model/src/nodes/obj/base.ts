import { Entry } from "@re-/tools"
import { Base } from "../base/index.js"
export { Base }

export namespace ObjBase {
    export abstract class Branch<
        DefType extends object,
        Next extends Entry<string | number, Base.Parsing.Node>[]
    > extends Base.Branch<DefType, Next> {
        defToString() {
            return this.stringifyDef()
        }

        references(args: Base.References.Options) {
            const result: string[] = []
            for (const [, valueNode] of this.next()) {
                result.push(...valueNode.references(args))
            }
            return result
        }
    }
}
