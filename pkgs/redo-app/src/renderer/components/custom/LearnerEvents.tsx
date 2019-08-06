import React, { FC } from "react"
import { Theme, List, ListItem } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { LearnerEventCard } from "custom"
//TODO: https://trello.com/c/QjInW5CL fix BrowserEventInput type
import { BrowserEventInput } from "renderer/common"

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
    events: BrowserEventInput[]
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
