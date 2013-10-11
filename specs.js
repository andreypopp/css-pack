"use strict";

var assert = require('assert'),
    asStream = require('as-stream'),
    aggregate = require('stream-aggregate'),
    pack = require('./index'),
    sort = require('./deps-topo-sort');

function source() {
  return Array.prototype.join.call(arguments, '\n')
}

describe('css-pack', function() {

  it('bundles dependency graph', function(done) {
    var g = asStream(
      {
        id: 'z.css',
        source: source('.a { background: red; }'),
        deps: {}
      },
      {
        id: 'main.css',
        source: source(
          '@import "./a.css";',
          '.body { font-size: 12px; }'
        ),
        deps: {'./a.css': 'z.css'}
      }
    )

    aggregate(g.pipe(pack()), function(err, bundle) {
      if (err) return done(err)
      assert.ok(!/@import/.exec(bundle))
      assert.ok(/\.a {/.exec(bundle))
      assert.ok(/\.body {/.exec(bundle))
      done()
    })
  }),


  it('bundles dependency graph which contains single node', function(done) {
    var g = asStream(
      {
        id: 'a.css',
        source: source('.a { background: red; }'),
        deps: {}
      }
    )

    aggregate(g.pipe(pack()), function(err, bundle) {
      if (err) return done(err)
      assert.ok(/\.a {/.exec(bundle))
      done()
    })
  })
})

describe('deps-topo-sort', function() {

  it('sorts modules topologically', function(done) {
    var g = asStream(
      {
        id: 'main.css',
        deps: {'./a.css': 'z.css'}
      },
      {
        id: '0.css',
        deps: {'x': 'x.css'}
      },
      {
        id: 'x.css'
      },
      {
        id: 'z.css',
        deps: {}
      }
    );

    aggregate(g.pipe(sort()), function(err, result) {
      if (err) return done(err);
      assert.deepEqual(
        result.map(function(mod) { return mod.id; }),
        ["z.css", "main.css", "x.css", "0.css"]);
      done();
    });
  });
});
