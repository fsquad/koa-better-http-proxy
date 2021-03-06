var assert = require('assert');
var Koa = require('koa');
var agent = require('supertest').agent;
var fs = require('fs');
var os = require('os');
var proxy = require('../');
var startProxyTarget = require('./support/proxyTarget');

startProxyTarget(8109, 1000);

describe('body encoding', function() {
  'use strict';
  this.timeout(10000);

  var pngHex = '89504e470d0a1a0a0' +
               '000000d4948445200' +
               '00000100000001080' +
               '60000001f15c48900' +
               '00000a49444154789' +
               'c6300010000050001' +
               '0d0a2db4000000004' +
               '9454e44ae426082';
  var pngData = new Buffer(pngHex, 'hex');

  it('allow raw data', function(done) {
    var filename = os.tmpdir() + '/koa-better-http-proxy-test-' + (new Date()).getTime() + '-png-transparent.png';
    var app = new Koa();

    app.use(proxy('localhost:8109', {
      reqBodyEncoding: null,
      proxyReqBodyDecorator: function(bodyContent) {
        assert((new Buffer(bodyContent).toString('hex')).indexOf(pngData.toString('hex')) >= 0,
          'body should contain same data');
        return bodyContent;
      }
    }));

    fs.writeFile(filename, pngData, function(err) {
      if (err) { throw err; }
      agent(app.callback())
        .post('/post')
        .attach('image', filename)
        .end(function(err) {
          fs.unlink(filename);
          // This test is both broken and I think unnecessary.
          // Its broken because http.bin no longer supports /post, but this test assertion is based on the old
          // httpbin behavior.
          // The assertion in the proxyReqOptDecorator above verifies the test title.
          //var response = new Buffer(res.body.attachment.data).toString('base64');
          //assert(response.indexOf(pngData.toString('base64')) >= 0, 'response should include original raw data');
          done(err);
        });
    });

  });

  describe('when user sets parseReqBody', function() {

    it('should not parse body', function(done) {
      var filename = os.tmpdir() + '/koa-better-http-proxy-test-' + (new Date()).getTime() + '-png-transparent.png';
      var app = new Koa();
      app.use(proxy('localhost:8109', {
        parseReqBody: false,
        proxyReqBodyDecorator: function(bodyContent) {
          assert(!bodyContent, 'body content should not be parsed.');
          return bodyContent;
        }
      }));

      fs.writeFile(filename, pngData, function(err) {
        if (err) { throw err; }
        agent(app.callback())
          .post('/post')
          .attach('image', filename)
          .end(function(err) {
            fs.unlink(filename);
            // This test is both broken and I think unnecessary.
            // Its broken because http.bin no longer supports /post, but this test assertion is based on the old
            // httpbin behavior.
            // The assertion in the proxyReqOptDecorator above verifies the test title.
            // var response = new Buffer(res.body.attachment.data).toString('base64');
            // assert(response.indexOf(pngData.toString('base64')) >= 0, 'response should include original raw data');
            done(err);
          });
      });
    });

    it('should not fail on large limit', function(done) {
      var filename = os.tmpdir() + '/koa-better-http-proxy-test-' + (new Date()).getTime() + '-png-transparent.png';
      var app = new Koa();
      app.use(proxy('localhost:8109', {
        parseReqBody: false,
        limit: '20gb',
      }));
      fs.writeFile(filename, pngData, function(err) {
        if (err) { throw err; }
        agent(app.callback())
          .post('/post')
          .attach('image', filename)
          .end(function(err) {
            fs.unlink(filename);
            assert(err === null);
            // This test is both broken and I think unnecessary.
            // Its broken because http.bin no longer supports /post, but this test assertion is based on the old
            // httpbin behavior.
            // The assertion in the proxyReqOptDecorator above verifies the test title.
            //var response = new Buffer(res.body.attachment.data).toString('base64');
            //assert(response.indexOf(pngData.toString('base64')) >= 0, 'response should include original raw data');
            done(err);
          });
      });
    });
  });

  describe('when user sets reqBodyEncoding', function() {

    it('should set the accepts-charset header', function(done) {
      var app = new Koa();
      app.use(proxy('httpbin.org', {
        reqBodyEncoding: 'utf-16'
      }));
      agent(app.callback())
        .get('/headers')
        .end(function(err, res) {
          if (err) { throw err; }
          assert.equal(res.body.headers['Accept-Charset'], 'utf-16');
          done(err);
        });
    });

  });

});
