import React, { useState, useRef } from "react"
import { Theme } from "../styles"
import { makeStyles } from "@material-ui/styles"
import MuiChipInput, {
    Props as MuiChipInputProps
} from "material-ui-chip-input"
import { TextInputProps, useTextFieldProps } from "./TextInput"
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

const getSuggestions = (
    searchInput: string,
    possibleSuggestions: string[],
    disabledSuggestions: string[]
) =>
    possibleSuggestions.filter(
        suggestion =>
            suggestion.startsWith(searchInput) &&
            !disabledSuggestions.includes(suggestion)
    )

export type ChipInputProps = Omit<TextInputProps, "kind"> &
    MuiChipInputProps & { possibleSuggestions?: string[] }

export const ChipInput = ({
    possibleSuggestions = [],
    ...props
}: ChipInputProps) => {
    const inputRef = useRef<HTMLDivElement | null>(null)
    const [state, setState] = useState({
        searchInput: "",
        suggestions: [] as string[],
        chips: [] as string[],
        showSuggestions: false
    })
    const textFieldProps = useTextFieldProps(props)
    const { chipClass } = stylizeChip({ colorTemplate: props.colorTemplate })
    return (
        <>
            <MuiChipInput
                ref={inputRef}
                value={state.chips}
                onUpdateInput={event => {
                    const suggestions = getSuggestions(
                        event.target.value,
                        possibleSuggestions,
                        state.chips
                    )
                    setState({
                        ...state,
                        searchInput: event.target.value,
                        suggestions,
                        showSuggestions: suggestions.length > 0
                    })
                }}
                onBeforeAdd={value => !state.chips.includes(value)}
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
                {...(textFieldProps as any)}
                classes={{ ...textFieldProps.classes, chip: chipClass } as any}
            />
            <Menu autoFocus={false} disableAutoFocusItem={true}>
                {{
                    anchorTo: inputRef,
                    open: state.showSuggestions,
                    options: fromEntries(
                        state.suggestions.map(suggestion => [
                            suggestion,
                            () =>
                                setState({
                                    ...state,
                                    chips: [...state.chips, suggestion]
                                })
                        ])
                    ),
                    onClickAway: () =>
                        setState({ ...state, showSuggestions: false })
                }}
            </Menu>
        </>
    )
}
