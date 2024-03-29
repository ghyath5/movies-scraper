require('dotenv').config()
const { Telegraf } = require('telegraf');
// const express = require('express');
let bot = new Telegraf(process.env.BOT_TOKEN)
bot.launch()
// const app = express()

// app.get('/getfile',(req,res)=>{
// 	if(!req.query || req.query.pass !== 'lilili123')return res.send(false);
// 	res.sendFile(__dirname+'/movies.json')
// })

const Scraper = require('./scraper');
let scraper;

bot.command('starts', (ctx) => {
	if (ctx.from.id != 566571423) return;
	scraper = new Scraper(bot)
	scraper.start()
	ctx.reply('Started')
})

bot.command('stop', (ctx) => {
	if (ctx.from.id != 566571423) return;
	scraper.stop()
	ctx.reply('stopped')
})
bot.command('getfile', (ctx) => {
	if (ctx.from.id != 566571423) return;
	ctx.replyWithDocument({ source: './movies.json' })
})

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))