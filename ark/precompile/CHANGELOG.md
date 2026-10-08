# @ark/precompile

## Unreleased

### Check which definitions can be precompiled

`arktype-precompile --check` reports each arktype definition in a project as accepted or rejected for precompilation, with the chain of reasons for each rejection. Nothing is emitted yet.

```sh
npx arktype-precompile --check "src/**/*.ts" --fail-under 90
```
