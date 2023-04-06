import { type } from "../../src/main.js"

// Definitions are statically parsed and inferred as TS.
export const user = type({
    name: "string",
    device: {
        platform: "'android'|'ios'",
        "version?": "number"
    }
})

// Validators return typed data or clear, customizable errors.
export const { data, problems } = user({
    name: "Alan Turing",
    device: {
        // problems.summary: "device/platform must be 'android' or 'ios' (was 'enigma')"
        platform: "enigma"
    }
})

const z = type({
    a: "string|number"
})

const ffoo = type("string|number")

type("string|number")

// @ts-expect-error
type("string|n")
