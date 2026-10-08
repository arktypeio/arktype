# @ark/precompile

## Unreleased

### Check which definitions can be precompiled

`arktype-precompile --check` reports each arktype definition in a project as accepted or rejected for precompilation, with the chain of reasons for each rejection. Nothing is emitted yet. `--fail-under` exits with an error below an acceptance rate, and `--mode cache` reports without rejecting.

```sh
npx arktype-precompile --check "src/**/*.ts" --fail-under 90
```
