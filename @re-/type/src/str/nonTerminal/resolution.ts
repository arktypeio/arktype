import { deepMerge, ElementOf, Get, IsAny, IterateType, Join } from "@re-/tools"
import { Root } from "../../root.js"
import { getResolutionDefAndOptions, SpaceMeta } from "../../space.js"
import { Base } from "../parser/index.js"
import { Str } from "../str.js"
import { NonTerminal } from "./nonTerminal/nonTerminal.js.js"

export namespace ResolutionType {
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

    export type Infer<
        Alias extends keyof Dict,
        Dict,
        Meta
    > = Dict[Alias] extends Base.Parsing.ErrorMessage
        ? unknown
        : Root.Infer<
              Dict[Alias],
              // @ts-expect-error
              { dict: Dict; meta: Meta; seen: { [K in Alias]: true } }
          >
}

export class ResolutionNode extends NonTerminal {
    def: unknown

    constructor(public alias: string, space: SpaceMeta) {
        // If this is the first time we've seen the alias,
        // create a Node that will be used for future resolutions.
        const defAndOptions = getResolutionDefAndOptions(
            space.dictionary[alias]
        )
        const ctx = Base.Parsing.createContext(
            defAndOptions.options
                ? deepMerge(space.options, defAndOptions.options)
                : space.options,
            space
        )
        super(Root.parse(defAndOptions.def, ctx), ctx)
        this.def = defAndOptions.def
    }

    toString() {
        return this.alias
    }

    allows(args: Base.Validation.Args): boolean {
        const nextArgs = this.nextArgs(args, this.ctx.cfg.validate)
        if (typeof args.value === "object" && args.value !== null) {
            if (
                args.ctx.checkedValuesByAlias[this.alias]?.includes(args.value)
            ) {
                // If we've already seen this value, it must not have any errors or else we wouldn't be here
                return true
            }
            if (!args.ctx.checkedValuesByAlias[this.alias]) {
                nextArgs.ctx.checkedValuesByAlias[this.alias] = [args.value]
            } else {
                nextArgs.ctx.checkedValuesByAlias[this.alias].push(args.value)
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
        return this.children.allows(nextArgs)
    }

    generate(args: Base.Create.Args) {
        const nextArgs = this.nextArgs(args, this.ctx.cfg.generate)
        if (args.ctx.seen.includes(this.alias)) {
            const onRequiredCycle =
                nextArgs.cfg.onRequiredCycle ??
                nextArgs.ctx.modelCfg.onRequiredCycle
            if (onRequiredCycle) {
                return onRequiredCycle
            }
            throw new Base.Create.RequiredCycleError(this.alias, args.ctx.seen)
        }
        return this.children.generate(nextArgs)
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
                seen: [...args.ctx.seen, this.alias],
                modelCfg: { ...args.ctx.modelCfg, ...aliasCfg }
            }
        }
    }
}

// const shallowCycleError = (shallowSeen: string[]) =>
//     `${shallowSeen[0]} references a shallow cycle: ${shallowSeen.join("=>")}.`

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
> = References extends IterateType<string, infer Current, infer Remaining>
    ? Current extends keyof Dict
        ? Current extends ElementOf<Seen>
            ? [...Seen, Current]
            : IfShallowCycleTupleElse<
                  CheckResolutionForShallowCycleRecurse<
                      Get<Dict, Current>,
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
