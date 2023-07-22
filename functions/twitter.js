require('dotenv').config();
const utils = require('./libs/utils');

let git = null;

const git_options = {
    git_type : "GITHUB",
    project : process.env.GIT_PROJECTID,
    token : process.env.GIT_TOKEN, 
    owner : process.env.GIT_OWNER || "me@test.com"
}

const userId = process.env.TWITTER_USER_ID;
const userName = process.env.TWITTER_USER;
const authToken = process.env.TWITTER_AUTH_TOKEN;
const bearerToken = process.env.TWITTER_BEARER_TOKEN;
const graphqlID = process.env.TWITTER_GRAPHQL_ID;
const cookie_ct0 = process.env.TWITTER_COOKIE_CT0;
const csrf_token = process.env.TWITTER_CSRF;

async function fetchGitTweet(id){
    if(!git){
        git = new utils.git(git_options);
    }

    return await git.repo.get(`content/tweets/${id}.md`);
}

async function getTweetData(entry, pinned=false){
    let description="";
    let media="";

    //tweet id --> search in github repo
    tweetId = entry.entryId.replace("tweet-","");
    tweet = await fetchGitTweet(tweetId);

    try{
        tweet = JSON.parse(tweet.body);
    }catch(e){
        console.log(e.message);
        return {"error" : true}
    }
    
    if(!pinned && (tweet && tweet.name)){return {"exists": true};}

    const date = new Date(entry.content.itemContent.tweet_results.result.legacy.created_at).toISOString();
    if(entry.content.itemContent.tweet_results.result.legacy.retweeted_status_result){
        description = entry.content.itemContent.tweet_results.result.legacy.retweeted_status_result.result.legacy.full_text;
    }else{
        description = entry.content.itemContent.tweet_results.result.legacy.full_text, "\r\n";
    }

    if(entry.content.itemContent.tweet_results.result.legacy.entities.media && entry.content.itemContent.tweet_results.result.legacy.entities.media.length>0){
        media=entry.content.itemContent.tweet_results.result.legacy.entities.media[0].media_url_https;
    }

    return {"description": description, "id": tweetId, "date": date, "media": media }
}

async function fetchLatestTweets(){

    const response = await fetch(`https://twitter.com/i/api/graphql/${graphqlID}/UserTweets?variables=%7B%22userId%22%3A%22263355563%22%2C%22count%22%3A20%2C%22includePromotedContent%22%3Atrue%2C%22withQuickPromoteEligibilityTweetFields%22%3Atrue%2C%22withVoice%22%3Atrue%2C%22withV2Timeline%22%3Atrue%7D&features=%7B%22rweb_lists_timeline_redesign_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Afalse%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_media_download_video_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withAuxiliaryUserLabels%22%3Afalse%2C%22withArticleRichContentState%22%3Afalse%7D`, {
        "headers": {
          "accept": "*/*",
          "accept-language": "ca-ES,ca;q=0.9,es-ES;q=0.8,es;q=0.7",
          "authorization": `Bearer ${bearerToken}`,
          "content-type": "application/json",
          "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Google Chrome\";v=\"114\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Linux\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-csrf-token": csrf_token,
          "x-twitter-active-user": "yes",
          "x-twitter-auth-type": "OAuth2Session",
          "x-twitter-client-language": "ca",
          "cookie": `dnt=1; ads_prefs=\"HBISAAA=\"; remember_checked_on=1; auth_token=${authToken}; twid=u%3D${userId}; des_opt_in=Y; ct0=${cookie_ct0}; daa=1; `,
          "Referer": `https://twitter.com/${userName}`,
          "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
      });
    ;

    const tweets = await response.json();
    const pinned = tweets.data.user.result.timeline_v2.timeline.instructions[1].entry;
    const entries = tweets.data.user.result.timeline_v2.timeline.instructions[2].entries;


    const pinnedData = await getTweetData(pinned, true);
    let pinnedGit = await git.repo.get('content/pinned/pinned.md');
    let newPinned = false;

    try{
        pinnedGit = JSON.parse(pinnedGit.body);
        let pinnedId;
        if(pinnedGit.content){
            pinnedId = Buffer.from(pinnedGit.content, 'base64').toString('utf8');
            pinnedId = pinnedId.slice(pinnedId.indexOf("id: ")+4,pinnedId.indexOf("media:"));
        }


        if(!pinnedData.exists && (pinnedGit.message || pinnedId*1!=pinnedData.id*1)){
            newPinned = true;
            await git.repo.put('content/pinned/pinned.md', `---\ntitle: \ndescription: >-\n ${pinnedData.description.replace(/\n/g,"\n  ")}\ndate: ${pinnedData.date}\nid: ${pinnedData.id}\nmedia: ${pinnedData.media}\n---`, {"message":"twitter webhook [skip ci]"});
        }
    }catch(e){
        console.log("pinned tweet error ",e.message);
    }

    let tweet, count=0;
    for(let i=0, z=entries.length; i<z; i++){
        if(!entries[i].content.itemContent){continue};

        tweet = await getTweetData(entries[i]);
        
        if(tweet.exists){
            break;
        }

        await git.repo.put(`content/tweets/${tweet.id}.md`, `---\ntitle: \ndescription: >-\n ${tweet.description.replace(/\n/g,"\n  ")}\ndate: ${tweet.date}\nid: ${tweet.id}\nmedia: ${tweet.media}\n---`, {"message":"twitter webhook [skip ci]"});
        count++;
    }

    return [count, newPinned];
}

/**
 * Lambda Handler
 */
exports.handler = async event => {
    if(!git){
      git = new utils.git(git_options);
    }

    const result = await fetchLatestTweets();

    if(result[0]>0 || result[1]){
        await utils.request({
          "host" : "api.netlify.com",
          'method': "POST",
          "path" : `/build_hooks/${process.env.WEBHOOK_ID}`
        });    
    }  

    return {
        statusCode: 200,
        body: "Pushed " + result[0] + " tweet/s" + (result[1] ? "\nNew pinned tweet" : "")
    }
}


async function test(){
    if(!git){
        git = new utils.git(git_options);
    }

    //await git.repo.del('content/pinned/pinned.md')
    //await git.repo.del('content/tweets/1656351393022607396.md')

    const result = await fetchLatestTweets();

    if(result[0]>0 || result[1]){
        await utils.request({
          "host" : "api.netlify.com",
          'method': "POST",
          "path" : `/build_hooks/${process.env.WEBHOOK_ID}`
        });    
    }  

    return {
        statusCode: 200,
        body: "Pushed " + result[0] + " tweet/s" + (result[1] ? "\nNew pinned tweet" : "")
    }
}

/*(async () => {
    console.log(await test());
})();*/
