import React from "react"
import { Chip, Autocomplete as MuiAutoComplete } from "@material-ui/core"
import { TextInput } from "./TextInput.js"

export type ChipInputProps = {
    possibleSuggestions?: string[]
    label?: string
    onChange?: (value: string[]) => void
}

export const ChipInput = ({
    label,
    possibleSuggestions = [],
    onChange
}: ChipInputProps) => (
    <MuiAutoComplete
        multiple
        freeSolo
        options={possibleSuggestions}
        {...(onChange
            ? { onChange: (event, value) => onChange(value as string[]) }
            : undefined)}
        renderTags={(suggestions, getTagProps) =>
            suggestions.map((suggestion, index) => (
                <Chip
                    variant="outlined"
                    label={suggestion}
                    {...getTagProps({ index })}
                />
            ))
        }
        renderInput={(params: any) => <TextInput label={label} {...params} />}
    />
)
