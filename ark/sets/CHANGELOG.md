# arksets

## 0.0.1

Initial release: reads arktype Types, Standard JSON Schemas (through the JSON Schema they write) and JSON Schemas as the sets of values they accept, relates them (`isSubset`, `isEqual`, `isDisjoint`), combines them (`intersect`, `union`), finds a union's discriminant and writes JSON Schema. Importing it installs the algebra `@ark/schema` reduces and discriminates with. See the [README](./README.md).
