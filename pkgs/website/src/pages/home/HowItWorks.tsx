import React, { useState } from "react"
import { Row, Text, Column, Icons } from "@re-do/components"
import { copy } from "../../constants"
import { AnimatedCheckbox } from "./AnimatedCheckbox"
import ExpansionPanel, {
    ExpansionPanelProps,
} from "@material-ui/core/ExpansionPanel"
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary"
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails"

type StepProps = ExpansionPanelProps & {
    summary: string
    details: string
}

const Step = ({ summary, details, defaultExpanded, ...rest }: StepProps) => {
    const [expanded, setExpanded] = useState(!!defaultExpanded)
    return (
        <ExpansionPanel
            key={summary}
            style={{
                background: "transparent",
                width: "100%",
                boxShadow: "unset",
            }}
            defaultExpanded={defaultExpanded}
            onChange={(_, open) => setExpanded(open)}
            {...rest}
        >
            <ExpansionPanelSummary expandIcon={<Icons.expandDown />}>
                <Row align="center">
                    <AnimatedCheckbox checked={expanded} />
                    <Text variant="h6">{summary}</Text>
                </Row>
            </ExpansionPanelSummary>
            <ExpansionPanelDetails>
                <Text>{details}</Text>
            </ExpansionPanelDetails>
        </ExpansionPanel>
    )
}

type StepsProps = {
    children: StepProps[]
}

const Steps = ({ children }: StepsProps) => (
    <>
        {children.map((stepProps, index) => (
            <Step key={index} defaultExpanded={index === 0} {...stepProps} />
        ))}
    </>
)

export const HowItWorks = () => {
    return (
        <Column align="center">
            <Text variant="h4">{copy.howItWorks.title}</Text>
            <Steps>{copy.howItWorks.steps}</Steps>
        </Column>
    )
}
