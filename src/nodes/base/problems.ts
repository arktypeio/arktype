import { JsType } from "../../utils/jsType.js"
import type { Node } from "./node.js"

export type BaseProblemConfig = {
    omitActual?: boolean
}

export type Problem = {
    path: string
    reason: string
    parts?: string[]
}

export class ArktypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(problems.summary)
        this.cause = problems
    }
}

export class Problems extends Array<Problem> {
    byPath: Record<string, Problem> = {}

    get summary() {
        return ""
        // if (this.length === 1) {
        //     const error = this[0]
        //     if (error.path !== "") {
        //         return `${error.path} ${uncapitalize(error.message)}`
        //     }
        //     return error.message
        // }
        // return this.map(
        //     (problem) => `${problem.path}: ${problem.message}`
        // ).join("\n")
    }

    throw(): never {
        throw new ArktypeError(this)
    }
}

export class Stringifiable<Data = unknown> {
    constructor(public raw: Data) {}

    get typeOf() {
        return JsType.of(this.raw)
    }

    // TODO: Fix
    toString() {
        return JSON.stringify(this.raw)
    }
}

// export abstract class Problem<
//     Data = unknown,
//     Config extends BaseProblemConfig = BaseProblemConfig
// > {
//     constructor(
//         public path: string,
//         public type: Node,
//         private rawData: Data,
//         public config: Config
//     ) {}

//     abstract defaultMessage: string

//     get data() {
//         return new Stringifiable(this.rawData)
//     }

//     // get defaultMessage() {
//     //     let message = `Must be ${this.type.description}`
//     //     if (!this.config.omitActual) {
//     //         if ("actual" in context) {
//     //             message += ` (was ${context.actual})`
//     //         } else if (
//     //             !this.omitActualByDefault &&
//     //             // If we're in a union, don't redundandtly include data (other
//     //             // "actual" context is still included)
//     //             !this.branchPath.length
//     //         ) {
//     //             message += ` (was ${this.data.toString()})`
//     //         }
//     //     }
//     //     return message
//     // }

//     get message() {
//         let result = this.config.message?.(this) ?? this.defaultMessage
//         if (this.branchPath.length) {
//             const branchIndentation = "  ".repeat(this.branchPath.length)
//             result = branchIndentation + result
//         }
//         return result
//     }
// }
