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

      try {
        this.queue(inline(mod, graph, seen) + '\n');
      } catch (err) {
        this.emit('error', err);
      }
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
      style = parse(mod.source, mod.id);

  style.stylesheet.rules.forEach(function (rule) {
    if (!isImportRule(rule))
      return rules.push(rule);

    var id = mod.deps[unquote(rule.import)];

    if (seen[id])
      return
    else
      seen[id] = true;


    rules = rules.concat(parse(graph[id].source, id).stylesheet.rules);
  });

  style.stylesheet.rules = rules;

  return css.stringify(style);
}

function parse(source, filename) {
  try {
    return css.parse(source.toString());
  } catch(err) {
    throw new Error('error while parsing ' + filename + ': ' + err);
  }
}

function isImportRule(r) {
  return (r.type === 'import') && (!/^url\(/.exec(r.import));
}

function unquote(str) {
  return str.replace(/^['"]/, '').replace(/['"]$/, '');
}
