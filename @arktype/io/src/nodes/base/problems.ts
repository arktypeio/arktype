import { jsTypeOf, toString, uncapitalize } from "@arktype/tools"
import { Intersection } from "../expression/branching/intersection.js"
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

    intersectIfUnique(source: ProblemSource) {
        if (this.type.kind === "intersection") {
            const problemChildren = this.type.children as ProblemSource[]
            if (
                !problemChildren.some((child) => child.mustBe === source.mustBe)
            ) {
                // TODO: Add narrow
                ;(this.type as Intersection.Node).pushChild(source)
            }
        } else if (this.type.mustBe !== source.mustBe) {
            this.type = new Intersection.Node([this.type, source])
        }
    }

    get message() {
        return `Must be ${this.type.mustBe}`
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

export class Problems extends Array<Problem> {
    byPath: Record<string, Problem> = {}

    addIfUnique(source: ProblemSource, path: string, data: Stringifiable) {
        if (path in this.byPath) {
            this.byPath[path].intersectIfUnique(source)
        } else {
            this.byPath[path] = new Problem(source, path, data)
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
