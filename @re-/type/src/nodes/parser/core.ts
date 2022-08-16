import { Base } from "../base/index.js"
import {
    Bound,
    Branches,
    Group,
    Intersection,
    List,
    OptionalNode,
    Union
} from "../nonTerminal/index.js"
import { Terminal } from "../terminal/index.js"
import { Left, State } from "./state.js"
import {
    EnclosedBaseStartChar,
    enclosedBaseStartChars,
    ErrorToken,
    inTokenSet
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
        S.l.root === undefined ? base(S, ctx) : operator(S, ctx)

    type Next<S extends State.T, Dict> = S["L"]["root"] extends undefined
        ? Base<S, Dict>
        : Operator<S>

    const expressionExpectedMessage = `Expected an expression.`
    type ExpressionExpectedMessage = typeof expressionExpectedMessage

    const base = (s: State.V, ctx: Context): void => {
        const lookahead = s.r.shift()
        if (lookahead === "(") {
            Group.reduceOpen(s)
        } else if (inTokenSet(lookahead, enclosedBaseStartChars)) {
            Terminal.enclosedBase(s, lookahead)
        } else if (lookahead === " ") {
            base(s, ctx)
        } else if (lookahead === undefined) {
            throw new Error(expressionExpectedMessage)
        } else {
            Terminal.unenclosedBase(s, ctx)
        }
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
        : State.Error<ExpressionExpectedMessage>

    const operator = (s: State.WithRoot, ctx: Context): void => {
        const lookahead = s.r.shift()
        // TODO: Test perf vs if block
        switch (lookahead) {
            case undefined:
                return finalize(s, ctx)
            case "?":
                return finalize(s, ctx)
            case "[": {
                const next = s.r.shift()
                if (next !== "]") {
                    throw new Error(incompleteListTokenMessage)
                }
                return List.reduce(s, ctx)
            }
            case "|":
                return Union.reduce(s, ctx)
            case "&":
                return Intersection.reduce(s, ctx)
            case ")":
                return Group.reduceClose(s)
            case " ":
                return operator(s, ctx)
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
                : State.Error<IncompleteListTokenMessage>
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

    const incompleteListTokenMessage = `Missing expected ']'.`

    type IncompleteListTokenMessage = `Missing expected ']'.`

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

    export const unenclosedGroupMessage = "Missing )."
    type UnclosedGroupMessage = typeof unenclosedGroupMessage

    const finalize = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
        if (s.l.groups.length) {
            throw new Error(unenclosedGroupMessage)
        }
        Branches.mergeAll(s)
        Bound.finalize(s)
        applyFinalizer(s, ctx)
    }

    type Finalize<S extends State.T> = State.Finalize<
        ApplyFinalizer<ExtractValidatedRoot<S["L"]>, S["R"]>
    >

    type ExtractValidatedRoot<L extends Left.T> = L["groups"] extends []
        ? Bound.Finalize<
              Branches.MergeAll<L["branches"], L["root"]>,
              L["bounds"]
          >
        : ErrorToken<UnclosedGroupMessage>

    const applyFinalizer = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
        if (s.r.lookahead === undefined) {
            return
        }
        if (s.r.lookahead === "?") {
            s.l.root = new OptionalNode(s.l.root, ctx)
        }
    }

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
