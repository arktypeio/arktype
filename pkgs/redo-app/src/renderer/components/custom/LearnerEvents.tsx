import React, { FC } from "react"
import { List, ListItem } from "@material-ui/core"
import { LearnerEventCard } from "custom"
import { BrowserEventInput } from "redo-model"
import { useTheme } from "redo-components"

export type LearnerEventsProps = {
    events: BrowserEventInput[]
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
                    <LearnerEventCard event={{ ...e, tags: [] }} />
                </ListItem>
            ))}
        </List>
    )
}
