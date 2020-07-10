import React, { useState } from "react"
import { Row, Text, Column, Icons } from "@re-do/components"
import { copy } from "../../constants"
import { AnimatedCheckbox } from "./AnimatedCheckbox"
import Accordion, { AccordionProps } from "@material-ui/core/Accordion"
import AccordionSummary from "@material-ui/core/AccordionSummary"
import AccordionDetails from "@material-ui/core/AccordionDetails"

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
                width: "100%",
                boxShadow: "unset"
            }}
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
        <Column align="center">
            <Text variant="h4">{copy.howItWorks.title}</Text>
            <Steps>{copy.howItWorks.steps}</Steps>
        </Column>
    )
}
