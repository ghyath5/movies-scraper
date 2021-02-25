const puppeteer = require('puppeteer');
const express = require('express');
const { Telegraf } = require('telegraf')
const bot = new Telegraf('1534366649:AAG_c3BLUk2fyQSyS-t3vKrDTdbnO2MozpY', { webhookReply: false});
const app = express()
bot.use((ctx,next)=>{
  next()
})
//
let url = 'https://a3-wh4-cere.vidstream.to/dl/e54b02e7c24fd9acMr4dWWFBu7takI0JT.71KMzP8uXRaU1xgnAmhMMQ__.QVIrYzd1dzNabXJ5aFAwUW1ORXN5NWpINVk4RVhCTFhTdjRVa0dXVE5XY3B2SzBDQjZCUWRBblV3WU1QMzFNbHVESkZ2ZmM3VWMyRm1YY1hwT3c2ZUhSbllUVGgrd1BseU1SNkQ4MmdyM2FLekw3TDBUaG1RdHcxSUprdUxkNjgzTUQ0V1FuVU1LRG1ndG9BRlBYcXRUL0Z3VGp5aVhwa3BhbXY5eUxYRWdWZDN3enhRWnUxdDk1QmUvTzJET0FTVy9NclpiRG9CZUpWM1QrWUFaUThiMWhWenJIYWoybnBIU1RBeXFSQnZFQi9yaFBhbkFrdnNZT25BbDc4MlB5Z1lqQ1U2U1ZBOURyZkY3OE1QNHNaaE0rNGExVTRuMktjQUpVNU5ja0FSNEpiMDdOVWNUck0zWFY5SDJHOGJlUSsrb1FSUDE2U09XZFN4TUtja1dzRXFYVlBwRkM0RkowbGFObWhpSVRDd3Z0bmtYSWlrNnpnaVBqZ2pzNE1BTXVOR3YvZHdDZ1VMbHd2VHFSRG9rY1NYVXVyWUFqcGxyV1c5cE5oUTdLQ2tqaU5LaytyZTZnNm5LTT0_'
const https = require('https'); // or 'https' for https:// URLs
const fs = require('fs');



bot.start((ctx) => {
  https.get(url, function(response) {
    console.log('sfsf');
    // file.on('finish', function() {
      // console.log('fi');
      bot.telegram.sendPhoto('@hakina_watch',{source:response}).catch((e)=>{
        console.log(e);
      })
    // });
  });
  ctx.reply('done')
})

bot.launch()

// (async () => {
//   const browser = await puppeteer.launch({headless:false});
//   const page = await browser.newPage();
// //   await page.goto('https://tellonym.me/Sarahaheurope', {waitUntil: 'networkidle2'});
//   await page.goto('https://tellonym.me/daher410');
//   await page.waitForSelector('textarea[name="tell"]');
//   await page.focus('textarea[name="tell"]')
//   await page.keyboard.type('test54',{delay:1000})  
//   await page.click('button[type="submit"]');

// //   await browser.close();
// })();