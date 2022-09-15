import { typeNode } from "./type.js"

export class functionNode extends typeNode {
    toString() {
        return "function"
    }

    allows(data: unknown) {
        return typeof data === "function"
    }

    create(): Function {
        return Function()
    }
}
