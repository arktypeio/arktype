import { TypeOfResult } from "@re-/tools"
import { Base, createSplittableMatcher } from "./base.js"
import { Str } from "./str.js"

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

export namespace Union {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}|${Right}`

    export const matches = (def: string): def is Definition => def.includes("|")

    const matcher = createSplittableMatcher("|")

    export const getMembers = (def: Definition) => def.match(matcher)!

    export class Node extends Base.Branch<Definition> {
        parse() {
            return getMembers(this.def).map((member) => {
                if (member === "||") {
                    throw new Base.Parsing.UnknownTypeError("")
                }
                return Str.parse(member, this.ctx)
            })
        }

        allows(args: Base.Validation.Args) {
            const unionErrors = args.errors.split(args.ctx.path)
            for (const branch of this.children()) {
                const branchErrors = unionErrors.branch(branch.defToString())
                if (branch.allows({ ...args, errors: branchErrors })) {
                    // If any branch of a Union does not have errors,
                    // we can return right away since the whole definition is valid
                    return true
                }
            }
            // If we haven't returned, all branches are invalid, so add an error
            const summaryErrorMessage = `${Base.stringifyValue(
                args.value
            )} is not assignable to any of ${this.defToString()}.`
            if (args.cfg.verbose) {
                unionErrors.mergeAll(summaryErrorMessage)
            } else {
                args.errors.add(args.ctx.path, summaryErrorMessage)
            }
            return false
        }

        generate(args: Base.Generation.Args) {
            const possibleValues: unknown[] = []
            const generationErrors: string[] = []
            for (const node of this.children()) {
                try {
                    possibleValues.push(node.generate(args))
                } catch (error) {
                    if (error instanceof Base.Generation.UngeneratableError) {
                        generationErrors.push(error.message)
                    } else {
                        throw error
                    }
                }
            }
            if (!possibleValues.length) {
                throw new Base.Generation.UngeneratableError(
                    this.def,
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
}
