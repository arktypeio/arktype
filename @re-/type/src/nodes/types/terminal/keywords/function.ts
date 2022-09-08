import { typeNode } from "./type.js"

export class functionNode extends typeNode {
    toString() {
        return "function"
    }

    allowsValue(value: unknown) {
        return typeof value === "function"
    }

    create(): Function {
        return Function()
    }
}
