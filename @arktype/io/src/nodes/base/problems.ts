import { jsTypeOf, toString, uncapitalize } from "@arktype/tools"

export class Problem {
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
        if (path in this.byPath) {
            this.byPath[path].addIfUnique(reason)
        } else {
            this.byPath[path] = new Problem(path, [reason])
            this.push(this.byPath[path])
        }
    }

    get summary() {
        if (this.length === 1) {
            const error = this[0]
            if (error.path !== "") {
                return `${error.path} ${uncapitalize(error.message)}`
            }
            return error.message
        }
        return this.map(
            (problem) => `${problem.path}: ${problem.message}`
        ).join("\n")
    }

    throw(): never {
        throw new ArktypeError(this)
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
