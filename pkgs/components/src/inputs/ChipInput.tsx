import React, { useState } from "react"
import { Theme } from "../styles"
import { makeStyles } from "@material-ui/styles"
import MuiChipInput, {
    Props as MuiChipInputProps
} from "material-ui-chip-input"
import { TextInputProps, useTextFieldProps } from "./TextInput"
import Autosuggest, { AutosuggestProps } from "react-autosuggest"

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

export type ChipInputProps = Omit<TextInputProps, "kind"> &
    MuiChipInputProps & { possibleSuggestions?: string[] }

export const ChipInput = (props: ChipInputProps) => {
    const [state, setState] = useState({
        searchInput: "",
        suggestions: [] as string[]
    })
    console.log(state)
    const textFieldProps = useTextFieldProps(props)
    const { colorTemplate, possibleSuggestions = [] } = props
    const { chipClass } = stylizeChip({ colorTemplate })
    // @ts-ignore
    return (
        <MuiChipInput
            onUpdateInput={event =>
                setState({
                    searchInput: event.target.value,
                    suggestions: getSuggestions(
                        event.target.value,
                        possibleSuggestions
                    )
                })
            }
            // Enter and Space, respectively
            newChipKeyCodes={[13, 32]}
            // @ts-ignore
            {...textFieldProps}
            // @ts-ignore
            classes={{ ...textFieldProps.classes, chip: chipClass }}
        />
    )
}
