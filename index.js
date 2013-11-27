"use strict";

var through             = require('through'),
    cssparse            = require('css-parse'),
    stringify           = require('css-stringify'),
    duplex              = require('stream-combiner'),
    convertSourceMap    = require('convert-source-map'),
    sort                = require('deps-topo-sort');

/**
 * Create a consumer stream which collects all modules with CSS source and call
 * a callback with a combiner stylesheet.
 */
function combine(cb) {
  var modules = {},
      seen = {},
      rules = [];

  return through(
    function(mod) {

      modules[mod.id] = mod;

      if (!mod.deps || (mod.deps && Object.keys(mod.deps).length === 0)) return;

      if (seen[mod.id]) return;
      seen[mod.id] = true;

      try {
        getStyle(mod).stylesheet.rules.forEach(function (rule) {
          if (!isImportRule(rule)) {
            rules.push(rule);
          } else {
            var id = mod.deps[unquote(rule.import)];
            if (seen[id]) return;
            seen[id] = true;
            var dep = modules[id];
            rules = rules.concat(getStyle(dep).stylesheet.rules);
          }
        });
      } catch (err) {
        cb(new PackError(mod, err));
      }
    },
    function() {
      try {
        for (var id in modules)
          if (!seen[id])
            rules = rules.concat(getStyle(modules[id]).stylesheet.rules);
      } catch(err) {
        cb(new PackError(null, err));
      }
      cb(null, {stylesheet: {rules: rules}}, modules);
    });
}

/**
 * Wrapper around css-stringify which optionally adds inline source map
 */
function compile(style, opts) {
  opts = opts || {};
  var modules = opts.modules || {};
  var buf = '';
  var compiled = stringify(style, {sourcemap: true, compress: opts.compress});

  buf += compiled.code;

  if (opts.debug) {
    var map = compiled.map;
    map.file = 'generated.css';
    map.sourcesContent = map.sources.map(function(id) {
      return (modules[id] && modules[id].source) ? modules[id].source : null;
    });
    buf += '\n' + mapToComment(map);
  }

  return buf;
}

/**
 * Stream which consumes CSS modules and emits a bundled CSS source.
 */
function packer(opts) {
  opts = opts || {};
  var combiner = combine(function(err, style, modules) {
    if (err) return combiner.emit('error', err);
    var packed;
    opts.modules = modules;
    try {
      packed = compile(style, opts);
    } catch(cerr) {
      return combiner.emit('error', cerr);
    }
    combiner.queue(packed);
    combiner.queue(null);
  });
  return opts.sorted ? combiner : duplex(sort(), combiner);
}

function mapToComment(map){
  return '/*# sourceMappingURL=data:application/json;base64,' +
        convertSourceMap.fromObject(map).toBase64() +
        ' */';
  }

function getStyle(mod) {
  return mod.style !== undefined ?
    mod.style :
    cssparse(mod.source.toString(), {source: mod.id, position: true});
}

function isImportRule(r) {
  return (r.type === 'import') && (!/^url\(/.exec(r.import));
}

function unquote(str) {
  return str.replace(/^['"]/, '').replace(/['"]$/, '');
}

function PackError(mod, underlying) {
  var msg = mod ?
    (underlying.toString() + ' (while packing ' + mod.id + ')') :
    underlying.toString();
  Error.call(this, msg);
  this.mod = mod;
  this.underlying = underlying;
  this.stack = underlying.stack;
}
PackError.prototype = new Error();
PackError.prototype.name = 'PackError';

module.exports = packer;
module.exports.combine = combine;
module.exports.compile = compile;
