import React from "react"
import { List, ListItem } from "@material-ui/core"
import { Step } from "@re-do/test"
import { StepCard } from "./StepCard"

export type BuilderEventsProps = {
    steps: Step[]
}

export const BuilderEvents = ({ steps }: BuilderEventsProps) => {
    return (
        <List
            style={{
                height: "100%",
                width: "100%"
            }}
        >
            {steps.map((step, i) => (
                <ListItem style={{ padding: 16 }} key={i}>
                    <StepCard step={step} />
                </ListItem>
            ))}
        </List>
    )
}
