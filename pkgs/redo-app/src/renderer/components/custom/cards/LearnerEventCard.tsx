import React from "react"
import { Theme } from "@material-ui/core"
import { component } from "blocks"

import { BrowserEventInput } from "renderer/common"
import { ContentCard } from "redo-components"

const styles = (theme: Theme) => ({})

export type LearnerEventCardProps = {
    event: BrowserEventInput
}

export const LearnerEventCard = ({ event }: LearnerEventCardProps) => (
    <ContentCard from={event as any} />
)
