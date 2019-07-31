import React from "react"
import { Theme, List, ListItem, createStyles } from "@material-ui/core"
import { LearnerEventCard } from "custom"
<<<<<<< Updated upstream
import { BrowserEvent } from "redo-model"
import { component } from "blocks"
=======
import { BrowserEventInput } from "renderer/common"
>>>>>>> Stashed changes

const styles = (theme: Theme) =>
    createStyles({
        list: {
            height: "100%",
            width: "100%"
        },
        listItem: {
            padding: theme.spacing(2)
        }
    })

export type LearnerEventsProps = {
    events: BrowserEventInput[]
}

export const LearnerEvents = component({
    name: "LearnerEvents",
    defaultProps: {} as Partial<LearnerEventsProps>,
    styles
})(({ classes, events }) => (
    <List className={classes.list}>
        {events.map((e, i) => (
            <ListItem className={classes.listItem} key={i}>
                <LearnerEventCard event={e} />
            </ListItem>
        ))}
    </List>
))
