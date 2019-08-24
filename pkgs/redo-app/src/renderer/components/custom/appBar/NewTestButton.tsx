import React, { FC } from "react"
import { Add } from "@material-ui/icons"
import { IconButton } from "redo-components"
import { store } from "renderer/common"

export type NewTestButtonProps = {}

export const NewTestButton: FC<NewTestButtonProps> = ({}) => {
    return (
        <IconButton
            Icon={Add}
            style={{ color: "white" }}
            onClick={() =>
                store.mutate({
                    learner: { active: true }
                })
            }
        />
    )
}
