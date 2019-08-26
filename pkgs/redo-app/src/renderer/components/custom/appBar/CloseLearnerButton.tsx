import React, { FC } from "react"
import { IconButton, Icons } from "redo-components"
import { deactivateLearner } from "state"

export type CloseLearnerButtonProps = {}

export const CloseLearnerButton: FC<CloseLearnerButtonProps> = ({}) => (
    <IconButton
        Icon={Icons.back}
        style={{ color: "white" }}
        onClick={deactivateLearner}
    />
)
