# CNFT Sales Twitter Bot
A Cardano NFT Twitter bot that monitors sales for a collection. It pulls and monitors data from [OpenCNFT](https://opencnft.io/) and posts any new sales on Twitter. The bot was created with Javascript + Node.js. It is very similar to a Python verison I built: [CNFT Sales Twitter Bot](https://github.com/OishiMula/cnft_twitter_bot). It should be fairly easy to tweak around in case anyone wishes to use it for their own project.<br>

# Requirements
* A [Twitter developer account](https://developer.twitter.com/) - Will require [Elevated Access](https://developer.twitter.com/en/portal/products/elevated) for full twitter functions.
* Javascript + Node.js
## Plugins
* twitter-api-v2 : Posting to Twitter
* dotenv : storing api keys
* cross-fetch : reliable fetch for Nodejs
* console-stamp : timestamping console.log messages
* sharp : resizing images too big for Twitter
* coingecko-api : convert $ADA to USD
