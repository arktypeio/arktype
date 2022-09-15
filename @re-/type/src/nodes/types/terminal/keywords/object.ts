import { typeNode } from "./type.js"

export class objectNode extends typeNode {
    toString() {
        return "object"
    }

    allows(data: unknown) {
        return typeof data === "object" && data !== null
    }

    create(): object {
        return {}
    }
}
