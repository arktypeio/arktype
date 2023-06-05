import type { error } from "../../../../utils/errors.js"
import type { join } from "../../../../utils/lists.js"
import type { genericAstFrom } from "../../../ast/ast.js"
import type { writeUnclosedGroupMessage } from "../../reduce/shared.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { parseUntilFinalizer } from "../../string.js"
import type { writeUnexpectedCharacterMessage } from "../operator/operator.js"
import type { Scanner } from "../scanner.js"

export type parseGeneric<
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
