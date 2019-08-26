import React, { FC } from "react"
import { IconButton, Icons } from "@re-do/components"
import { store } from "renderer/common"

export type NewTestButtonProps = {}

export const NewTestButton: FC<NewTestButtonProps> = ({}) => {
    return (
        <IconButton
            Icon={Icons.add}
            style={{ color: "white" }}
            onClick={() =>
                store.mutate({
                    learner: { active: true }
                })
            }
        />
    )
}
