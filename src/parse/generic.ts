import type { error } from "../utils/errors.js"
import { throwParseError } from "../utils/errors.js"
import type { nominal } from "../utils/generics.js"
import type { join } from "../utils/lists.js"
import type { writeUnclosedGroupMessage } from "./string/reduce/shared.js"
import type { state, StaticState } from "./string/reduce/static.js"
import { writeUnexpectedCharacterMessage } from "./string/shift/operator/operator.js"
import { Scanner } from "./string/shift/scanner.js"
import type { parseUntilFinalizer } from "./string/string.js"

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

export type ParsedArgs<asts extends unknown[], unscanned extends string> = [
    asts,
    unscanned
]

export type parseGenericArgs<
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
            ? parseGenericArgs<
                  name,
                  params,
                  nextUnscanned,
                  $,
                  nextDefs,
                  nextAsts
              >
            : finalArgState["finalizer"] extends error
            ? finalArgState
            : state.error<writeUnclosedGroupMessage<">">>
        : never
    : never

export type writeInvalidGenericParametersMessage<
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
