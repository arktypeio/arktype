import { jsTypeOf, toString } from "@arktype/tools"
import type { Node } from "./node.js"

export type ProblemSource<Data> = Node & {
    defaultMessage(problem: Problem<Data>): string
}

export class Problem<Data> {
    public data: Stringifiable<Data>

    constructor(
        public type: ProblemSource<Data>,
        public path: string,
        data: Data
    ) {
        this.data = new Stringifiable(data)
    }

    message() {
        return this.type.defaultMessage(this)
    }
}

export class ProblemSet<Data> {
    public data: Stringifiable<Data>

    constructor(
        public type: ProblemSource<Data>,
        public path: string,
        data: Data
    ) {
        this.data = new Stringifiable(data)
    }

    message() {
        let aggregated = {}
        return this.type.defaultMessage(this)
    }
}

export class Stringifiable<Data> {
    constructor(public raw: Data) {}

    get typeOf() {
        return jsTypeOf(this.raw)
    }

    toString() {
        return toString(this.raw, {
            maxNestedStringLength: 50
        })
    }
}

// export class Problem<Code extends ProblemCode> {
//     data: Stringifiable<Data>
//     private branchPath: string[]
//     protected omitActualByDefault?: true

//     constructor(
//         public code: Code,
//         public path: string,
//         public type: Base.Node
//     ) {
//         this.data = stringifiableFrom(state.data)
//         this.branchPath = state.branchPath
//         this.options = (state.scopes.query("errors", this.code) as any) ?? {}
//     }

//     get defaultMessage() {
//         let message = `Must be ${this.type.mustBe}`
//         if (!this.options.omitActual) {
//             if ("actual" in context) {
//                 message += ` (was ${context.actual})`
//             } else if (
//                 !this.omitActualByDefault &&
//                 // If we're in a union, don't redundandtly include data (other
//                 // "actual" context is still included)
//                 !this.branchPath.length
//             ) {
//                 message += ` (was ${this.data.toString()})`
//             }
//         }
//         return message
//     }

//     get message() {
//         let result = this.options.message?.(this) ?? this.defaultMessage
//         if (this.branchPath.length) {
//             const branchIndentation = "  ".repeat(this.branchPath.length)
//             result = branchIndentation + result
//         }
//         return result
//     }
// }

export type ProblemKinds = {
    type: {}
    regex: {}
    numberSubtype: {}
    divisibility: {}
    bound: {}
    multiple: {}
}

export type ProblemCode = keyof ProblemKinds

// export class ArktypeError extends TypeError {
//     cause: Problems

//     constructor(problems: Problems) {
//         super(problems.summary)
//         this.cause = problems
//     }
// }

// export class Problems extends Array<Problem<ProblemCode>> {
//     add(node: Base.Node): false {
//         return false
//     }

//     get summary() {
//         if (this.length === 1) {
//             const error = this[0]
//             if (error.path.length) {
//                 const pathPrefix =
//                     error.path.length === 1 && isIntegerLike(error.path[0])
//                         ? `Item ${error.path[0]}`
//                         : pathToString(error.path)
//                 return `${pathPrefix} ${uncapitalize(error.message)}`
//             }
//             return error.message
//         }
//         let aggregatedMessage = ""
//         for (const error of this) {
//             aggregatedMessage += `${pathToString(error.path)}: ${
//                 error.message
//             }\n`
//         }
//         return aggregatedMessage.slice(0, -1)
//     }

//     throw() {
//         throw new ArktypeError(this)
//     }
// }
