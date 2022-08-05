import { ListChars } from "@re-/tools"
import { Bound } from "../index.js"
import { Lexer } from "./lexer.js"

export type ParsePrefixesAndSuffixes<Def extends string> = ParsePrefixes<
    ParseSuffixes<Initialize<Def>>
>

type ParsePrefixes<S extends PrefixState> =
    S["scanner"]["lookahead"] extends `${string}${Bound.StartChar}`
        ? From<{
              scanner: Lexer.ShiftBase<S["scanner"]["unscanned"]>
              ctx: S["ctx"] & {
                  bounds: {
                      left: S["scanner"]["lookahead"]
                  }
              }
          }>
        : S

export type PrefixState = {
    scanner: Lexer.TypeScanner
    ctx: PrefixContext
}

export type PrefixContext = {
    bounds: {
        left?: string
        right?: string
    }
    optional: boolean
}

type From<S extends PrefixState> = S

type Initialize<Def extends string> = From<{
    scanner: Lexer.ShiftSuffix<ListChars<Def>>
    ctx: {
        bounds: {}
        optional: false
    }
}>

type ParseSuffixes<S extends PrefixState> = S["scanner"]["lookahead"] extends ""
    ? From<{
          scanner: Lexer.ShiftPrefix<S["scanner"]["unscanned"]>
          ctx: S["ctx"]
      }>
    : S["scanner"]["lookahead"] extends "?"
    ? ParseSuffixes<{
          scanner: Lexer.ShiftSuffix<S["scanner"]["unscanned"]>
          ctx: {
              bounds: S["ctx"]["bounds"]
              optional: true
          }
      }>
    : From<{
          scanner: Lexer.ShiftPrefix<S["scanner"]["unscanned"]>
          ctx: {
              bounds: { right: S["scanner"]["lookahead"] }
              optional: S["ctx"]["optional"]
          }
      }>
