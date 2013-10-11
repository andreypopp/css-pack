# css-pack

Packs CSS dependency graphs produced from `dgraph` or `module-deps` into a
single CSS bundle, assuming every node in the graph contains CSS source and the
graph itself is sorted with `deps-sort`

    % npm install -g dgraph dgraph-css-import css-pack
    % dgraph --transform dgraph-css-import style.css \
      | css-pack \
      > bundle.css
