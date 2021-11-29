const importedBy: string[] = []

export const registerImporter = (fromPath: string) => importedBy.push(fromPath)
export const listImporters = () => importedBy
