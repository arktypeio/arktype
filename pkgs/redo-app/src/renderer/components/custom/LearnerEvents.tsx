import React, { FC } from "react"
import { Theme, List, ListItem } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { LearnerEventCard } from "custom"
import { BrowserEvent } from "redo-model"

const stylize = makeStyles((theme: Theme) => ({
    list: {
        height: "100%",
        width: "100%"
    },
    listItem: {
        padding: theme.spacing(2)
    }
}))

export type LearnerEventsProps = {
    events: BrowserEvent[]
}

export const LearnerEvents: FC<LearnerEventsProps> = ({ events }) => {
    const { list, listItem } = stylize()
    return (
        <List className={list}>
            {events.map((e, i) => (
                <ListItem className={listItem} key={i}>
                    <LearnerEventCard event={e} />
                </ListItem>
            ))}
        </List>
    )
}
