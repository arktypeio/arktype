// Changing this file at all will break tests as it is used to test source locations
import { caller, SourcePosition, dirName } from ".."

const formatPath = { relative: dirName() }

export const callMe = (...args: any[]) => {
    const inTheNight = () => caller({ formatPath })
    return inTheNight()
}

export const callMeAnonymous = (...args: any[]) =>
    (() => caller({ formatPath }))()
