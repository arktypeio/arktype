import { typeNode } from "../../../../main.js"
import { throwParseError } from "../../../../utils/errors.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"
import {
    type EnclosingChar,
    untilLookaheadIsClosing,
    writeUnterminatedEnclosedMessage
} from "./enclosed.js"

export type parseDate<
    s extends StaticState,
    enclosing extends EnclosingChar,
    unscanned extends string
> = Scanner.shiftUntil<unscanned, enclosing> extends Scanner.shiftResult<
    infer scanned,
    infer nextUnscanned
>
    ? nextUnscanned extends ""
        ? state.error<writeUnterminatedEnclosedMessage<scanned, enclosing>>
        : state.setRoot<
              s,
              `d${enclosing}${scanned}${enclosing}`,
              nextUnscanned extends Scanner.shift<string, infer unscanned>
                  ? unscanned
                  : ""
          >
    : never

export const parseDate = (s: DynamicState, enclosing: EnclosingChar) => {
    const token = s.scanner.shiftUntil(untilLookaheadIsClosing[enclosing])
    if (s.scanner.lookahead === "") {
        return s.error(writeUnterminatedEnclosedMessage(token, enclosing))
    }
    const d = getDateFromInputOrThrow(token)

    if (s.scanner.lookahead === "'" || s.scanner.lookahead === '"') {
        s.scanner.shift()
        s.root = typeNode({ basis: ["===", d] })
    }
}

export type DateLiteral<value extends string = string> = `d${value}`

export const isValidDateInput = (d: Date) => d.toString() !== "Invalid Date"

export const extractDate = (s: string) => s.slice(2, -1)

export const getDateFromInputOrThrow = (s: string) => {
    const extractedDate = extractDate(s)
    const date = extractedDate === "" ? new Date() : new Date(extractedDate)
    if (isValidDateInput(date)) {
        return date
    }
    return throwParseError("Date string was not able to be parsed.")
}
