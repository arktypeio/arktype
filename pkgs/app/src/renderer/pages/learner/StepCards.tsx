import React from "react"
import { List, ListItem } from "@material-ui/core"
import { StepCreateWithoutTestsInput as StepInput } from "@re-do/model"
import { StepCard } from "./StepCard"
import { useTheme } from "@re-do/components"

export type LearnerEventsProps = {
    steps: StepInput[]
}

export const LearnerEvents = ({ steps }: LearnerEventsProps) => {
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
