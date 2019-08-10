import React, { FC, useState } from "react"
import { Row, Text, Column } from "redo-components"
import { openDetails, interactDetails, saveDetails } from "./Copy"
import ExpandMore from "@material-ui/icons/ExpandMore"
import { AnimatedCheckbox } from "./AnimatedCheckbox"
import ExpansionPanel, {
    ExpansionPanelProps
} from "@material-ui/core/ExpansionPanel"
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary"
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails"

type StepProps = ExpansionPanelProps & {
    summary: string
    children: string
}

const Step: FC<StepProps> = ({
    summary,
    children,
    defaultExpanded = false,
    ...rest
}) => {
    const [checked, setChecked] = useState(defaultExpanded)
    return (
        <ExpansionPanel
            key={summary}
            defaultExpanded={defaultExpanded}
            style={{
                background: "transparent",
                width: "100%",
                boxShadow: "unset"
            }}
            onChange={(_, open) => setChecked(open)}
        >
            <ExpansionPanelSummary expandIcon={<ExpandMore />} {...rest}>
                <Row align="center">
                    <AnimatedCheckbox checked={checked} />
                    <Text variant="h6">{summary}</Text>
                </Row>
            </ExpansionPanelSummary>
            <ExpansionPanelDetails>
                <Text>{children}</Text>
            </ExpansionPanelDetails>
        </ExpansionPanel>
    )
}

export const HowItWorks: FC = () => {
    return (
        <Column>
            <Step summary="Open the Redo desktop app" defaultExpanded={true}>
                {openDetails}
            </Step>
            <Step summary="Interact with your website">{interactDetails}</Step>
            <Step summary="Save your automated test">{saveDetails}</Step>
        </Column>
    )
}
