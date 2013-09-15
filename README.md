# css-pack

Packs CSS dependency graphs produced from `dgraph` or `module-deps` into a
single CSS bundle, assuming every node in the graph contains CSS source and the
itself graph is sorted with `deps-sort`

    % npm install -g dgraph dgraph-css-import css-pack deps-sort
    % dgraph --transform dgraph-css-import
      | deps-sort \
      | css-pack \
      > bundle.css
