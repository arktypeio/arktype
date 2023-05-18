import { TypeNode } from "../../../../nodes/type.js"
import type { generic, subaliasOf } from "../../../../scope.js"
import type { error } from "../../../../utils/errors.js"
import type { join, split } from "../../../../utils/lists.js"
import type {
    BigintLiteral,
    NumberLiteral
} from "../../../../utils/numericLiterals.js"
import {
    tryParseWellFormedBigint,
    tryParseWellFormedNumber
} from "../../../../utils/numericLiterals.js"
import type { genericAstFrom } from "../../../ast/ast.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import type {
    AutocompletePrefix,
    state,
    StaticState
} from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"

export const parseUnenclosed = (s: DynamicState) => {
    const token = s.scanner.shiftUntilNextTerminator()
    if (token === "keyof") {
        s.addPrefix("keyof")
    } else {
        s.root = unenclosedToNode(s, token)
    }
}

export type parseUnenclosed<
    s extends StaticState,
    $
> = Scanner.shiftUntilNextTerminator<
    s["unscanned"]
    // TODO: next unscanned here
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? scanned extends "keyof"
        ? state.addPrefix<s, "keyof", nextUnscanned>
        : tryResolve<s, scanned, $> extends infer result
        ? result extends error<infer message>
            ? error<message>
            : $ extends { [_ in scanned]: generic<infer params, infer def> }
            ? parseGeneric<scanned, params, def, state.scanTo<s, nextUnscanned>>
            : state.setRoot<s, result, nextUnscanned>
        : never
    : never

// TODO: maybe configure state to look for a different finalizer
type parseGeneric<
    name extends string,
    params extends string[],
    def,
    s extends StaticState
> = Scanner.shiftUntil<s["unscanned"], ">"> extends Scanner.shiftResult<
    infer scanned,
    `>${infer nextUnscanned}`
>
    ? scanned extends `<${infer args}`
        ? state.setRoot<
              s,
              genericAstFrom<params, split<args, ",">, def>,
              nextUnscanned
          >
        : error<`${name} requires ${params["length"] extends 1
              ? `parameter ${params[0]}`
              : `parameters ${join<params>}`}`>
    : error<`${name} requires ${params["length"] extends 1
          ? `parameter ${params[0]}`
          : `parameters ${join<params>}`}`>

// type parseArgs<
//     name extends string,
//     params extends string[],
//     def,
//     s extends StaticState,
//     $,
//     args extends unknown[] = []
// > = args["length"] extends params["length"]
//     ? state.setRoot<s, genericAstFrom<params, args, def>, s["unscanned"]>
//     : parseArg<state.initialize<s["unscanned"]>, $> extends infer result
//     ? result extends StaticState
//         ? result["unscanned"] extends Scanner.shift<
//               infer lookahead,
//               infer unscanned
//           >
//             ? lookahead extends ","
//                 ? parseArgs<
//                       name,
//                       params,
//                       def,
//                       state.scanTo<s, unscanned>,
//                       $,
//                       [...args, {}]
//                   >
//                 : []
//             : {}
//         : // propagate error
//           result
//     : never

// type parseArg<s extends StaticState, $> = next<s, $> extends infer result
//     ? result extends StaticState
//         ? // Store the shifted root in args,  then parse the next operand if needed, overwriting it
//           Scanner.skipWhitespace<
//               result["unscanned"]
//           > extends `${infer lookahead}${infer nextUnscanned}`
//             ? lookahead extends "," | ">"
//                 ? state.finalize<result> extends infer finalizeResult extends StaticState
//                     ? // if it finalizes successfully, replace {done} with actual unscanned
//                       state.scanTo<finalizeResult, nextUnscanned>
//                     : // propagate error
//                       state.finalize<result>
//                 : parseArg<result, $>
//             : error<writeUnterminatedEnclosedMessage<s["unscanned"], ">">>
//         : // if it's an error, propagate it
//           result
//     : never

// TODO: configs attached to type?
const unenclosedToNode = (s: DynamicState, token: string): TypeNode =>
    s.ctx.scope.maybeResolve(token)?.root ??
    maybeParseUnenclosedLiteral(token) ??
    s.error(
        token === ""
            ? writeMissingOperandMessage(s)
            : writeUnresolvableMessage(token)
    )

const maybeParseUnenclosedLiteral = (token: string): TypeNode | undefined => {
    const maybeNumber = tryParseWellFormedNumber(token)
    if (maybeNumber !== undefined) {
        return TypeNode.from({ basis: ["===", maybeNumber] })
    }
    const maybeBigint = tryParseWellFormedBigint(token)
    if (maybeBigint !== undefined) {
        return TypeNode.from({ basis: ["===", maybeBigint] })
    }
}

// TODO: initially parse scope into types/subscopes/generics

// TODO: These checks seem to break cyclic thunk inference
// $[token] extends generic<infer params>
// ?
// : token
type tryResolve<
    s extends StaticState,
    token extends string,
    $
> = token extends keyof $
    ? token
    : token extends subaliasOf<$>
    ? token
    : token extends NumberLiteral
    ? token
    : token extends BigintLiteral
    ? token
    : unresolvableError<s, token, $>

export type unresolvableError<
    s extends StaticState,
    token extends string,
    $
> = Extract<keyof $ | AutocompletePrefix, `${token}${string}`> extends never
    ? error<writeUnresolvableMessage<token>>
    : error<`${s["scanned"]}${Extract<
          keyof $ | AutocompletePrefix,
          `${token}${string}`
      >}`>

export const writeUnresolvableMessage = <token extends string>(
    token: token
): writeUnresolvableMessage<token> => `'${token}' is unresolvable`

type writeUnresolvableMessage<token extends string> =
    `'${token}' is unresolvable`

export const writeMissingOperandMessage = <s extends DynamicState>(s: s) => {
    const operator = s.previousOperator()
    return operator
        ? writeMissingRightOperandMessage(operator, s.scanner.unscanned)
        : writeExpressionExpectedMessage(s.scanner.unscanned)
}

export type writeMissingOperandMessage<
    s extends StaticState,
    operator extends string | undefined = state.previousOperator<s>
> = operator extends string
    ? writeMissingRightOperandMessage<operator, s["unscanned"]>
    : writeExpressionExpectedMessage<s["unscanned"]>

export type writeMissingRightOperandMessage<
    token extends string,
    unscanned extends string = ""
> = `Token '${token}' requires a right operand${unscanned extends ""
    ? ""
    : ` before '${unscanned}'`}`

export const writeMissingRightOperandMessage = <
    token extends string,
    unscanned extends string
>(
    token: token,
    unscanned = "" as unscanned
): writeMissingRightOperandMessage<token, unscanned> =>
    `Token '${token}' requires a right operand${
        unscanned ? (` before '${unscanned}'` as any) : ""
    }`

export const writeExpressionExpectedMessage = <unscanned extends string>(
    unscanned: unscanned
) => `Expected an expression${unscanned ? ` before '${unscanned}'` : ""}`

export type writeExpressionExpectedMessage<unscanned extends string> =
    `Expected an expression${unscanned extends ""
        ? ""
        : ` before '${unscanned}'`}`
