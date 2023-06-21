import type { error } from "../../../../../dev/utils/src/errors.js"
import { throwParseError } from "../../../../../dev/utils/src/errors.js"
import type { join } from "../../../../../dev/utils/src/lists.js"
import type {
    BigintLiteral,
    NumberLiteral
} from "../../../../../dev/utils/src/numericLiterals.js"
import {
    tryParseWellFormedBigint,
    tryParseWellFormedNumber
} from "../../../../../dev/utils/src/numericLiterals.js"
import { stringify } from "../../../../../dev/utils/src/serialize.js"
import { hasArkKind } from "../../../../compile/registry.js"
import type { TypeNode } from "../../../../nodes/composite/type.js"
import { typeNode } from "../../../../nodes/composite/type.js"
import type { Scope } from "../../../../scope.js"
import type { Generic, GenericProps } from "../../../../type.js"
import { Type } from "../../../../type.js"
import type { GenericInstantiationAst } from "../../../ast/ast.js"
import type { CastTo } from "../../../definition.js"
import type { ParsedArgs } from "../../../generic.js"
import {
    parseGenericArgs,
    writeInvalidGenericArgsMessage
} from "../../../generic.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { BaseCompletions } from "../../string.js"
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
    $,
    args
> = Scanner.shiftUntilNextTerminator<
    s["unscanned"]
> extends Scanner.shiftResult<infer token, infer unscanned>
    ? token extends "keyof"
        ? state.addPrefix<s, "keyof", unscanned>
        : tryResolve<s, token, $, args> extends infer result
        ? result extends error<infer message>
            ? state.error<message>
            : result extends keyof $
            ? $[result] extends GenericProps
                ? parseGenericInstantiation<
                      token,
                      $[result],
                      state.scanTo<s, unscanned>,
                      $,
                      args
                  >
                : state.setRoot<s, result, unscanned>
            : state.setRoot<s, result, unscanned>
        : never
    : never

export const parseGenericInstantiation = (
    name: string,
    g: Generic,
    s: DynamicState
) => {
    s.scanner.shiftUntilNonWhitespace()
    const lookahead = s.scanner.shift()
    if (lookahead !== "<") {
        return s.error(writeInvalidGenericArgsMessage(name, g.parameters, []))
    }
    const parsedArgs = parseGenericArgs(
        name,
        g.parameters,
        s.scanner.unscanned,
        s.ctx
    )
    const remainingChars = parsedArgs.unscanned.length
    // set the scanner position to where the args scanner left off
    s.scanner.jumpToIndex(
        remainingChars === 0 ? s.scanner.lastIndex : -remainingChars
    )
    return g(...parsedArgs.result).root
}

export type parseGenericInstantiation<
    name extends string,
    g extends GenericProps,
    s extends StaticState,
    $,
    args
    // have to skip whitespace here since TS allows instantiations like `Partial    <T>`
> = Scanner.skipWhitespace<s["unscanned"]> extends `<${infer unscanned}`
    ? parseGenericArgs<
          name,
          g["parameters"],
          unscanned,
          $,
          args
      > extends infer result
        ? result extends ParsedArgs<infer argAsts, infer nextUnscanned>
            ? state.setRoot<
                  s,
                  GenericInstantiationAst<g, argAsts>,
                  nextUnscanned
              >
            : // propagate error
              result
        : never
    : state.error<writeInvalidGenericArgsMessage<name, g["parameters"], []>>

const unenclosedToNode = (s: DynamicState, token: string): TypeNode =>
    maybeParseReference(s, token) ??
    maybeParseUnenclosedLiteral(token) ??
    s.error(
        token === ""
            ? writeMissingOperandMessage(s)
            : writeUnresolvableMessage(token)
    )

const maybeParseReference = (
    s: DynamicState,
    token: string
): TypeNode | undefined => {
    if (s.ctx.args?.[token]) {
        return s.ctx.args[token]
    }
    const resolution = s.ctx.scope.maybeResolve(token, s.ctx)
    if (resolution instanceof Type) {
        return resolution.root
    } else if (hasArkKind(resolution, "generic")) {
        return parseGenericInstantiation(token, resolution, s)
    } else if (typeof resolution === "string") {
    } else if (resolution === undefined) {
        return
    }
    return throwParseError(`Unexpected resolution ${stringify(resolution)}`)
}

const maybeParseUnenclosedLiteral = (token: string): TypeNode | undefined => {
    const maybeNumber = tryParseWellFormedNumber(token)
    if (maybeNumber !== undefined) {
        return typeNode({ basis: ["===", maybeNumber] })
    }
    const maybeBigint = tryParseWellFormedBigint(token)
    if (maybeBigint !== undefined) {
        return typeNode({ basis: ["===", maybeBigint] })
    }
}

type tryResolve<
    s extends StaticState,
    token extends string,
    $,
    args
> = token extends keyof args
    ? token
    : token extends keyof $
    ? token
    : token extends `${infer subscope extends keyof $ &
          string}.${infer reference}`
    ? $[subscope] extends Scope
        ? reference extends keyof $[subscope]["infer"]
            ? CastTo<$[subscope]["infer"][reference]>
            : unresolvableError<s, reference, $[subscope]["infer"], [subscope]>
        : error<writeInvalidSubscopeReferenceMessage<subscope>>
    : token extends NumberLiteral
    ? token
    : token extends BigintLiteral
    ? token
    : unresolvableError<s, token, $, args>

export type writeInvalidSubscopeReferenceMessage<name extends string> =
    `'${name}' must reference a scope to be accessed using dot syntax`

export type unresolvableError<
    s extends StaticState,
    token extends string,
    $,
    args,
    subscopePath extends string[] = []
> = Extract<
    validReference<$, args, subscopePath>,
    `${token}${string}`
> extends never
    ? error<writeUnresolvableMessage<token>>
    : error<`${s["scanned"]}${join<
          [
              ...subscopePath,
              Extract<
                  validReference<$, args, subscopePath>,
                  `${token}${string}`
              >
          ],
          "."
      >}`>

type validReference<
    $,
    args,
    subscopePath extends string[]
> = subscopePath extends [] ? BaseCompletions<$, args> : keyof $

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
