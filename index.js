/* Twitter Sales Bot
Created by Oishi Mula, 5/1/2022 */

// Add required libs
require('console-stamp')(console, {format: ':date(mm/dd/yyyy hh:MM:ss TT)',});
const { TwitterApi } = require('twitter-api-v2');
const fetch = require('cross-fetch');
const fs = require('fs');
const CoinGecko = require('coingecko-api');
const CoinGeckoClient = new CoinGecko();
const sharp = require('sharp');

// Load .env file for creds
require('dotenv').config();

// Initialise Twitter client
const client = new TwitterApi({
  appKey: `${process.env.consumer_key}`,
  appSecret: `${process.env.consumer_secret}`,
  accessToken: `${process.env.access_token}`,
  accessSecret: `${process.env.access_token_secret}`,
});

// Local file saved regarding last sale tweeted
const FILEPATH = 'lastPosted.txt';

// Functions
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function download(url, type) {
  let retry = 0;
  for (;;) {
    try {
      const response = await fetch(url);
      if (retry > 0) console.log('Retry successful');
      switch (type) {
        case 'sale':
          return await response.json();
        case 'image':
          return await response.buffer();
        default:
          return console.error('Error with download!');
      }
    } catch (error) {
      console.error(`Error: ${error.name} -- Retrying`);
      retry += 1;
      await delay(5000);
    }
  }
}

async function writeRecentlyPosted(data) {
  fs.writeFileSync(FILEPATH, JSON.stringify(data), (err) => {
    if (err) console.log(err);
  });
}

function setPage(pn) {
  const pageNum = pn;
  return `https://api.opencnft.io/1/policy/${process.env.project}/transactions?page=${pageNum}&order=date`;
}

async function postTweet(asset) {
  // Setting up vars from current asset
  const assetName = asset.unit_name;
  const soldPrice = Number(asset.price / 1000000);
  const mp = asset.marketplace;

  // Setting up an image download from the ipfs protocol
  const assetImgRaw = asset.thumbnail.thumbnail.slice(7);
  const ipfsBase = 'https://infura-ipfs.io/ipfs/';

  // Retrieve $ADA price vs USD at the time of sale
  const cgData = await CoinGeckoClient.simple.price({
    ids: 'cardano',
    vs_currencies: 'usd',
  });
  const adaUSD = (Number(cgData.data.cardano.usd) * soldPrice).toFixed(2);

  // Setting up message and uploading image for Twitter
  const msg = `${assetName} was purchased from ${mp} for the price of ₳${soldPrice} ($${adaUSD}).`;
  const assetImage = await download(`${ipfsBase}${assetImgRaw}`, 'image');
  let mediaId;
  let newTweet;

  // Resizing in case asset image has a big file size
  try {
    mediaId = await client.v1.uploadMedia(Buffer.from(assetImage), { mimeType: 'image.png' });
  } catch (error) {
    console.error('Asset Image too big - Resizing & Reuploading');
    const assetImageRs = await sharp(assetImage)
      .resize(1000, 1000)
      .toBuffer();
    mediaId = await client.v1.uploadMedia(Buffer.from(assetImageRs), { mimeType: 'image.png' });
  }

  // Posting Tweet, retrying on any errors
  for (;;) {
    try {
      newTweet = await client.v1.tweet(msg, { media_ids: mediaId });
      break;
    } catch (error) {
      console.error(`Error: ${error.name} -- Retrying`);
      await delay(5000);
    }
  }
  console.log(`Tweeted: ${assetName} - ₳${soldPrice}($${adaUSD}) | Tweet ID: ${newTweet.id_str}`);
}

async function main() {
  // Loading program for the first time
  // .env var holds the project PolicyID
  console.log(`Starting the ${process.env.project_name} Sales Twitter bot`);
  let pageNum = 1;
  let opencnftApi = `https://api.opencnft.io/1/policy/${process.env.project}/transactions?page=${pageNum}&order=date`;

  // If file not found, will create a file with the most recent sale
  if (!fs.existsSync(FILEPATH)) {
    console.log('File not Found! Creating lastPosted');
    const dataFirstLoad = await download(opencnftApi, 'sale');
    writeRecentlyPosted(dataFirstLoad.items[0]);
  }

  // Beginning the monitor
  for (;;) {
    // Load file holding last tweeted sale
    const lastPosted = JSON.parse(fs.readFileSync(FILEPATH, 'utf8'));
    let currentSales = await download(opencnftApi, 'sale');

    // Setting up variables to check recently sold
    let num = 0;
    pageNum = 1;
    const fileDate = Number(lastPosted.sold_at);

    for (;;) {
      const salesDate = Number(currentSales.items[num].sold_at);
      // compare dates
      if (salesDate > fileDate) {
        num += 1;
        if (num === 20) {
          num = 0;
          pageNum += 1;
          opencnftApi = setPage(pageNum);
          currentSales = await download(opencnftApi, 'sale');
        }
      } else if (num > 0) {
        while (num > 0 || pageNum > 1) {
          num -= 1;
          await postTweet(currentSales.items[num]);
          if (num === 0 && pageNum > 1) {
            pageNum -= 1;
            num = 20;
            opencnftApi = setPage(pageNum);
            currentSales = await download(opencnftApi, 'sale');
          }
          await delay(500);
        }
        writeRecentlyPosted(currentSales.items[num]);
        break;
      } else break;
    }
    await delay(5000);
  }
}

main();
