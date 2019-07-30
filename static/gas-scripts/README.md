# How to get tweets from Static Site

Old days I had a GAS script to get tweets and cache them, but performance of Google Apps Script has decreased over time. 

Now, I execute every 15 minutes the same "caching" process but I put the tweets in a Spreadsheet (instead of get them from GAS -cached-) that I consume from Static Site with an URL like this:

https://spreadsheets.google.com/feeds/cells/1xRcpFi4tL-mKvM4pJUbnQAQ0z3z4AED9lBVqMZKHeZ0/default/public/basic?alt=json-in-script&callback=jQuery1113033528633264362084_1564489616282&_=1564489616283