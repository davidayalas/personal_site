# Context

* This lambda is based on the idea behind of https://staticman.net/ for publising comments into static sites and [JAMStack Lambda Comments](https://github.com/davidayalas/jamstack-lambda-comments)

* It manages Twitter webhook validation: crc token (GET) and -twitter-webhooks-signature (POST webhook)
* On new tweets or retweets puts new data file into github repo to generate a build
* Deletes from github deleted tweets or undone retweets 

## Environment variables

* TWITTER:
    * TWITTER_CONSUMER_KEY
    * TWITTER_CONSUMER_SECRET
    * TWITTER_ACCESS_TOKEN
    * TWITTER_ACCESS_TOKEN_SECRET
    * TWITTER_USER

* GITHUB
    * PROJECTID
    * OWNER
    * TOKEN

## Filepath

The new file will be named like this:

https://[repo api endpoint]/data/tweets/[id].json


## Webhook

To setup twitter webhook, best guide here: https://dev.to/alexluong/comprehensive-guide-to-twitter-webhook-1cd3
