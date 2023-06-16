import { typeNode } from "../../../../main.js"
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
              //todoshawn maybe this can just be number
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
    if (!isValidDateInput(token)) {
        return s.error("seems like an incorrect date format")
    }
    //todoshawn - if someone puts in just a date literal what should the
    //format be as you can't compare two date literals and will have to
    //compare the string
    const d = new Date(token).toISOString()
    if (s.scanner.lookahead === "'" || s.scanner.lookahead === '"') {
        s.scanner.shift()
        s.root = typeNode({ basis: ["===", d] })
    } else {
        return s.error("seems like an incorrect date format")
    }
}

export type DateLiteral<value extends string = string> = `d${value}`
// doublebounded

export const isValidDateInput = (d: string) => d.toString() !== "InvalidDate"
