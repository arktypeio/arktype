// @ts-nocheck
import { format } from "prettier"
import { scope } from "./src/main.js"

const $ = scope({
    user: {
        name: "string"
    }
})

const result = $.compile()

console.log(format(result, { parser: "typescript" }))

const $any = ($arkRoot) => {}
const $bigint = ($arkRoot) => {
    if (!(typeof $arkRoot === "bigint")) {
        return false
    }
}
const $boolean = ($arkRoot) => {
    if ($arkRoot !== false && $arkRoot !== true) {
        return false
    }
}
const $false = ($arkRoot) => {
    if (!($arkRoot === false)) {
        return false
    }
}
const $never = ($arkRoot) => {
    return false
}

const $null = ($arkRoot) => {
    if (!($arkRoot === null)) {
        return false
    }
}
const $number = ($arkRoot) => {
    if (!(typeof $arkRoot === "number")) {
        return false
    }
}
const $object = ($arkRoot) => {
    if (
        !(
            (typeof $arkRoot === "object" && $arkRoot !== null) ||
            typeof $arkRoot === "function"
        )
    ) {
        return false
    }
}
const $string = ($arkRoot) => {
    if (!(typeof $arkRoot === "string")) {
        return false
    }
}
const $symbol = ($arkRoot) => {
    if (!(typeof $arkRoot === "symbol")) {
        return false
    }
}
const $true = ($arkRoot) => {
    if (!($arkRoot === true)) {
        return false
    }
}
const $unknown = ($arkRoot) => {}
const $void = ($arkRoot) => {
    if (!($arkRoot === undefined)) {
        return false
    }
}
const $undefined = ($arkRoot) => {
    if (!($arkRoot === undefined)) {
        return false
    }
}
