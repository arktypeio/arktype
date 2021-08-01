import React, { useState } from "react"
import { Row, Text, Column, Icons } from "@re-do/components"
import Accordion, { AccordionProps } from "@material-ui/core/Accordion"
import AccordionSummary from "@material-ui/core/AccordionSummary"
import AccordionDetails from "@material-ui/core/AccordionDetails"
import { AnimatedCheckbox } from "./AnimatedCheckbox.js"

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
                background: "transparent"
            }}
            elevation={0}
            onChange={(_, open) => setExpanded(open)}
            defaultExpanded={defaultExpanded ?? false}
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

export const Steps = ({ children }: StepsProps) => (
    <>
        {children.map((stepProps, index) => (
            <Step key={index} defaultExpanded={index === 0} {...stepProps} />
        ))}
    </>
)
