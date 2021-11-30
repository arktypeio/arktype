// Changing this file at all will break tests as it is used to test source locations
import { caller, withCallRange, SourceRange } from ".."
import { dirName } from ".."

const relativeFile = dirName()

export const callMe = (...args: any[]) => {
    const inTheNight = () => caller({ relativeFile })
    return inTheNight()
}

const messageAndRange = (range: SourceRange, ...input: string[]) => ({
    range,
    message: input.join(" ")
})

const buildMessageWithRange = withCallRange(messageAndRange, { relativeFile })

const buildMessageWithRangeCustomProp = withCallRange(messageAndRange, {
    allProp: "get",
    allPropAsFunction: true,
    relativeFile
})

const buildMessageWithRangeAsFunc = withCallRange(messageAndRange, {
    allAsFunction: true,
    relativeFile
})

const messageAndRangePlusName =
    (range: SourceRange, ...input: string[]) =>
    (name: string) => ({
        range,
        message: input.join(" "),
        name
    })

const buildMessageWithRangeReturnedFunc = withCallRange(
    messageAndRangePlusName,
    { allAsFunction: true, relativeFile }
)

export const getAllFromDefaultProp = () =>
    buildMessageWithRange(
        "testing",
        "source",
        "positions",
        "really",
        "really",
        "sucks"
    ).all

export const getAllFromCustomProp = () =>
    buildMessageWithRangeCustomProp("i", "love", "you").get()

export const getAllAsFunction = () =>
    buildMessageWithRangeAsFunc("this", "is", "fine")()

export const getSingleProp = () =>
    buildMessageWithRange("i'm", "not", "going", "to", "access", "this").range

export const getReturnedFunction = (name: string) =>
    buildMessageWithRangeReturnedFunc("yeah", "ok", "good")(name)

export const getUnaccessed = () => buildMessageWithRange("whoops")

export const getUndefined = () =>
    // @ts-ignore
    buildMessageWithRange("this", "doesn't", "matter").neverDefined

const buildMessageWithRangeAsChainedFunc = withCallRange(messageAndRange, {
    allAsChainedFunction: true,
    relativeFile
})

export const getChainedAllFunction = () =>
    buildMessageWithRangeAsChainedFunc(
        "chain",
        "me",
        "up"
    )(({ range, message }) => {
        return { range, message }
    })
