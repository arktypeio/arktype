import React, { FC } from "react"
import { Close } from "@material-ui/icons"
import { IconButton } from "redo-components"
import { deactivateLearner } from "state"

export type CloseLearnerButtonProps = {}

export const CloseLearnerButton: FC<CloseLearnerButtonProps> = ({}) => (
    <IconButton
        Icon={Close}
        style={{ color: "white" }}
        onClick={deactivateLearner}
    />
)
