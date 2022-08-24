export * as Node from "../node/index.js"
export * as Parser from "../parser/index.js"
// TODO: Get rid of utils
export * as Utils from "../utils.js"
import * as Parser from "../parser/index.js"

export namespace Operator {
    export type state = Parser.state<Parser.left.withRoot>
}
