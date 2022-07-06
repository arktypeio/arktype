import { ElementOf, IsAny, Iteration, Join, KeyValuate } from "@re-/tools"
import { AliasIn } from "../space.js"
import { Base } from "./base/index.js"
import { Root } from "./root.js"
import { Str } from "./str/str.js"

export namespace Resolution {
    export type Validate<
        Alias extends keyof Dict,
        Dict
    > = Dict[Alias] extends string
        ? IfShallowCycleErrorElse<
              CheckResolutionForShallowCycle<
                  Dict[Alias],
                  Dict,
                  [Extract<Alias, string>]
              >,
              Str.Validate<Dict[Alias], Dict, Dict[Alias]>
          >
        : Root.Validate<Dict[Alias], Dict>

    export type Parse<Alias extends AliasIn<Dict>, Dict> = Root.Parse<
        Dict[Alias],
        Dict,
        { [K in Alias]: true }
    >

    export class Node extends Base.Link<string> {
        constructor(def: string, ctx: Base.Parsing.Context) {
            if (!ctx.space!.resolutions[def]) {
                // If this is the first time we've seen the alias, create a Node that will be used for future resolutions of the alias.
                super(def, ctx)
                this.next()
                ctx.space!.resolutions[def] = this
            }
            return ctx.space!.resolutions[def]
        }

        parse() {
            const rootDef = this.ctx.space!.dictionary[this.def]
            if (Str.matches(rootDef)) {
                /**
                 *  If the resolved this.def is a string, check if the alias completes a shallow cycle.
                 *  If not, append the alias to shallowSeen and parse resolved this.def to continue checking for shallow cycles.
                 */
                const nextShallowSeen = [...this.ctx.shallowSeen, this.def]
                if (this.ctx.shallowSeen.includes(this.def)) {
                    throw new Base.Parsing.ParseError(
                        shallowCycleError(nextShallowSeen)
                    )
                }
                return Str.parse(rootDef, {
                    ...this.ctx,
                    cfg: {
                        ...this.ctx.cfg,
                        parse: {
                            ...this.ctx.cfg.parse,
                            // We need to parse all resolved string this.defs eagerly to detect shallow cycles
                            eager: true
                        }
                    },
                    shallowSeen: nextShallowSeen
                })
            } else {
                // Non-string this.defs can never participate in shallow cycles, so reset shallowSeen
                return Root.parse(rootDef, {
                    ...this.ctx,
                    shallowSeen: []
                })
            }
        }

        allows(args: Base.Validation.Args): boolean {
            const nextArgs = this.nextArgs(args, this.ctx.cfg.validate)
            if (typeof args.value === "object" && args.value !== null) {
                if (
                    args.ctx.checkedValuesByAlias[this.def]?.includes(
                        args.value
                    )
                ) {
                    // If we've already seen this value, it must not have any errors or else we wouldn't be here
                    return true
                }
                if (!args.ctx.checkedValuesByAlias[this.def]) {
                    nextArgs.ctx.checkedValuesByAlias[this.def] = [args.value]
                } else {
                    nextArgs.ctx.checkedValuesByAlias[this.def].push(args.value)
                }
            }
            const customValidator =
                nextArgs.cfg.validator ??
                nextArgs.ctx.modelCfg.validator ??
                "default"
            if (customValidator !== "default") {
                return Base.Validation.customValidatorAllows(
                    customValidator,
                    this,
                    nextArgs
                )
            }
            return this.child.allows(nextArgs)
        }

        generate(args: Base.Create.Args) {
            const nextArgs = this.nextArgs(args, this.ctx.cfg.generate)
            if (args.ctx.seen.includes(this.def)) {
                const onRequiredCycle =
                    nextArgs.cfg.onRequiredCycle ??
                    nextArgs.ctx.modelCfg.onRequiredCycle
                if (onRequiredCycle) {
                    return onRequiredCycle
                }
                throw new Base.Create.RequiredCycleError(
                    this.def,
                    args.ctx.seen
                )
            }
            return this.child.generate(nextArgs)
        }

        collectReferences(
            args: Base.References.Args,
            collected: Base.References.Collection
        ) {
            return this.child.collectReferences(args, collected)
        }

        structureReferences(args: Base.References.Args) {
            return this.child.structureReferences(args)
        }

        private nextArgs<
            Args extends {
                ctx: Base.Traversal.Context<any>
                cfg: any
            }
        >(args: Args, aliasCfg: any): Args {
            return {
                ...args,
                ctx: {
                    ...args.ctx,
                    seen: [...args.ctx.seen, this.def],
                    modelCfg: { ...args.ctx.modelCfg, ...aliasCfg }
                }
            }
        }
    }
}

const shallowCycleError = (shallowSeen: string[]) =>
    `${shallowSeen[0]} references a shallow cycle: ${shallowSeen.join("=>")}.`

type ShallowCycleError<Seen extends string[]> =
    Base.Parsing.ParseErrorMessage<`${Seen[0]} references a shallow cycle: ${Join<
        Seen,
        "=>"
    >}.`>

type IfShallowCycleErrorElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : ShallowCycleError<CheckResult>

type CheckResolutionForShallowCycle<
    Resolution,
    Dict,
    Seen extends string[]
> = IsAny<Resolution> extends true
    ? []
    : CheckResolutionForShallowCycleRecurse<Resolution, Dict, Seen>

/** For a given resolution, check it's shallow references to other aliases for cycles */
type CheckResolutionForShallowCycleRecurse<
    Resolution,
    Dict,
    Seen extends string[]
> = Resolution extends string
    ? IterateReferencesForShallowCycle<Str.References<Resolution>, Dict, Seen>
    : []

/**  For a list of string references, if any is in Seen, return Seen plus that reference,
 *   to represent the path at which the cycle occured. Otherwise, append the reference to seen and recurse.  */
type IterateReferencesForShallowCycle<
    References,
    Dict,
    Seen extends string[]
> = References extends Iteration<string, infer Current, infer Remaining>
    ? Current extends keyof Dict
        ? Current extends ElementOf<Seen>
            ? [...Seen, Current]
            : IfShallowCycleElse<
                  CheckResolutionForShallowCycleRecurse<
                      KeyValuate<Dict, Current>,
                      Dict,
                      [...Seen, Current]
                  >,
                  IterateReferencesForShallowCycle<Remaining, Dict, Seen>
              >
        : IterateReferencesForShallowCycle<Remaining, Dict, Seen>
    : []

/** When we detect a ShallowCycle, the generic will return a string tuple representing the cycle path.
 *  Otherwise, we return an empty tuple if no tuple is detected.
 *  This generic simply returns cycle path if it is not an empty tuple, otherwise it will return Else.
 */
type IfShallowCycleElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : CheckResult
