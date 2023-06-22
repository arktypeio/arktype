// @ts-nocheck
import { format } from "prettier"
import { scope } from "./src/main.js"

const $ = scope({
    user: {
        name: "user"
    }
})

const result = $.compile()

console.log(format(result, { parser: "typescript" }))

const __$any = (__$arkRoot) => {}
const __$bigint = ($arkRoot) => {
    if (!(typeof $arkRoot === "bigint")) {
        return false
    }
}
const __$boolean = ($arkRoot) => {
    if ($arkRoot !== false && $arkRoot !== true) {
        return false
    }
}
const __$false = ($arkRoot) => {
    if (!($arkRoot === false)) {
        return false
    }
}
const __$never = (__$arkRoot) => {
    return false
}

const __$null = ($arkRoot) => {
    if (!($arkRoot === null)) {
        return false
    }
}
const __$number = ($arkRoot) => {
    if (!(typeof $arkRoot === "number")) {
        return false
    }
}
const __$object = ($arkRoot) => {
    if (
        !(
            (typeof $arkRoot === "object" && $arkRoot !== null) ||
            typeof $arkRoot === "function"
        )
    ) {
        return false
    }
}
const __$string = ($arkRoot) => {
    if (!(typeof $arkRoot === "string")) {
        return false
    }
}
const __$symbol = ($arkRoot) => {
    if (!(typeof $arkRoot === "symbol")) {
        return false
    }
}
const __$true = ($arkRoot) => {
    if (!($arkRoot === true)) {
        return false
    }
}
const __$unknown = (__$arkRoot) => {}
const __$void = ($arkRoot) => {
    if (!($arkRoot === undefined)) {
        return false
    }
}
const __$undefined = ($arkRoot) => {
    if (!($arkRoot === undefined)) {
        return false
    }
}
