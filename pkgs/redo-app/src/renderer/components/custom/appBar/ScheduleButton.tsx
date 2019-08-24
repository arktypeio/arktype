import React, { FC } from "react"
import { Schedule } from "@material-ui/icons"
import { IconButton } from "redo-components"

export type ScheduleButtonProps = {}

export const ScheduleButton: FC<ScheduleButtonProps> = ({}) => {
    return <IconButton Icon={Schedule} style={{ color: "white" }} />
}
