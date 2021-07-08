import React from "react"
import {
    Card,
    TextInput,
    Text,
    CardProps,
    Column,
    Icons
} from "@re-do/components"
import { Fab } from "@material-ui/core"
import { store } from "renderer/common"
import { UnsavedStep } from "common"
import { Element } from "@re-do/model"

export type StepCardProps = {
    step: UnsavedStep
    cardProps: CardProps
}

export const StepCard = ({ step, cardProps }: StepCardProps) => {
    return (
        <Card {...cardProps}>
            <Column style={{ height: 0 }}>
                <Fab
                    style={{
                        height: 24,
                        width: 24,
                        minHeight: 24,
                        alignSelf: "flex-end"
                    }}
                    color="primary"
                    onClick={() =>
                        store.update({
                            builder: {
                                steps: (_) =>
                                    _.filter(
                                        (existingStep) =>
                                            step.id !== existingStep.id
                                    )
                            }
                        })
                    }
                >
                    <Icons.close style={{ fontSize: 16 }} />
                </Fab>
            </Column>
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
                        defaultValue={
                            k === "element" ? (v as Element).selector : v
                        }
                        onChange={(e) =>
                            store.update({
                                builder: {
                                    steps: (_) =>
                                        _.map((existingStep) =>
                                            step.id === existingStep.id
                                                ? {
                                                      ...step,
                                                      [k]:
                                                          k === "element"
                                                              ? {
                                                                    selector:
                                                                        e.target
                                                                            .value
                                                                }
                                                              : e.target.value
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
