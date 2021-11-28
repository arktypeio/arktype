// Changing this file at all will break tests as it is used to test source locations
import { caller, withArgsRange, GetSourceRange } from "../reflection.js"

export const callMe = (...args: any[]) => {
    const inTheNight = () => caller()
    return inTheNight()
}

const buildMessageWithRange = withArgsRange(
    (getRange: GetSourceRange, ...input: string[]) => {
        const range = getRange()
        return { range, message: input.join(" ") }
    }
)

export const getMessageWithRange = () =>
    buildMessageWithRange(
        "testing",
        "source",
        "positions",
        "really",
        "really",
        "sucks"
    )()
