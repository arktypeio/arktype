import { typeNode } from "../../../../main.js"
import { writeUnboundableMessage } from "../../../ast/bound.js"
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

//todoshawn this is probably wrong
export const parseDate = (s: DynamicState, enclosing: EnclosingChar) => {
    const token = s.scanner.shiftUntil(untilLookaheadIsClosing[enclosing])
    if (s.scanner.lookahead === "") {
        return s.error(writeUnterminatedEnclosedMessage(token, enclosing))
    }
    if (s.scanner.lookahead === "'" || s.scanner.lookahead === '"') {
        s.scanner.shift()
        s.root = typeNode({ basis: ["===", token] })
    } else {
        return s.error("seems like an incorrect date format")
    }
}

export type DateLiteral<value extends string = string> = `d${value}`
