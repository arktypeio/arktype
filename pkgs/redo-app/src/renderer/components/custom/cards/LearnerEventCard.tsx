import React from "react"
<<<<<<< Updated upstream
import { Theme } from "@material-ui/core"
import { component } from "blocks"
import { BrowserEvent } from "redo-model"
import { ContentCard } from "blocks"

const styles = (theme: Theme) => ({})
=======
import { BrowserEventInput } from "renderer/common"
import { ContentCard } from "redo-components"
>>>>>>> Stashed changes

export type LearnerEventCardProps = {
    event: BrowserEventInput
}

export const LearnerEventCard = component({
    name: "LearnerEventCard",
    defaultProps: {} as Partial<LearnerEventCardProps>,
    styles
})(({ event, classes }) => <ContentCard from={event as any} />)
