import type { Keyword } from "../index.js"

export type IsResolvableName<Def, Dict> = Def extends Keyword.Definition
    ? true
    : Def extends keyof Dict
    ? true
    : false

export type ParseError<Message extends string> = `!${Message}`
