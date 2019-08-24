import React, { FC } from "react"
import { ArrowBack } from "@material-ui/icons"
import { IconButton } from "redo-components"
import { deactivateLearner } from "state"

export type CloseLearnerButtonProps = {}

export const CloseLearnerButton: FC<CloseLearnerButtonProps> = ({}) => (
    <IconButton
        Icon={ArrowBack}
        style={{ color: "white" }}
        onClick={deactivateLearner}
    />
)
