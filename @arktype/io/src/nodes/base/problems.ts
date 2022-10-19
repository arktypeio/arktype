import { jsTypeOf, toString } from "@arktype/tools"
import type { Node } from "./node.js"

export type ProblemSource = Node & {
    mustBe: string
}

export class Problem<Data = unknown> {
    constructor(
        public type: ProblemSource,
        public path: string,
        public data: Stringifiable<Data>
    ) {}

    message() {
        return `Must be ${this.type.mustBe}`
    }
}

export class ProblemSet<Data = unknown> {
    problems: Problem<Data>[]

    constructor(
        initial: ProblemSource,
        public path: string,
        public data: Stringifiable<Data>
    ) {
        this.problems = [new Problem(initial, path, data)]
    }

    addIfUnique(source: ProblemSource) {
        if (
            !this.problems.some(
                (problem) => problem.type.mustBe === source.mustBe
            )
        ) {
            this.problems.push(new Problem(source, this.path, this.data))
        }
    }

    message() {
        if (this.problems.length === 1) {
            return this.problems[0].message
        }
        let aggregated = ""
        for (const problem of this.problems) {
            aggregated += `• ${problem.message}\n`
        }
        return aggregated
    }
}

export class Stringifiable<Data = unknown> {
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
