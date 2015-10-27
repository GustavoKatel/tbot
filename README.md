# tbot
Just another twitter bot (using markov chain)

## Configuration

    config = {
      CONSUMER_KEY: 'CONSUMER_KEY',
      CONSUMER_SECRET: 'CONSUMER_SECRET',

      ACCESS_TOKEN: 'ACCESS_TOKEN',
      ACCESS_TOKEN_SECRET: 'ACCESS_TOKEN_SECRET',

      MARKOV_ORDER: 3,

      CORPUS: 'corpus/all.json',
      CORPUS_DIGEST: 'corpus/all.model',

      BOT_NAME: 'botanado',

      MAX_WORDS: 5
    };

    var bot = new Bot(config);

  - `CONSUMER_KEY` get from [Twitter apps website](https://apps.twitter.com/)
  - `CONSUMER_SECRET` get from [Twitter apps website](https://apps.twitter.com/)
  - `ACCESS_TOKEN` get from [Twitter apps website](https://apps.twitter.com/)
  - `ACCESS_TOKEN_SECRET` get from [Twitter apps website](https://apps.twitter.com/)

  - `MARKOV_ORDER` the number of words in each node of the markov chains

  - `CORPUS` file containing the data to be consumed by the text generator
  - `CORPUS_DIGEST` file that will be used to save a snapshot of the generator

  - `BOT_NAME` the name of the bot

  - `MAX_WORDS` the number maximum of words to be generated in each query

## Events

  ### onCorpusProgress( function(pos, total) )

  Emitted each after processing an entry in the corpus

  ### onTweet( function(onTweet (tweet, hasMention) )

  Emitted when there's a new tweet in the bot's timeline

  ### onDirectMessaage( function(msg) )

  Emitted when there's a new direct message

## Util methods

  ### Bot.respond(input) - Promise(text)

  Generates new text based on `input`. If `input is empty, generates
  randomically a new text

  ### Bot.post(text, replyId) - Promise()

  Post a tweet with text `text` and mark it as a reply to the status id `replyId`

  ### Bot.humanDelay(callback)

  Calls `callback` after a reasonable amount of time to simulate a human delay.
  It needs improvement.

  ### Bot.schedule(cron, callback)

  Schedule `callback` to be executed following the cron-like arguments in `cron`

## Author

- Gustavo Sampaio [@GustavoKatel](https://github.com/GustavoKatel)

## License

See LICENSE file
