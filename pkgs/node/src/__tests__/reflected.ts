// Changing this file at all will break tests as it is used to test source locations
import { caller, withCallRange, SourceRange } from ".."
import { dirName } from ".."

const relative = dirName()

export const callMe = (...args: any[]) => {
    const inTheNight = () => caller({ relative })
    return inTheNight()
}

const messageAndRange = (range: SourceRange, ...input: string[]) => ({
    range,
    message: input.join(" ")
})

const messageAndRangeThenName =
    (range: SourceRange, ...input: string[]) =>
    (name: string) => ({
        range,
        message: input.join(" "),
        name
    })

export const getAllUsingThunk = () =>
    withCallRange(messageAndRange)(
        "testing",
        "source",
        "positions",
        "really",
        "really",
        "sucks"
    )()

export const getAllUsingProp = () =>
    withCallRange(messageAndRange, {
        allProp: {
            name: "all"
        },
        relative
    })("eat", "more", "borscht").all

export const getAllUsingPropThunk = () =>
    withCallRange(messageAndRange, {
        allProp: {
            name: "get",
            asThunk: true
        },
        relative
    })("i", "love", "you").get()

export const getSingleProp = () =>
    withCallRange(messageAndRange)(
        "i'm",
        "not",
        "going",
        "to",
        "access",
        "this"
    ).range

export const getForwardedReturn = (name: string) =>
    withCallRange(messageAndRangeThenName)("yeah", "ok", "good")(name)

export const getAllUsingCallback = () =>
    withCallRange(messageAndRange, { allCallback: true })("chain", "me", "up")(
        ({ range, message }) => {
            return { range, message }
        }
    )

export const getUndefined = () =>
    // @ts-ignore
    withCallRange(messageAndRange)("this", "doesn't", "matter").neverDefined
