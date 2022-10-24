import { JsType } from "../../utils/jsType.js"
import type { Node } from "./node.js"

export type BaseProblemConfig = {
    omitActual?: boolean
}

export class ProblemO {
    constructor(public path: string, public reasons: string[]) {}

    addIfUnique(reason: string) {
        if (!this.reasons.includes(reason)) {
            this.reasons.push(reason)
        }
    }

    get message() {
        if (this.reasons.length === 1) {
            return this.reasons[0]
        }
        return "• " + this.reasons.join("\n• ")
    }
}

export class ProblemTwo {
    constructor(public path: string, public reasons: string[]) {}

    addIfUnique(reason: string) {
        if (!this.reasons.includes(reason)) {
            this.reasons.push(reason)
        }
    }

    get message() {
        if (this.reasons.length === 1) {
            return this.reasons[0]
        }
        return "• " + this.reasons.join("\n• ")
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

export type Problem = {
    path: string
    reason: string
}

export class ProblemIntersection {
    constructor(public path: string, public reasons: string[]) {}

    get defaultMessage() {
        return "• " + this.reasons.join("\n• ")
    }
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

    addIfUnique(path: string, reason: string) {
        // if (path in this.byPath) {
        //     this.byPath[path].addIfUnique(reason)
        // } else {
        //     this.byPath[path] = new Problem(path, [reason])
        //     this.push(this.byPath[path])
        // }
    }

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
