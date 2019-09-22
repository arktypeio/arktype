import React, { FC } from "react"
import { List, ListItem } from "@material-ui/core"
import { StepCard } from "./StepCard"
import { StepInput } from "@re-do/model"
import { useTheme } from "@re-do/components"

export type LearnerEventsProps = {
    events: StepInput[]
}

export const LearnerEvents: FC<LearnerEventsProps> = ({ events }) => {
    const theme = useTheme()
    return (
        <List
            style={{
                height: "100%",
                width: "100%"
            }}
        >
            {events.map((e, i) => (
                <ListItem style={{ padding: theme.spacing(2) }} key={i}>
                    <StepCard event={{ ...e }} />
                </ListItem>
            ))}
        </List>
    )
}
