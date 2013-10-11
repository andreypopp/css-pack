"use strict";

var through   = require('through'),
    css       = require('css'),
    duplex    = require('stream-combiner'),
    sort      = require('./deps-topo-sort');

module.exports = function(opts) {
  var graph = {},
      seen = {};

  var pack = through(
    function(mod) {
      graph[mod.id] = mod;

      if (!mod.deps || (mod.deps && Object.keys(mod.deps).length === 0)) return;

      if (seen[mod.id]) return;
      seen[mod.id] = true;

      this.queue(inline(mod, graph, seen) + '\n');
    },
    function() {
      for (var id in graph) {
        if (!seen[id])
          this.queue(graph[id].source);
      }
      this.queue(null);
    });

  return duplex(sort(), pack);
}

function inline(mod, graph, seen) {
  var rules = [],
      style = css.parse(mod.source.toString());

  style.stylesheet.rules.forEach(function (rule) {
    if (!isImportRule(rule))
      return rules.push(rule);

    var id = mod.deps[unquote(rule.import)];

    if (seen[id])
      return
    else
      seen[id] = true;

    rules = rules.concat(css.parse(graph[id].source).stylesheet.rules);
  });

  style.stylesheet.rules = rules;

  return css.stringify(style);
}

function isImportRule(r) {
  return (r.type === 'import') && (!/^url\(/.exec(r.import));
}

function unquote(str) {
  return str.replace(/^['"]/, '').replace(/['"]$/, '');
}
