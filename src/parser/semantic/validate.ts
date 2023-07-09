import type {
    BigintLiteral,
    error,
    NumberLiteral,
    writeMalformedNumericLiteralMessage
} from "@arktype/utils"
import { throwInternalError, throwParseError } from "@arktype/utils"
import type { Node } from "../../nodes/kinds.js"
import type {
    ConstraintKind,
    RefinementKind
} from "../../nodes/predicate/predicate.js"
import type { BasisKind } from "../../nodes/primitive/basis.js"
import type { Comparator } from "../../nodes/primitive/bound.js"
import type { Module } from "../../scope.js"
import type { GenericProps } from "../../type.js"
import type { writeInvalidGenericArgsMessage } from "../generic.js"
import { isDateLiteral } from "../string/shift/operand/date.js"
import type { writeMissingSubmoduleAccessMessage } from "../string/shift/operand/unenclosed.js"
import { writeInvalidLimitMessage } from "../string/shift/operator/bounds.js"
import type { parseString } from "../string/string.js"
import type { validateRange } from "./bounds.js"
import { writeUnboundableMessage } from "./bounds.js"
import type { validateDivisor } from "./divisor.js"
import { writeIndivisibleMessage } from "./divisor.js"
import type {
    GenericInstantiationAst,
    InfixExpression,
    PostfixExpression
} from "./semantic.js"
import type { astToString } from "./utils.js"

export const assertAllowsConstraint = (
    basis: Node<BasisKind> | null,
    node: Node<RefinementKind>
) => {
    if (basis?.hasKind("unit")) {
        return throwInvalidConstraintError(
            node.kind,
            "a non-literal type",
            basis.toString()
        )
    }
    const domain = basis?.domain ?? "unknown"
    switch (node.kind) {
        case "divisor":
            if (domain !== "number") {
                throwParseError(writeIndivisibleMessage(domain))
            }
            return
        case "bound":
            if (domain !== "string" && domain !== "number") {
                const isDateClassBasis =
                    basis?.hasKind("class") && basis.extendsOneOf(Date)
                if (isDateClassBasis) {
                    if (!isDateLiteral(node.rule.limit)) {
                        throwParseError(
                            writeInvalidLimitMessage(
                                node.rule.comparator,
                                node.rule.limit,
                                // TODO: we don't know if this is true, validate range together
                                "right"
                            )
                        )
                    }
                    return
                }
                const hasSizedClassBasis =
                    basis?.hasKind("class") && basis.extendsOneOf(Array)
                if (!hasSizedClassBasis) {
                    throwParseError(writeUnboundableMessage(domain))
                }
            }
            if (typeof node.rule.limit !== "number") {
                throwParseError(
                    writeInvalidLimitMessage(
                        node.rule.comparator,
                        node.rule.limit,
                        // TODO: we don't know if this is true, validate range together
                        "right"
                    )
                )
            }
            return
        case "regex":
            if (domain !== "string") {
                throwInvalidConstraintError("regex", "a string", domain)
            }
            return
        case "props":
            if (domain !== "object") {
                throwInvalidConstraintError("props", "an object", domain)
            }
            return
        case "narrow":
            return
        default:
            throwInternalError(`Unexpected rule kind '${(node as Node).kind}'`)
    }
}

export const writeInvalidConstraintMessage = (
    kind: RefinementKind,
    typeMustBe: string,
    typeWas: string
) => {
    return `${kind} constraint may only be applied to ${typeMustBe} (was ${typeWas})`
}

export const throwInvalidConstraintError = (
    ...args: Parameters<typeof writeInvalidConstraintMessage>
) => throwParseError(writeInvalidConstraintMessage(...args))

export type validateAst<ast, $, args> = ast extends string
    ? validateStringAst<ast, $>
    : ast extends PostfixExpression<infer operator, infer operand>
    ? operator extends "[]"
        ? validateAst<operand, $, args>
        : never
    : ast extends InfixExpression<infer operator, infer l, infer r>
    ? operator extends "&" | "|"
        ? validateInfix<ast, $, args>
        : operator extends Comparator
        ? validateRange<l, operator, r, $, args>
        : operator extends "%"
        ? validateDivisor<l, $, args>
        : undefined
    : ast extends readonly ["keyof", infer operand]
    ? validateAst<operand, $, args>
    : ast extends GenericInstantiationAst
    ? validateGenericArgs<ast["2"], $, args>
    : error<writeUnexpectedExpressionMessage<astToString<ast>>>

type writeUnexpectedExpressionMessage<expression extends string> =
    `Unexpectedly failed to parse the expression resulting from ${expression}`

type validateGenericArgs<argAsts extends unknown[], $, args> = argAsts extends [
    infer head,
    ...infer tail
]
    ? validateAst<head, $, args> extends error<infer message>
        ? error<message>
        : validateGenericArgs<tail, $, args>
    : undefined

export const writeUnsatisfiableExpressionError = <expression extends string>(
    expression: expression
): writeUnsatisfiableExpressionError<expression> =>
    `${expression} results in an unsatisfiable type`

export type writeUnsatisfiableExpressionError<expression extends string> =
    `${expression} results in an unsatisfiable type`

type validateStringAst<def extends string, $> = def extends NumberLiteral<
    infer value
>
    ? number extends value
        ? error<writeMalformedNumericLiteralMessage<def, "number">>
        : undefined
    : def extends BigintLiteral<infer value>
    ? bigint extends value
        ? error<writeMalformedNumericLiteralMessage<def, "bigint">>
        : undefined
    : def extends keyof $
    ? // these problems would've been caught during a fullStringParse, but it's most
      // efficient to check for them here in case the string was naively parsed
      $[def] extends GenericProps
        ? error<writeInvalidGenericArgsMessage<def, $[def]["parameters"], []>>
        : $[def] extends Module
        ? error<writeMissingSubmoduleAccessMessage<def>>
        : undefined
    : undefined

export type validateString<def extends string, $, args> = parseString<
    def,
    $,
    args
> extends infer ast
    ? ast extends error<infer message>
        ? error<message>
        : validateAst<ast, $, args> extends error<infer message>
        ? error<message>
        : def
    : never

type validateInfix<ast extends InfixExpression, $, args> = validateAst<
    ast[0],
    $,
    args
> extends error<infer message>
    ? error<message>
    : validateAst<ast[2], $, args> extends error<infer message>
    ? error<message>
    : undefined
