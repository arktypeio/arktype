// Changing this file at all will break tests as it is used to test source locations
import { caller, fromHere } from "#src"

const formatPath = { relative: fromHere("..") }

export const callMeFromDir = () => {
    const dial = () => caller({ formatPath })
    return dial()
}

export const callPipeSeperated = () => {
    const pipeIt = () =>
        caller({ formatPath: { ...formatPath, seperator: "|" } })
    return pipeIt()
}
