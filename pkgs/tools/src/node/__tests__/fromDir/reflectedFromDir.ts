// Changing this file at all will break tests as it is used to test source locations
import { caller, fromHere } from "../.."

const formatPath = { relative: fromHere("..") }

export const callMeFromDir = (...args: any[]) => {
    const dial = () => caller({ formatPath })
    return dial()
}

export const callPipeSeperated = (...args: any[]) => {
    const pipeIt = () =>
        caller({ formatPath: { ...formatPath, seperator: "|" } })
    return pipeIt()
}
