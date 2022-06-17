import { TypeOfResult } from "@re-/tools"
import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Common } from "#common"

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

    export class Node extends Common.Branch<Definition, Common.Parser.Node[]> {
        parse() {
            return this.def.match(matcher)!.map((member) => {
                if (member === "||") {
                    throw new Common.Parser.UnknownTypeError("")
                }
                return Str.parse(member, this.ctx)
            })
        }

        allows(args: Common.Allows.Args) {
            const unionErrors = args.errors.split(args.ctx.path)
            for (const branch of this.next()) {
                const branchErrors = unionErrors.branch(branch.stringifyDef())
                branch.allows({ ...args, errors: branchErrors })
                if (branchErrors.count === 0) {
                    // If any branch of a Union does not have errors,
                    // we can return right away since the whole definition is valid
                    return
                }
            }
            // If we haven't returned, all branches are invalid, so add an error
            const summaryErrorMessage = `${Common.stringifyValue(
                args.value
            )} is not assignable to any of ${this.stringifyDef()}.`
            if (args.cfg.verbose) {
                unionErrors.mergeAll(summaryErrorMessage)
            } else {
                args.errors.add(args.ctx.path, summaryErrorMessage)
            }
        }

        generate(args: Common.Generate.Args) {
            const possibleValues: unknown[] = []
            const generationErrors: string[] = []
            for (const node of this.next()) {
                try {
                    possibleValues.push(node.generate(args))
                } catch (error) {
                    if (error instanceof Common.Generate.UngeneratableError) {
                        generationErrors.push(error.message)
                    } else {
                        throw error
                    }
                }
            }
            if (!possibleValues.length) {
                throw new Common.Generate.UngeneratableError(
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
