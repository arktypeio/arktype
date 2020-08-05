import React, { useState } from "react"
import { Row, Text, Column, Icons } from "@re-do/components"
import Accordion, { AccordionProps } from "@material-ui/core/Accordion"
import AccordionSummary from "@material-ui/core/AccordionSummary"
import AccordionDetails from "@material-ui/core/AccordionDetails"
import { AnimatedCheckbox } from "./AnimatedCheckbox"
import { steps } from "../content"

type StepProps = Partial<AccordionProps> & {
    summary: string
    details: string
}

const Step = ({ summary, details, defaultExpanded, ...rest }: StepProps) => {
    const [expanded, setExpanded] = useState(!!defaultExpanded)
    return (
        <Accordion
            key={summary}
            style={{
                background: "transparent",
                maxWidth: 461
            }}
            elevation={0}
            defaultExpanded={defaultExpanded}
            onChange={(_, open) => setExpanded(open)}
            {...rest}
        >
            <AccordionSummary expandIcon={<Icons.expandDown />}>
                <Row align="center">
                    <AnimatedCheckbox checked={expanded} />
                    <Text variant="h6">{summary}</Text>
                </Row>
            </AccordionSummary>
            <AccordionDetails>
                <Text>{details}</Text>
            </AccordionDetails>
        </Accordion>
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
        <Column align="center" style={{ paddingTop: 48 }}>
            <Text variant="h2" style={{ fontWeight: 700 }}>
                How it works
            </Text>
            <Steps>{steps}</Steps>
        </Column>
    )
}
