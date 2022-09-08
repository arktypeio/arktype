import { boundsConstraint } from "../../../operator/bound/bound.js"
import { boundableNode, Node, terminalNode } from "./common.js"

export class NumberKeyword extends BaseNumberKeyword {
    allowsNumber() {
        return true
    }
}

export class IntegerKeyword extends BaseNumberKeyword {
    allowsNumber(value: number) {
        return Number.isInteger(value)
    }
}

export const numberKeywordsToNodes = {
    number: new NumberKeyword("number"),
    integer: new IntegerKeyword("integer")
}
