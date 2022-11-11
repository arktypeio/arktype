export const buildUnmatchedGroupCloseMessage = <unscanned extends string>(
    unscanned: unscanned
): buildUnmatchedGroupCloseMessage<unscanned> =>
    `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}`

export type buildUnmatchedGroupCloseMessage<unscanned extends string> =
    `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}`

export const unclosedGroupMessage = "Missing )"
export type unclosedGroupMessage = typeof unclosedGroupMessage

export class ParseError extends Error {}

export const throwParseError = (message: string) => {
    throw new ParseError(message)
}

export type parseError<Message extends string> = `!${Message}`
