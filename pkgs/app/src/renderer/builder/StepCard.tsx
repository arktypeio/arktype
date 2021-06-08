import React from "react"
import { Card, TextInput, Text, CardProps } from "@re-do/components"
import { store } from "renderer/common"
import { UnsavedStep } from "common"

export type StepCardProps = {
    step: UnsavedStep
    cardProps: CardProps
}

export const StepCard = ({ step, cardProps }: StepCardProps) => {
    return (
        <Card {...cardProps}>
            {Object.entries(step).map(([k, v]) => {
                if (k === "id") {
                    return null
                } else if (k === "kind") {
                    return <Text>{v}</Text>
                }
                return (
                    <TextInput
                        key={k}
                        label={k}
                        defaultValue={v}
                        onChange={(e) =>
                            store.update({
                                builder: {
                                    steps: (_) =>
                                        _.map((existingStep) =>
                                            step.id === existingStep.id
                                                ? {
                                                      ...step,
                                                      [k]: e.target.value
                                                  }
                                                : existingStep
                                        )
                                }
                            })
                        }
                    />
                )
            })}
        </Card>
    )
}
