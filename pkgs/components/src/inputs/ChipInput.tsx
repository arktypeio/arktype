import React, { useState } from "react"
import { Theme } from "../styles"
import { makeStyles } from "@material-ui/styles"
import MuiChipInput, {
    Props as MuiChipInputProps
} from "material-ui-chip-input"
import { TextInputProps, useTextFieldProps } from "./TextInput"
import Autosuggest, { AutosuggestProps } from "react-autosuggest"
import { Menu } from "../menus"
import { fromEntries } from "@re-do/utils"

const stylizeChip = makeStyles((theme: Theme) => ({
    chipClass: ({ colorTemplate }: Pick<TextInputProps, "colorTemplate">) => ({
        margin: 4,
        color: colorTemplate === "light" ? "black" : "white",
        backgroundColor:
            colorTemplate === "light"
                ? theme.palette.background.paper
                : theme.palette.primary.light
    })
}))

const getSuggestions = (searchInput: string, possibleSuggestions: string[]) => {
    return possibleSuggestions.filter(suggestion =>
        suggestion.startsWith(searchInput)
    )
}

const renderSuggestion = (suggestion: string) => <div>{suggestion}</div>

export type ChipInputProps = Omit<TextInputProps, "kind"> &
    MuiChipInputProps & { possibleSuggestions?: string[] }

export const ChipInput = (props: ChipInputProps) => {
    const [state, setState] = useState({
        searchInput: "",
        suggestions: [] as string[],
        chips: [] as string[]
    })

    const textFieldProps = useTextFieldProps(props)
    const { colorTemplate, possibleSuggestions = [] } = props
    const { chipClass } = stylizeChip({ colorTemplate })
    // @ts-ignore
    return (
        <>
            <MuiChipInput
                value={state.chips as any}
                onUpdateInput={event =>
                    setState({
                        ...state,
                        searchInput: event.target.value,
                        suggestions: getSuggestions(
                            event.target.value,
                            possibleSuggestions
                        ),
                        chips: state.chips
                    })
                }
                onAdd={value => {
                    setState({
                        ...state,
                        chips: [...state.chips, value]
                    })
                }}
                onDelete={(value, index) => {
                    setState({
                        ...state,
                        chips: [
                            ...state.chips.slice(0, index),
                            ...state.chips.slice(index + 1)
                        ]
                    })
                }}
                // Enter and Space, respectively
                newChipKeyCodes={[13, 32]}
                // @ts-ignore
                {...textFieldProps}
                // @ts-ignore
                classes={{ ...textFieldProps.classes, chip: chipClass }}
            />
            {/* <Menu open={true}>
                {{
                    options: fromEntries(
                        state.suggestions.map(suggestion => [
                            suggestion,
                            () =>
                                setState({
                                    ...state,
                                    chips: [...state.chips, suggestion]
                                })
                        ])
                    )
                }}
            </Menu> */}

            {state.suggestions.map(suggestion => (
                <div
                    key={suggestion}
                    onClick={() =>
                        setState({
                            ...state,
                            chips: [...state.chips, suggestion]
                        })
                    }
                >
                    {suggestion}
                </div>
            ))}
        </>
    )
}
