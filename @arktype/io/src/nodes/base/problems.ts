import { jsTypeOf, toString, uncapitalize } from "@arktype/tools"
import type { Node } from "./node.js"

export type ProblemSource = Node & {
    mustBe: string
}

export class Problem<Data = unknown> {
    next?: Problem<Data>

    constructor(
        public type: ProblemSource,
        public path: string,
        public data: Stringifiable<Data>
    ) {}

    chainIfUnique(source: ProblemSource) {
        if (this.type.mustBe !== source.mustBe) {
            if (this.next) {
                this.next.chainIfUnique(source)
            } else {
                this.next = new Problem(source, this.path, this.data)
            }
        }
    }

    get message() {
        return `Must be ${this.type.mustBe}`
    }
}

export class ProblemSet<Data = unknown> extends Array<Problem<Data>> {
    constructor(
        initial: ProblemSource,
        public path: string,
        public data: Stringifiable<Data>
    ) {
        super(new Problem(initial, path, data))
    }

    addIfUnique(source: ProblemSource) {
        if (!this.some((problem) => problem.type.mustBe === source.mustBe)) {
            this.push(new Problem(source, this.path, this.data))
        }
    }

    get message() {
        if (this.length === 1) {
            return this[0].message
        }
        return "• " + this.map((problem) => problem.message).join("\n• ")
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

export class ArktypeError extends TypeError {
    cause: Problems

    constructor(problems: Problems) {
        super(problems.summary)
        this.cause = problems
    }
}

export class Problems extends Array<ProblemSet> {
    byPath: Record<string, ProblemSet> = {}

    addIfUnique(source: ProblemSource, path: string, data: Stringifiable) {
        if (path in this.byPath) {
            this.byPath[path].addIfUnique(source)
        } else {
            this.byPath[path] = new ProblemSet(source, path, data)
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
            (problemSet) => `${problemSet.path}: ${problemSet.message}`
        ).join("\n")
    }

    throw() {
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
