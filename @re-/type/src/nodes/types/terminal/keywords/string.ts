import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { regexConstraint } from "../../../constraints/regex.js"
import { typeNode } from "./type.js"

export class stringNode extends typeNode implements boundableNode {
    bounds: bounds | undefined = undefined

    constructor(private regex?: regexConstraint) {
        super()
    }

    toString() {
        return this.regex?.definition ?? "string"
    }

    allowsValue(data: unknown) {
        if (typeof data === "string") {
            // this?.regex?.check(data)
            // this?.bounds?.check()
        }
        return typeof data === "string"
    }

    create(): string {
        return ""
    }
}
