import { transform, isEmpty } from "@re-do/utils"
import { Model, Relationships, Dependents } from "./common.js"

export const createDependentsMap = <T extends Model>(
    relationships: Relationships<T>
) =>
    transform(relationships, ([k, v]) => [
        k,
        Object.entries(relationships).reduce(
            (dependentsOfK, [candidateKey, candidateRelationships]) => {
                const kTypedFields = Object.entries(candidateRelationships)
                    .filter(
                        ([candidateField, candidateFieldType]) =>
                            candidateFieldType === k
                    )
                    .map(
                        ([candidateField, candidateFieldType]) => candidateField
                    )
                if (!isEmpty(kTypedFields)) {
                    return {
                        ...dependentsOfK,
                        [candidateKey]: kTypedFields
                    }
                }
                return dependentsOfK
            },
            {}
        )
    ]) as any as Dependents<T>
