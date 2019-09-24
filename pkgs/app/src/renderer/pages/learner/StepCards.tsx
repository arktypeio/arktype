import React, { FC } from "react"
import { List, ListItem } from "@material-ui/core"
import { StepCard } from "./StepCard"
import { StepInput } from "@re-do/model"
import { useTheme } from "@re-do/components"

export type LearnerEventsProps = {
    steps: StepInput[]
}

export const LearnerEvents: FC<LearnerEventsProps> = ({ steps }) => {
    const theme = useTheme()
    return (
        <List
            style={{
                height: "100%",
                width: "100%"
            }}
        >
            {steps.map((e, i) => (
                <ListItem style={{ padding: theme.spacing(2) }} key={i}>
                    <StepCard event={{ ...e }} />
                </ListItem>
            ))}
        </List>
    )
}
