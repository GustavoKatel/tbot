// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var Chance = require('chance');

var config = require('./config');

var Bot = require('./bot');

var bot = new Bot(config);

// weight people in the bot's network.
// the higher interaction with the bot, the higher the prob to the bot start
// a conversation
var buddies = {};

// default prob to get a response
var responseProbDefault = 1.0 / 50;

var chance = new Chance();

bot.onCorpusProgress(function(i, total) {
  console.log(i + '/' + total);
});

var postSomething = function() {

  bot.humanDelay(function() {

    bot.respond(/* create a new string */).then(function(text) {

      bot.post(text).then(function(data) {
        console.log('[' + config.BOT_NAME + '] ' +
          '[POSTED] ' +
          text);
        console.log();
      });
    }).catch(function(err) {
      console.log(err);
    });

  });

};

postSomething();

// every 5 hours post something
bot.schedule('0 0 */5 * * *', postSomething);

bot.onTweet(function(tweet, hasMention) {
  var prob = chance.floating({min: 0.0, max: 1.0});

  // var responseProb = buddies[tweet.user.screen_name] || responseProbDefault;
  var responseProb = responseProbDefault;

  if (hasMention) {
    responseProb = 1;
    buddies[tweet.user.screen_name] = (buddies[tweet.user.screen_name] ||
      responseProbDefault) + 0.01;
  }

  if (prob <= responseProb) {

    console.log('[' + config.BOT_NAME + '] ' +
      '[REPLYING] ' +
      '[' + tweet.user.screen_name + '] ' +
    tweet.text);
    bot.respond(tweet.text).then(function(res) {

      var mentions = tweet.entities.user_mentions;
      var mentionsText = mentions.map(function(m) {
        if (m.screen_name == config.BOT_NAME) {
          return '';
        }

        return '@' + m.screen_name;
      });
      mentionsText.push('@' + tweet.user.screen_name);
      mentionsText = mentionsText.join(' ');

      var text = mentionsText + ' ' + res;

      bot.humanDelay(function() {
        bot.post(text, tweet.id).then(function(data) {
          console.log('[' + config.BOT_NAME + '] ' +
            '[REPLIED] ' +
            '[' + tweet.user.screen_name + '] ' +
            text);
          console.log();
        }).catch(function(err) {
          console.log(err);
        });
      });

    });

  }

});

bot.onDirectMessaage(function(msg) {
  var dm = msg.direct_message;
  console.log('[' + config.BOT_NAME + '] ' +
    '[DM] ' +
    '[' + dm.sender_screen_name + '] ' +
    dm.text);
  bot.respond(dm.text).then(function(res) {
    bot.sendDM(dm.sender_id_str, res).then(function(data) {
      console.log('[' + config.BOT_NAME + '] ' +
        '[DM-SENT] ' +
        '[' + dm.sender_screen_name + '] ' +
        res);
      console.log();
    }).catch(function(err) {
      console.log(err);
    });
  });
});
