import type { error } from "../../dev/utils/src/errors.js"
import { throwParseError } from "../../dev/utils/src/errors.js"
import type { nominal } from "../../dev/utils/src/generics.js"
import type { join } from "../../dev/utils/src/lists.js"
import type { TypeNode } from "../main.js"
import type { ParseContext } from "../scope.js"
import { DynamicState } from "./string/reduce/dynamic.js"
import { writeUnclosedGroupMessage } from "./string/reduce/shared.js"
import type { state, StaticState } from "./string/reduce/static.js"
import { writeUnexpectedCharacterMessage } from "./string/shift/operator/operator.js"
import { Scanner } from "./string/shift/scanner.js"
import { parseUntilFinalizer } from "./string/string.js"

export type GenericDeclaration<
    name extends string = string,
    params extends string = string
> = `${name}<${params}>`

// we put the error in a tuple so that parseGenericParams always returns a string[]
export type GenericParamsParseError<message extends string = string> = [
    nominal<message, "InvalidGenericParameters">
]

export const parseGenericParams = (def: string) =>
    parseGenericParamsRecurse(new Scanner(def))

export type parseGenericParams<def extends string> = parseParamsRecurse<
    def,
    "",
    []
> extends infer result extends string[]
    ? "" extends result[number]
        ? GenericParamsParseError<emptyGenericParameterMessage>
        : result
    : never

export const emptyGenericParameterMessage = `An empty string is not a valid generic parameter name`

export type emptyGenericParameterMessage = typeof emptyGenericParameterMessage

const parseGenericParamsRecurse = (scanner: Scanner): string[] => {
    const param = scanner.shiftUntilNextTerminator()
    if (param === "") {
        throwParseError(emptyGenericParameterMessage)
    }
    scanner.shiftUntilNonWhitespace()
    const nextNonWhitespace = scanner.shift()
    return nextNonWhitespace === ""
        ? [param]
        : nextNonWhitespace === ","
        ? [param, ...parseGenericParamsRecurse(scanner)]
        : throwParseError(
              writeUnexpectedCharacterMessage(nextNonWhitespace, ",")
          )
}

type parseParamsRecurse<
    unscanned extends string,
    param extends string,
    result extends string[]
> = unscanned extends `${infer lookahead}${infer nextUnscanned}`
    ? lookahead extends ","
        ? parseParamsRecurse<nextUnscanned, "", [...result, param]>
        : lookahead extends Scanner.WhiteSpaceToken
        ? param extends ""
            ? // if the next char is whitespace and we aren't in the middle of a param, skip to the next one
              parseParamsRecurse<
                  Scanner.skipWhitespace<nextUnscanned>,
                  "",
                  result
              >
            : Scanner.skipWhitespace<nextUnscanned> extends `${infer nextNonWhitespace}${infer rest}`
            ? nextNonWhitespace extends ","
                ? parseParamsRecurse<rest, "", [...result, param]>
                : GenericParamsParseError<
                      writeUnexpectedCharacterMessage<nextNonWhitespace, ",">
                  >
            : // params end with a single whitespace character, add the current token
              [...result, param]
        : parseParamsRecurse<nextUnscanned, `${param}${lookahead}`, result>
    : param extends ""
    ? result
    : [...result, param]

export type ParsedArgs<
    result extends unknown[] = unknown[],
    unscanned extends string = string
> = {
    result: result
    unscanned: unscanned
}

export const parseGenericArgs = (
    name: string,
    params: string[],
    unscanned: string,
    ctx: ParseContext
) => parseGenericArgsRecurse(name, params, unscanned, ctx, [], [])

export type parseGenericArgs<
    name extends string,
    params extends string[],
    unscanned extends string,
    $,
    args
> = parseGenericArgsRecurse<name, params, unscanned, $, args, [], []>

const parseGenericArgsRecurse = (
    name: string,
    params: string[],
    unscanned: string,
    ctx: ParseContext,
    argDefs: string[],
    argNodes: TypeNode[]
): ParsedArgs<TypeNode[]> => {
    const s = parseUntilFinalizer(new DynamicState(unscanned, ctx))
    // remove the finalizing token from the argDef
    argDefs.push(s.scanner.scanned.slice(0, -1))
    argNodes.push(s.root)
    const nextUnscanned = s.scanner.unscanned
    if (s.finalizer === ">") {
        if (argNodes.length === params.length) {
            return {
                result: argNodes,
                unscanned: nextUnscanned
            }
        } else {
            return s.error(
                writeInvalidGenericArgsMessage(name, params, argDefs)
            )
        }
    } else if (s.finalizer === ",") {
        return parseGenericArgsRecurse(
            name,
            params,
            nextUnscanned,
            ctx,
            argDefs,
            argNodes
        )
    }
    return s.error(writeUnclosedGroupMessage(">"))
}

type parseGenericArgsRecurse<
    name extends string,
    params extends string[],
    unscanned extends string,
    $,
    args,
    argDefs extends string[],
    argAsts extends unknown[]
> = parseUntilFinalizer<
    state.initialize<unscanned>,
    $,
    args
> extends infer finalArgState extends StaticState
    ? {
          defs: [
              ...argDefs,
              finalArgState["scanned"] extends `${infer def}${"," | ">"}`
                  ? def
                  : finalArgState["scanned"]
          ]
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
                      writeInvalidGenericArgsMessage<name, params, nextDefs>
                  >
            : finalArgState["finalizer"] extends ","
            ? parseGenericArgsRecurse<
                  name,
                  params,
                  nextUnscanned,
                  $,
                  args,
                  nextDefs,
                  nextAsts
              >
            : finalArgState["finalizer"] extends error
            ? finalArgState
            : state.error<writeUnclosedGroupMessage<">">>
        : never
    : never

export const writeInvalidGenericArgsMessage = <
    name extends string,
    params extends string[],
    argDefs extends string[]
>(
    name: name,
    params: params,
    argDefs: argDefs
) =>
    `${name}${params.join(", ")} requires exactly ${params.length} args (got ${
        argDefs.length
    }: ${argDefs.join(", ")})`

export type writeInvalidGenericArgsMessage<
    name extends string,
    params extends string[],
    argDefs extends string[]
> = `${name}<${join<
    params,
    ", "
>}> requires exactly ${params["length"]} args (got ${argDefs["length"]}: ${join<
    argDefs,
    ","
>})`
