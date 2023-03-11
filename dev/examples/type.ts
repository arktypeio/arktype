import { type } from "../../src/main.ts"

// Definitions are checked as you type and inferred as TS.
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
        // "device/platform must be 'android' or 'ios' (was 'enigma')"
        platform: "enigma"
    }
})
