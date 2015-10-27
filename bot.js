// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
'use strict';

var Twitter = require('twit');
var markov = require('markov');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var schedule = require('node-schedule');
var Chance = require('chance');

/**
* Events:
* - corpusReady
* - corpusProgress (index, total)
* - onTweet (tweet, hasMention) - emited when there's a new tweet in the timeline
* - onDirectMessaage (msg) - emitted when there's a new direct message
*/

class Bot {
  constructor(config /*optional*/) {
    this.config = config || {};

    this.twitter = new Twitter({
      consumer_key: this.config.CONSUMER_KEY,
      consumer_secret: this.config.CONSUMER_SECRET,
      access_token: this.config.ACCESS_TOKEN,
      access_token_secret: this.config.ACCESS_TOKEN_SECRET,
    });

    this.generator = markov(this.config.MARKOV_ORDER);

    this.emitter = new EventEmitter();

    this.chance = new Chance();

    this.corpusReady = false;
    var $this = this;
    this.emitter.once('corpusReady', function() {
      $this.corpusReady = true;
    });
    this._loadCorpus();

    this._startTwitter();
  }

  _loadCorpus() {
    var $this = this;

    if (fs.existsSync(this.config.CORPUS_DIGEST)) {

      this.generator.load(this.config.CORPUS_DIGEST, function() {
        $this.emitter.emit('corpusReady');
      });

    } else {

      fs.readFile(this.config.CORPUS, 'utf-8', function(err, data) {
        if (err) {
          console.log(err);
          return;
        }

        var obj = JSON.parse(data);
        var total = obj.length;

        // TODO: TEMP
        // obj = obj.splice(0, 1000);

        var promises = obj.map(function(tweet, index) {

          return new Promise(function(resolve, reject) {

            var text = $this.clean(tweet);
            $this.generator.seed(text, function() {
              $this.emitter.emit('corpusProgress', index, total);
              resolve();
            });

          });

        });

        Promise.all(promises).then(function() {
          $this.generator.save($this.config.CORPUS_DIGEST, function() {
            $this.emitter.emit('corpusReady');
          });
        });

      });

    }

  }

  clean(text_) {
    if (!text_) {
      return '';
    }

    var regexList = [
      /([a-z0-9\-\_\.\+]+@)?(https?:\/\/)?([a-z0-9\-\_\/]+)(\.([a-z0-9\-\_\/]+))+([\?\&a-z0-9\=])*/ig, // emails, urls
      /(@\w+)/ig, // usernames,
      /RT(\s:)?/ig, // rt sentence
    ];

    var text = text_;

    regexList.forEach(function(regex) {
      text = text.replace(regex, '');
    });

    return text;
  }

  _makeText(input) {
    var max = 140; // characters

    var words = [];

    if (!input) {
      var key = this.generator.pick();
      words = this.generator.fill(key, this.config.MAX_WORDS);
    } else {
      words = this.generator.respond(input, this.config.MAX_WORDS);
    }

    while (words.join(' ').length > max) {
      words.splice(words.length - 1, 1);
    }

    return words.join(' ');
  }

  respond(input_) {
    var $this = this;

    var input = this.clean(input_);

    return new Promise(function(resolve, reject) {

      if (!$this.corpusReady) {

        $this.emitter.once('corpusReady', function() {
          var res = $this._makeText(input);
          resolve(res);
        });

      } else {

        var res = $this._makeText(input);
        resolve(res);

      }

    });
  }

  onCorpusProgress(cb) {
    this.emitter.on('corpusProgress', cb);
  }

  _startTwitter() {
    var $this = this;

    var user_stream = this.twitter.stream('user');
    user_stream.on('tweet', function(tweet) {

      // check if bot is in the mention list, if it is, let the mention_stream
      // handle it
      var found = false;
      tweet.entities.user_mentions.forEach(function(t) {
        if (t.screen_name == $this.config.BOT_NAME) {
          found = true;
        }
      });

      if (!found && tweet.user.screen_name != $this.config.BOT_NAME) {
        $this.emitter.emit('onTweet', tweet, false);
      }
    });

    user_stream.on('direct_message', function(directMsg) {
      if (directMsg.direct_message.sender_screen_name ==
        $this.config.BOT_NAME) {
        return;
      }
      $this.emitter.emit('onDirectMessaage', directMsg);
    });

    user_stream.on('error', function(err) {
      console.log(err);
    });

    // mentions tracker
    var mention_stream = this.twitter.stream('statuses/filter', {
      track: '@' + this.config.BOT_NAME
    });
    mention_stream.on('tweet', function(tweet) {

      if (tweet.user.screen_name == $this.config.BOT_NAME) {
        return;
      }
      $this.emitter.emit('onTweet', tweet, true);

    });

    mention_stream.on('error', function(err) {
      console.log(err);
    });

  }

  onTweet(cb) {
    this.emitter.on('onTweet', cb);
  }

  onDirectMessaage(cb) {
    this.emitter.on('onDirectMessaage', cb);
  }

  sendDM(user_id, text) {
    var $this = this;
    return new Promise(function(resolve, reject) {
      $this.twitter.post('direct_messages/new', {
        user_id: user_id,
        text: text
      }, function(err, data, response) {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    });
  }

  post(text, replyId) {
    var $this = this;
    return new Promise(function(resolve, reject) {

      if (!$this.corpusReady) {

        $this.emitter.once('corpusReady', function() {

          text = text || this._makeText();

          $this.twitter.post('statuses/update', {
            status: text,
            in_reply_to_status_id: replyId
          }, function(err, data, response) {
            if (err) {
              reject(err);
              return;
            }
            resolve(data);
          });

        });

      } else {

        text = text || this._makeText();

        $this.twitter.post('statuses/update', {
          status: text,
          in_reply_to_status_id: replyId
        }, function(err, data, response) {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        });

      }

    });

  }

  schedule(cron, fun) {
    schedule.scheduleJob(cron, fun);
  }

  humanDelay(fun) {
    var t = this.chance.integer({min: 1, max: 5});
    setTimeout(fun, t * 2000);
  }

};

module.exports = Bot;
