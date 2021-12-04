// Changing this file at all will break tests as it is used to test source locations
import {
    caller,
    withCallRange,
    SourceRange,
    withCallPosition,
    SourcePosition,
    dirName
} from ".."

const relative = dirName()

export const callMe = (...args: any[]) => {
    const inTheNight = () => caller({ relative })
    return inTheNight()
}

export const callMeAnonymous = (...args: any[]) =>
    (() => caller({ relative }))()

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
    withCallRange(messageAndRange, { allCallback: true })(
        "call",
        "me",
        "back",
        "please"
    )(({ range, message }) => {
        return { range, message }
    })

export const getPropFromChainedCall = () =>
    // TODO: Fix the fact that using the current ts-jest config,
    // the stack trace breaks if the prop is accessed on the next line, e.g.:
    // withCallRange(messageAndRange)("chain", "me", "up")
    //     .range
    withCallRange(messageAndRange)("chain", "me", "up").range

export const getUndefined = () =>
    // @ts-ignore
    withCallRange(messageAndRange)("this", "doesn't", "matter").neverDefined

export const getCallPosition = (message: string) =>
    withCallPosition(
        (position: SourcePosition) => ({
            ...position,
            message
        }),
        { relative }
    )()
