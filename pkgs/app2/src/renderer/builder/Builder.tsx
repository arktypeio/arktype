import React, { useState } from "react"
import {
    Column,
    TextInput,
    FloatBar,
    Icons,
    Button,
    ChipInput
} from "@re-do/components"
import { BuilderEvents } from "./StepCards"
import { store } from "renderer/common"
import { deactivateBuilder } from "state"

const initialState = {
    name: "",
    tags: [] as string[]
}

export const Builder = () => {
    const [state, setState] = useState(initialState)
    const { name, tags } = state
    const { builderActive, steps } = store.useQuery({
        builderActive: true,
        steps: true
    })
    if (!builderActive && (name || tags.length)) {
        setState({ name: "", tags: [] })
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
                        onChange={(tags) => setState({ ...state, tags })}
                    />
                </Column>
            </FloatBar>
            <BuilderEvents steps={steps as any} />
            <FloatBar kind="bottom" justify="space-around">
                <Button
                    Icon={Icons.close}
                    style={{ color: "white" }}
                    onClick={() => deactivateBuilder(store)}
                />
                <Button
                    Icon={Icons.save}
                    style={{ color: "white" }}
                    onClick={() => {
                        store.update({
                            tests: (_) => _.concat({ name, tags, steps })
                        })
                        deactivateBuilder(store)
                    }}
                />
            </FloatBar>
        </Column>
    )
}
