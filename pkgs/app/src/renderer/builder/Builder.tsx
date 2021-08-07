import React, { useState } from "react"
import {
    Column,
    TextInput,
    FloatBar,
    Icons,
    Button,
    ChipInput,
    Text,
    LoadingAnimation
} from "@re-do/components"
import { Tag } from "@re-do/model"
import { StepCard } from "./StepCard.js"
import { store } from "renderer/common"

const initialState = {
    name: "",
    tags: [] as Tag[]
}

export const Builder = () => {
    const [state, setState] = useState(initialState)
    const { name, tags } = state
    // @ts-ignore
    const { active, steps, installingBrowser } = store.useGet("builder")
    if (!active && (name || tags.length)) {
        setState(initialState)
    }
    return (
        <Column full>
            <FloatBar height={120} align="center">
                <Column align="center">
                    <TextInput
                        value={name}
                        placeholder="Test Name"
                        colorTemplate="light"
                        kind="underlined"
                        onChange={(e) =>
                            setState({ ...state, name: e.target.value })
                        }
                    />
                    <ChipInput
                        label="Tags"
                        // TODO: Add existing tags
                        possibleSuggestions={[]}
                        onChange={(tagValues) =>
                            setState({
                                ...state,
                                tags: tagValues.map((_) => ({ value: _ }))
                            })
                        }
                    />
                </Column>
            </FloatBar>
            {installingBrowser ? (
                <Column full justify="center" align="center">
                    <Text>Installing {installingBrowser}...</Text>
                    <LoadingAnimation />
                </Column>
            ) : (
                <div style={{ paddingBottom: 45 }}>
                    {steps.map((step, i) => (
                        <StepCard
                            step={step}
                            cardProps={{ style: { margin: 16 } }}
                            key={i}
                        />
                    ))}
                </div>
            )}
            <FloatBar kind="bottom" justify="space-around">
                <Button
                    Icon={Icons.close}
                    style={{ color: "white" }}
                    onClick={() => store.update({ main: { closeBuilder: [] } })}
                />
                <Button
                    Icon={Icons.save}
                    style={{ color: "white" }}
                    onClick={() => {
                        store.update({
                            main: {
                                saveTest: [
                                    {
                                        name,
                                        tags,
                                        steps: steps.map((step) => {
                                            const { id, ...stepData } = step
                                            return stepData
                                        })
                                    }
                                ],
                                closeBuilder: []
                            }
                        })
                        setState(initialState)
                    }}
                />
            </FloatBar>
        </Column>
    )
}
