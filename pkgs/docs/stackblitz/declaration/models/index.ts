import { declare } from "@re-/model"

// Declare the models you will define
export const { define, compile } = declare("user", "group")

import { userDef } from "./user"
import { groupDef } from "./group"

// Creates your space (or tells you which definition you forgot to include)
export const space = compile({ ...userDef, ...groupDef })

type Group = typeof space.types.group

export const groupData = {
    title: "Type Enjoyers",
    members: [
        {
            name: "Devin Aldai",
            bestFriend: {
                name: "Devin Olnyt",
                grapes: []
            },
            groups: []
        }
    ]
}

// Try changing the definitions in "group.ts"/"user.ts" or the "groupData" variable above!
export const groupValidationResult = space.models.group.validate(groupData)
