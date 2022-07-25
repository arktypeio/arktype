import { TreeOf } from "@re-/tools"
import { Create, Parsing, Validation } from "../features/index.js"
import { References } from "../features/references.js"
import { defToString, stringifyValue } from "../utils.js"

export abstract class Node {
    abstract allows(args: Validation.Args): boolean
    abstract generate(args: Create.Args): unknown
    abstract collectReferences(
        args: References.Args,
        collected: Set<string>
    ): void
    abstract toString(): string

    addUnassignable(args: Validation.Args) {
        args.errors.add(
            args.ctx.path,
            `${stringifyValue(
                args.value
            )} is not assignable to ${this.toString()}.`
        )
    }
}

// export abstract class Node {
//     abstract allows(args: Validation.Args): boolean
//     abstract generate(args: Create.Args): unknown
//     abstract collectReferences(
//         args: References.Args,
//         collected: Set<string>
//     ): void

//     /**
//      * Get definition references organized according to the structure of the original definition.
//      * Structured nodes like Record and Tuple should override this method.
//      */
//     structureReferences(args: References.Args): TreeOf<string[]> {
//         const refs = new Set<string>()
//         this.collectReferences(args, refs)
//         return [...refs]
//     }
// }
