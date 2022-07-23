import {
    deepMerge,
    ElementOf,
    IsAny,
    Iteration,
    Join,
    KeyValuate
} from "@re-/tools"
import { AliasIn, getResolutionDefAndOptions, SpaceMeta } from "../space.js"
import { Base } from "./base/index.js"
import { Root } from "./root.js"
import { Str } from "./str/str.js"

export namespace Resolution {
    export type Validate<
        Alias extends keyof Dict,
        Dict
    > = Dict[Alias] extends string
        ? ValidateStringResolution<Alias, Dict>
        : Root.Validate<Dict[Alias], Dict>

    export type ValidateStringResolution<
        Alias extends keyof Dict,
        Dict
    > = IfShallowCycleErrorElse<
        CheckResolutionForShallowCycle<
            Dict[Alias],
            Dict,
            [Extract<Alias, string>]
        >,
        Str.Validate<Extract<Dict[Alias], string>, Dict>
    >

    export type TypeOf<
        Alias extends AliasIn<Dict>,
        Dict
    > = Dict[Alias] extends Base.Parsing.ErrorMessage
        ? unknown
        : Root.TypeOf<Dict[Alias], Dict, { [K in Alias]: true }>

    export class Node extends Base.Link<string> {
        resolvedDef: unknown

        constructor(alias: string, space: SpaceMeta, shallowSeen: string[]) {
            if (!space.resolutions[alias]) {
                const defAndOptions = getResolutionDefAndOptions(
                    space.dictionary[alias]
                )
                const ctx = Base.Parsing.createContext(
                    defAndOptions.options
                        ? deepMerge(space.options, defAndOptions.options)
                        : space.options,
                    space
                )
                ctx.shallowSeen = shallowSeen
                // If this is the first time we've seen the alias,
                // create a Node that will be used for future resolutions of the alias.
                // Pass the neverEager flag so that we can wait to call next() until after
                // adding this node to space.resolutions.
                super(alias, ctx, true)
                this.resolvedDef = defAndOptions.def
                space.resolutions[alias] = this
                this.next()
            } else if (shallowSeen.includes(alias)) {
                throw new Base.Parsing.ParseError(
                    shallowCycleError([...shallowSeen, alias])
                )
            }
            return space.resolutions[alias]
        }

        parse() {
            if (Str.matches(this.resolvedDef)) {
                return Str.parse(this.resolvedDef, {
                    ...this.ctx,
                    cfg: {
                        ...this.ctx.cfg,
                        parse: {
                            ...this.ctx.cfg.parse,
                            // We need to parse all resolved string defs eagerly to detect shallow cycles
                            eager: true
                        }
                    },
                    shallowSeen: [...this.ctx.shallowSeen, this.def]
                })
            } else {
                // Non-string this.defs can never participate in shallow cycles, so reset shallowSeen
                return Root.parse(this.resolvedDef, {
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
    Base.Parsing.ErrorMessage<`${Seen[0]} references shallow cycle ${Join<
        Seen,
        "=>"
    >}.`>

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
    ? IterateReferencesForShallowCycle<
          Str.References<Resolution, Dict>,
          Dict,
          Seen
      >
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
            : IfShallowCycleTupleElse<
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
type IfShallowCycleTupleElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : CheckResult

type IfShallowCycleErrorElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : ShallowCycleError<CheckResult>
