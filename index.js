"use strict";

var through             = require('through'),
    cssparse            = require('css-parse'),
    stringify           = require('css-stringify'),
    duplex              = require('stream-combiner'),
    convertSourceMap    = require('convert-source-map'),
    sort                = require('deps-topo-sort');

module.exports = function(opts) {
  opts = opts || {};

  var debug = opts.debug,
      graph = {},
      seen = {},
      generated = [];

  var pack = through(
    function(mod) {

      graph[mod.id] = mod;

      if (!mod.deps || (mod.deps && Object.keys(mod.deps).length === 0)) return;

      if (seen[mod.id]) return;
      seen[mod.id] = true;

      try {
        modStyle(mod).stylesheet.rules.forEach(function (rule) {
          if (!isImportRule(rule)) {
            generated.push(rule);
          } else {
            var id = mod.deps[unquote(rule.import)];
            if (seen[id]) return;
            seen[id] = true;
            var dep = graph[id];
            generated = generated.concat(modStyle(dep).stylesheet.rules);
          }
        });
      } catch (err) {
        this.emit('error', err);
      }
    },
    function() {
      for (var id in graph)
        if (!seen[id])
          generated = generated.concat(modStyle(graph[id]).stylesheet.rules);

      var compiled = stringify({stylesheet: {rules: generated}}, {sourceMap: true});
      this.queue(compiled.code);

      if (opts.debug) {
        var map = compiled.map;
        map.file = 'generated.css';
        map.sourcesContent = map.sources.map(function(id) {
          return graph[id] ? modSource(graph[id]) : null;
        });
        this.queue('\n' + mapToComment(map));
      }

      this.queue(null);
    });

  return opts.sorted ? pack : duplex(sort(), pack);
}

function mapToComment(map){
  return '/*# sourceMappingURL=data:application/json;base64,' +
        convertSourceMap.fromObject(map).toBase64()
        + ' */';
  }

function modStyle(mod) {
  return mod.style !== undefined ? mod.style : parse(mod.source, mod);
}

function modSource(mod) {
  return mod.source !== undefined ? mod.source : stringify(mod.style);
}

function parse(source, mod) {
  try {
    return cssparse(source.toString(), {source: mod.id, position: true});
  } catch(err) {
    throw new Error('error while parsing ' + mod.id + ': ' + err);
  }
}

function isImportRule(r) {
  return (r.type === 'import') && (!/^url\(/.exec(r.import));
}

function unquote(str) {
  return str.replace(/^['"]/, '').replace(/['"]$/, '');
}

function countLines(src) {
  if (!src) return 0;
  var newlines = src.match(/\n/g);

  return newlines ? newlines.length : 0;
}
