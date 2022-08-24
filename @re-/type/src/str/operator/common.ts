export * from "../common.js"
export * as Parser from "../parser/index.js"
import * as Parser from "../parser/index.js"

export namespace Operator {
    export type state = Parser.state<Parser.left.withRoot>
}
