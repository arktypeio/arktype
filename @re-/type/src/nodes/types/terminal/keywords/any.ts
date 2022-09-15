import { typeNode } from "./type.js"

export class anyNode extends typeNode {
    toString() {
        return "any"
    }

    allows() {
        return true
    }

    create(): any {
        return undefined
    }
}
