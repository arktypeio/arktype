# onepass refactor notes

### State changes

1. top-level parse state will need to keep track of global captures
   - will inference matter for these, or just so that branches know what indices to add captures?
   -
2. try moving logic correlated with each part of finalization to where the initial parsing occurs
