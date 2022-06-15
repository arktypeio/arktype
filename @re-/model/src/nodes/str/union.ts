import { TypeOfResult } from "@re-/tools"
import { ErrorTree } from "../common/kinds/base.js"
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
            return this.def
                .match(matcher)!
                .map((member) => Str.parse(member, this.ctx))
        }

        allows(args: Common.Allows.Args) {
            for (const branch of this.next()) {
                const branchErrors = args.errors.branch(
                    args.ctx.path,
                    branch.stringifyDef()
                )
                branch.allows({ ...args, errors: branchErrors })
                if (branchErrors.count === 0) {
                    // If any branch of a Union does not have errors,
                    // we can return right away since the whole definition is valid
                    args.errors.prune(args.ctx.path)
                    return
                }
            }

            let errorMessage = `${Common.stringifyValue(
                args.value
            )} is not assignable to any of ${this.stringifyDef()}.`
            if (args.cfg.verbose) {
                errorMessage += `\n${Common.stringifyErrors(errorsByBranch)}`
            }
            this.addCustomUnassignable(args, errorMessage)
        }

        generate(args: Common.GenerateArgs) {
            const possibleValues: unknown[] = []
            const generationErrors: string[] = []
            for (const node of this.next()) {
                try {
                    possibleValues.push(node.generate(args))
                } catch (error) {
                    if (error instanceof Common.UngeneratableError) {
                        generationErrors.push(error.message)
                    } else {
                        throw error
                    }
                }
            }
            if (!possibleValues.length) {
                throw new Common.UngeneratableError(
                    this.def,
                    "None of the definitions can be generated" +
                        (args.ctx.config.verbose
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
