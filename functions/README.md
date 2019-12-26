# Context

* This lambda is based on the idea behind of https://staticman.net/ for publising comments into static sites and [JAMStack Lambda Comments](https://github.com/davidayalas/jamstack-lambda-comments)

* It manages Twitter webhook validation: crc token (GET) and x-twitter-webhooks-signature (POST webhook)
* On new tweets or retweets puts new data file into github repo to generate a build
* Deletes from github deleted tweets or undone retweets 
* For pinned tweets there isn't a webhook. Then I generate a build if webhook is a fav (favorited_status) on a tweet of my own.

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

## Setup for local dev and deploy

1. Install [netlify-lambda](https://github.com/netlify/netlify-lambda)
1. See [package.json](../package.json) in the root of the project
    1. To install dependencies
        
            $ npm run install
    1. To run development environment
        
            $ npm run dev

    1. To build (on Netlify). See "Netlify Build Command" in [README.md](../README.md#netlify-build-command)

            $ npm run build 