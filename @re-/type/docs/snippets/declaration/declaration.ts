import { declare } from "../../../src/index.js"

// Declare the models you will define
export const { define, compile } = declare("user", "group")

import { groupDef } from "./group.js"
import { userDef } from "./user.js"

// Creates your space (or tells you which definition you forgot to include)
export const mySpace = compile({ ...userDef, ...groupDef })

// Mouse over "Group" to see the inferred type...
export type Group = typeof mySpace.group.infer

export const fetchGroupData = () => {
    return {
        title: "Type Enjoyers",
        members: [
            {
                name: "Devin Aldai",
                grapes: []
            }
        ]
    }
}

// Try changing the definitions in "group.ts"/"user.ts" or the data in "fetchGroupData"!
export const { errors: error } = mySpace.group.check(fetchGroupData())
