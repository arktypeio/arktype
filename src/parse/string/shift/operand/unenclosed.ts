import { TypeNode } from "../../../../nodes/type.js"
import type { Generic, subaliasOf } from "../../../../scope.js"
import type { error } from "../../../../utils/errors.js"
import type { join } from "../../../../utils/lists.js"
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
import type { writeUnclosedGroupMessage } from "../../reduce/shared.js"
import type {
    AutocompletePrefix,
    state,
    StaticState
} from "../../reduce/static.js"
import type { parseUntilFinalizer } from "../../string.js"
import type { writeUnexpectedCharacterMessage } from "../operator/operator.js"
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
> extends Scanner.shiftResult<infer token, infer unscanned>
    ? token extends "keyof"
        ? state.addPrefix<s, "keyof", unscanned>
        : tryResolve<s, token, $> extends infer result
        ? result extends error<infer message>
            ? state.error<message>
            : result extends keyof $
            ? $[result] extends Generic<infer params, infer def>
                ? parseGeneric<
                      token,
                      params,
                      def,
                      state.scanTo<s, unscanned>,
                      $
                  >
                : state.setRoot<s, result, unscanned>
            : state.setRoot<s, result, unscanned>
        : never
    : never

type parseGeneric<
    name extends string,
    params extends string[],
    def,
    s extends StaticState,
    $
    // have to skip whitespace here since TS allows instantiations like `Partial    <T>`
> = Scanner.skipWhitespace<s["unscanned"]> extends `<${infer unscanned}`
    ? parseArgs<name, params, unscanned, $, [], []> extends infer result
        ? result extends ParsedArgs<infer asts, infer nextUnscanned>
            ? state.setRoot<s, genericAstFrom<params, asts, def>, nextUnscanned>
            : // propagate error
              result
        : never
    : state.error<writeInvalidGenericParametersMessage<name, params, []>>

type ParsedArgs<asts extends unknown[], unscanned extends string> = [
    asts,
    unscanned
]

type parseArgs<
    name extends string,
    params extends string[],
    unscanned extends string,
    $,
    argDefs extends string[],
    argAsts extends unknown[]
> = parseUntilFinalizer<
    state.initialize<unscanned>,
    $
> extends infer finalArgState extends StaticState
    ? {
          defs: [...argDefs, finalArgState["scanned"]]
          asts: [...argAsts, finalArgState["root"]]
          unscanned: finalArgState["unscanned"]
      } extends {
          defs: infer nextDefs extends string[]
          asts: infer nextAsts extends unknown[]
          unscanned: infer nextUnscanned extends string
      }
        ? finalArgState["finalizer"] extends ">"
            ? nextAsts["length"] extends params["length"]
                ? ParsedArgs<nextAsts, nextUnscanned>
                : state.error<
                      writeInvalidGenericParametersMessage<
                          name,
                          params,
                          nextDefs
                      >
                  >
            : finalArgState["finalizer"] extends ","
            ? parseArgs<name, params, nextUnscanned, $, nextDefs, nextAsts>
            : finalArgState["finalizer"] extends error
            ? finalArgState
            : state.error<
                  writeUnexpectedCharacterMessage<
                      finalArgState["finalizer"] & string,
                      nextAsts["length"] extends params["length"] ? ">" : ","
                  >
              >
        : state.error<writeUnclosedGroupMessage<">">>
    : never

type writeInvalidGenericParametersMessage<
    name extends string,
    params extends string[],
    argDefs extends string[]
> = `${name}<${params["length"] extends 1
    ? params[0]
    : join<
          params,
          ", "
      >}> requires exactly ${params["length"]} parameters (got ${argDefs["length"]}: ${join<
    argDefs,
    ","
>})`

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
