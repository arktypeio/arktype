import { withDefaults, split } from "@re-do/utils"
import { FileDbContext, FindBy, KeyName, Model } from "./common.js"

export type RemoveOptions = {
    prune?: boolean
}

const addDefaultRemoveOptions = withDefaults<RemoveOptions>({
    prune: true
})

export const remove = <T extends Model>(
    typeName: KeyName<T>,
    by: FindBy<any>,
    context: FileDbContext<T>,
    options: RemoveOptions = {}
) => {
    const { prune } = addDefaultRemoveOptions(options)
    const [objectsToDelete, objectsToPreserve] = split(
        context.store.get(typeName as any) as any,
        by
    )
    const idsToDelete = objectsToDelete.map(
        (o) => o[context.idFieldName]
    ) as any as number[]
    const cascadedUpdates = { [typeName]: objectsToPreserve } as any
    Object.entries(context.dependents[typeName]).forEach(
        ([dependentType, dependentFields]) => {
            if (!dependentFields?.length) {
                return
            }
            const possibleDependentValues =
                dependentType === typeName
                    ? objectsToPreserve
                    : (context.store.get(dependentType as any) as any[])
            const updatedDependentValues = possibleDependentValues.map(
                (possibleDependentValue) => {
                    return dependentFields.reduce(
                        (updatedDependentValue, fieldName) => {
                            let updatedFieldValue =
                                possibleDependentValue[fieldName]
                            if (updatedFieldValue) {
                                if (Array.isArray(updatedFieldValue)) {
                                    updatedFieldValue =
                                        updatedFieldValue.filter(
                                            (id) => !idsToDelete.includes(id)
                                        )
                                } else if (
                                    typeof updatedFieldValue === "number"
                                ) {
                                    if (
                                        idsToDelete.includes(updatedFieldValue)
                                    ) {
                                        updatedFieldValue = null
                                    }
                                } else {
                                    throw new Error(
                                        `Expected an ID or list of IDs for ${dependentType}/${fieldName} but instead found ${updatedFieldValue}.`
                                    )
                                }
                            }
                            return {
                                ...updatedDependentValue,
                                [fieldName]: updatedFieldValue
                            }
                        },
                        possibleDependentValue
                    )
                }
            )
            cascadedUpdates[dependentType] = updatedDependentValues
        }
    )
    context.store.update(cascadedUpdates, {
        actionType: "delete"
    })
}
