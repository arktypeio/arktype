import { typeNode } from "./type.js"

export class anyNode extends typeNode {
    toString() {
        return "any"
    }

    allowsValue() {
        return true
    }

    create(): any {
        return undefined
    }
}
