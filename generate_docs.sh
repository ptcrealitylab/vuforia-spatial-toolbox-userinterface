#!/bin/bash

for f in $(find src -name '*.js' -or -name '*.md');
do
  echo $f;
  documentation build $f -f html -o ./docs/$f
done

exit 0;
