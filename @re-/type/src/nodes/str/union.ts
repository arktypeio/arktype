import { TypeOfResult } from "@re-/tools"
import { Base } from "./base.js"

type PreferredDefaults = ({ value: any } | { typeOf: TypeOfResult })[]

const preferredDefaults: PreferredDefaults = [
    { value: undefined },
    { value: null },
    { value: false },
    { value: true },
    { typeOf: "number" },
    { typeOf: "string" },
    { typeOf: "bigint" },
    { typeOf: "object" },
    { typeOf: "symbol" },
    { typeOf: "function" }
]

export namespace UnionType {}

export class UnionNode extends Base.NonTerminal<Base.Parsing.Node[]> {
    allows(args: Base.Validation.Args) {
        const unionErrors = args.errors.split(args.ctx.path)
        for (const branch of this.children) {
            const branchErrors = unionErrors.branch(branch.toString())
            if (branch.allows({ ...args, errors: branchErrors })) {
                // If any branch of a Union does not have errors,
                // we can return right away since the whole definition is valid
                return true
            }
        }
        // If we haven't returned, all branches are invalid, so add an error
        const summaryErrorMessage = `${Base.stringifyValue(
            args.value
        )} is not assignable to any of ${this.toString()}.`
        if (args.cfg.verbose) {
            unionErrors.mergeAll(summaryErrorMessage)
        } else {
            args.errors.add(args.ctx.path, summaryErrorMessage)
        }
        return false
    }

    generate(args: Base.Create.Args) {
        const possibleValues: unknown[] = []
        const generationErrors: string[] = []
        for (const node of this.children) {
            try {
                possibleValues.push(node.generate(args))
            } catch (error) {
                if (error instanceof Base.Create.UngeneratableError) {
                    generationErrors.push(error.message)
                } else {
                    throw error
                }
            }
        }
        if (!possibleValues.length) {
            throw new Base.Create.UngeneratableError(
                this.toString(),
                "None of the definitions can be generated" +
                    (args.cfg.verbose
                        ? `:\n${generationErrors.join("\n")}`
                        : ".")
            )
        }
        for (const constraint of preferredDefaults) {
            const matches = possibleValues.filter((value) =>
                "value" in constraint
                    ? constraint.value === value
                    : constraint.typeOf === typeof value
            )
            if (matches.length) {
                return matches[0]
            }
        }
        /*
         * If we've made it to this point without returning, somehow the value wasn't in our priority list.
         * However, since we know we have least one generated value that didn't throw, just return it.
         */
        return possibleValues[0]
    }
}
