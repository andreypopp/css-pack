"use strict";

var assert = require('assert'),
    asStream = require('as-stream'),
    aggregate = require('stream-aggregate'),
    pack = require('./index')

function source() {
  return Array.prototype.join.call(arguments, '\n')
}

describe('css-pack', function() {

  it('bundles dependency graph', function(done) {
    var g = asStream(
      {
        id: 'a.css',
        source: source('.a { background: red; }'),
        deps: {}
      },
      {
        id: 'main.css',
        source: source(
          '@import "./a.css";',
          '.body { font-size: 12px; }'
        ),
        deps: {'./a.css': 'a.css'}
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
