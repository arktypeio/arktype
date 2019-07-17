import React from "react"
import { Theme } from "@material-ui/core"
import { component } from "blocks"
import { BrowserEvent } from "redo-model"
import { ContentCard } from "blocks"

const styles = (theme: Theme) => ({})

export type LearnerEventCardProps = {
    event: BrowserEvent
}

export const LearnerEventCard = component({
    name: "LearnerEventCard",
    defaultProps: {} as Partial<LearnerEventCardProps>,
    styles
})(({ event, classes }) => <ContentCard from={event as any} />)
