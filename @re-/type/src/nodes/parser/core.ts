import { Base } from "../base/index.js"
import {
    Bound,
    Branches,
    Group,
    Intersection,
    List,
    Union
} from "../nonTerminal/index.js"
import { Terminal } from "../terminal/index.js"
import { Left, State } from "./state.js"
import {
    EnclosedBaseStartChar,
    enclosedBaseStartChars,
    ErrorToken
} from "./tokens.js"

export type Context = Base.Parsing.Context

export type Scan<
    First extends string,
    Unscanned extends string
> = `${First}${Unscanned}`

export namespace Core {
    export const parse = (def: string, ctx: Context) => {
        const S = State.initialize(def)
        return loop(S, ctx)
    }

    export type Parse<Def extends string, Dict> = Loop<
        Base<State.Initialize<Def>, Dict>,
        Dict
    >

    const loop = (S: State.V, ctx: Context) => {
        while (S.r.lookahead !== undefined) {
            next(S, ctx)
        }
        return S.l.root
    }

    type Loop<S extends State.T, Dict> = S extends State.Final
        ? S["L"]["root"]
        : Loop<Next<S, Dict>, Dict>

    const next = (S: State.V, ctx: Context) =>
        S.l.root ? base(S, ctx) : operator(S, ctx)

    type Next<S extends State.T, Dict> = S["L"]["root"] extends undefined
        ? Base<S, Dict>
        : Operator<S>

    const base = (S: State.V, ctx: Context) => {
        const lookahead = S.r.shift()
        if (!lookahead) {
            throw new Error(`Whoops.`)
        }
        return lookahead === "("
            ? S
            : lookahead in enclosedBaseStartChars
            ? S
            : lookahead === " "
            ? S
            : S
    }

    type Base<S extends State.T, Dict> = S["R"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? State.From<{ L: Group.ReduceOpen<S["L"]>; R: Rest }>
            : Next extends EnclosedBaseStartChar
            ? Terminal.EnclosedBase<S, Next>
            : Next extends " "
            ? Base<State.ScanTo<S, Rest>, Dict>
            : Terminal.UnenclosedBase<S, Next, Rest, Dict>
        : State.Error<`Expected an expression.`>

    const operator = (s: State.V, ctx: Context) => {
        const lookahead = s.r.shift()
        switch (lookahead) {
            case undefined:
                return s
            case "?":
                return s
            case "[":
                return s
            case "|":
                return s
            case "&":
                return s
            case ")":
                return s
            case " ":
                return s
            default:
                if (lookahead in Bound.startChars) {
                    return s
                }
                throw new Error("Unexpected operator.")
        }
    }

    type Operator<S extends State.T> = S["R"] extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "?"
            ? Finalize<S>
            : Next extends "["
            ? Rest extends Scan<"]", infer Remaining>
                ? State.From<{ L: List.Reduce<S["L"]>; R: Remaining }>
                : State.Error<`Missing expected ']'.`>
            : Next extends "|"
            ? State.From<{ L: Union.Reduce<S["L"]>; R: Rest }>
            : Next extends "&"
            ? State.From<{ L: Intersection.Reduce<S["L"]>; R: Rest }>
            : Next extends ")"
            ? State.From<{ L: Group.ReduceClose<S["L"]>; R: Rest }>
            : Next extends Bound.Char
            ? ParseBound<S, Next, Rest>
            : Next extends " "
            ? Operator<State.ScanTo<S, Rest>>
            : State.Error<`Unexpected operator '${Next}'.`>
        : Finalize<S>

    type SingleCharBoundToken = ">" | "<"

    type ParseBound<
        S extends State.T,
        Start extends Bound.Char,
        Unscanned extends string
    > = Unscanned extends Scan<infer PossibleSecondChar, infer Rest>
        ? PossibleSecondChar extends "="
            ? State.From<{ L: Bound.Reduce<S["L"], `${Start}=`>; R: Rest }>
            : Start extends SingleCharBoundToken
            ? State.From<{ L: Bound.Reduce<S["L"], Start>; R: Unscanned }>
            : State.Error<`= is not a valid comparator. Use == instead.`>
        : State.Error<`Expected a bound condition after ${Start}.`>

    export const UNCLOSED_GROUP_MESSAGE = "Missing )."
    type UnclosedGroupMessage = typeof UNCLOSED_GROUP_MESSAGE

    type Finalize<S extends State.T> = State.Finalize<
        ApplyFinalizer<ExtractValidatedRoot<S["L"]>, S["R"]>
    >

    type ExtractValidatedRoot<L extends Left.T> = L["groups"] extends []
        ? Bound.Finalize<
              Branches.MergeAll<L["branches"], L["root"]>,
              L["bounds"]
          >
        : ErrorToken<UnclosedGroupMessage>

    type ApplyFinalizer<
        Root,
        Unscanned extends string
    > = Root extends ErrorToken<string>
        ? Root
        : Unscanned extends ""
        ? Root
        : Unscanned extends "?"
        ? [Root, "?"]
        : ErrorToken<`Suffix '?' is only valid at the end of a definition.`>
}
