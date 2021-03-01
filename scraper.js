const puppeteer = require('puppeteer');
const proxyChain = require('proxy-chain');
const fs = require("fs");

const logger = (func, msg) => {
    console.log(`${func}: ` + msg)
}
async function getHrefs(page, selector) {
    return await page.$$eval(selector, anchors => [].map.call(anchors, a => a.href));
}

function Scraper(bot) {
    this.pageNumber = 7
    this.movieNumber = 3
    this.qualities = []
    this.currentQality = 0
    this.movie = {qualities:[]}
    this.tries = 0
    this.bot = bot
}
Scraper.prototype.sendMessage = function(msg){    
    this.bot.telegram.sendMessage(-1001418299416,msg,{parse_mode:"HTML"}).catch()
}
Scraper.prototype.isAllowedQuality = function(size){
    let allowedSize = 1.9
    size = size.toLowerCase()
    if(size.includes('m')){
        return true
    }
    try{
        size = size.split('g')[0]
    }catch{
        return false;
    }
    if(size <= allowedSize){
        return true
    }
    return false;
}
Scraper.prototype.stop = function(){
    let quality = {name:'unknown'}
    try{
        quality = this.qualities[this.currentQality]
    }catch{}
    this.sendMessage(`Scraper stoped at ${this.movie.name} - ${quality.name}`)
    this.browser.close()
    this.browser = null
    this.page = null
}
Scraper.prototype.start = async function () {
    const oldProxyUrl = 'http://cubeecjo-dest:h078sbs3uj0u@193.8.56.119:9183';
    const newProxyUrl = await proxyChain.anonymizeProxy(oldProxyUrl);
    this.browser = await puppeteer.launch({
        headless: true,
        slowMo: 400,
        args: [`--proxy-server=${newProxyUrl}`],
        defaultViewport: null
    })
    this.page = (await this.browser.pages())[0];
    logger('start','Start.')
    await this.sendMessage(`Scraper started!`)
    this.clickMovie()
}

Scraper.prototype.closePageByIndex = async function (i) {
    try {
        let pages = await this.browserPages()
        pages[i].close()
    } catch (e) {
        logger('closePage', e)
    }
}
Scraper.prototype.closeAllEmptyPages = async function () {
    let pages = await this.browserPages()
    pages.map(page => {
        if (page.url() == 'about:blank') {
            page.close()
        }
    })
}
Scraper.prototype.browserPages = async function () {
    return await this.browser.pages()
}
Scraper.prototype.clickMovie = async function () {
    if(this.movie.qualities.length){
        const movies = require('./movies.json');
        let movie = {...this.movie}
        movies.push(movie)
        fs.writeFile('movies.json', JSON.stringify(movies,null, 4), (err, data) => {
            //handle result
            this.sendMessage(`Name: ${movie.name}\nQualities: ${movie.qualities.map(u=>u.name).join()}`)
            this.bot.telegram.sendDocument(566571423,{source:'./movies.json'})
            console.log('Movie added to file');
        });
    }

    this.resetInformation()
    this.movieNumber++;
    this.sendMessage(`Open page=${this.pageNumber}, movie=${this.movieNumber}`)
    logger('clickMovie',`Open page=${this.pageNumber}, movie=${this.movieNumber}`)
    await this.page.goto(`https://lake.egybest.kim/movies/?page=${this.pageNumber}`, { waitUntil: 'networkidle2', timeout:60000});
    await this.page.waitForSelector(`.movies a:nth-child(${this.movieNumber})`)
    let el = await this.page.$$(`.movies a:nth-child(${this.movieNumber})`)
    if (this.movieNumber >= 12) {
        this.pageNumber++
        this.movieNumber = 0;
    }
    this.onPageResponse()
    await el[0].click();
    await this.page.waitForNavigation()
    logger('clickMovie', 'Clicked')
    // await this.focus(1)//movies page
    
}
Scraper.prototype.goToDownloadPage = async function(){
    logger('goToDownloadPage','Go download page')
    let quality = this.qualities[this.currentQality]
    if(!this.isAllowedQuality(quality.size)){
        return this.isQualitiesDone()
    }
    logger('goToDownloadPage',quality.name)
    quality.a.click()

    const newPagePromise = new Promise(x => this.browser.once('targetcreated', target => x(target.page())));
    const page = await newPagePromise;
    this.tryToGetLink(page)
}

Scraper.prototype.getQualitiesUrls = async function () {
    if(!this.page.url().includes('/movie/')){
        return logger('getQualities','Not in correct page');
    }
    this.getMovieDetails(this.page)
    logger('getQualities','Getting qualities...')
    const qalitiesTableData = await this.page.evaluate(
        () => Array.from(
          document.querySelectorAll('table.dls_table tbody tr'),
          row => Array.from(row.querySelectorAll('td'), cell => cell.innerText)
        )
    );
    let aElements = (await this.page.$$('td.tar a.nop.btn.g.dl._open_window'))
    qalitiesTableData.map((row,i)=>{
        let quality = {}
        quality.name = row[1]
        quality.size = row[2]
        if(!this.isAllowedQuality(quality.size))return;
        quality.a = aElements[i]
        this.qualities.push(quality)
    })
    this.goToDownloadPage()
    // let a = (await this.page.$$('td.tar a.nop.btn.g.dl._open_window')).reverse();
    // a[0].click()
}

Scraper.prototype.closePage = async function (page) {
    try {
        page.close()
    } catch (e) {
        logger('Close page', 'Error')
    }
}

Scraper.prototype.onPageResponse = async function () {
    this.page.on('response', async r => {
        if (r.request().resourceType() === 'xhr') {
            if (r.request().url().includes('kim/api?call') && this.page.url().includes('/movie')) {
                this.page.removeAllListeners()
                logger('onPageResponse', r.status())
                if (r.status() == 200) {
                    await this.closePageByIndex(1)
                    logger('onResponse','Page closed')
                    return this.getQualitiesUrls();
                }
            }
        }
    });
}
Scraper.prototype.waitNavigation = async function (page) {
    let navi = await new Promise((resolve) => {
        page.waitForNavigation({ waitUntil: "networkidle0" }).then(async () => {
            resolve(true)
        }).catch(() => {
            resolve(false)
        })
    })
    return navi;
}
Scraper.prototype.tryToGetLink = async function (page) {
    logger('tryToGetLink','click download btn')
    await page.click('a.bigbutton._reload').then(async () => {
        this.waitNavigation(page).then((reloaded) => {
            logger('tryToGetLink','Reloaded page')
            this.getLink(page)
        })
        const newPagePromise = new Promise(x => this.browser.once('targetcreated', target => x(target.page())));
        const newPage = await newPagePromise;
        newPage.close()
        logger('tryToGetLink','Ad page closed')
    }).catch(() => {
        logger('tryToGetLink','Link alread exists')
        this.getLink(page)
    })
}


Scraper.prototype.getLink = async function (page) {
    let quality = this.qualities[this.currentQality]
    if(this.tries >= 5){
        logger('getLink',`failed to get link skipping...`)
        this.sendMessage(`!!Fails!!: ${this.movie.name} - ${quality.name}`)
        return this.isQualitiesDone()
    }
    if (await page.$('a.bigbutton._reload')) {
        logger('getLink', 'Try to get link again')
        this.tries++
        return this.tryToGetLink(page)
    }
    let href = await getHrefs(page, 'a.bigbutton')
    if (!href[0]) {
        this.tries++
        logger('getLink', 'No href, try to get link again')
        return this.tryToGetLink(page)
    }
    delete quality.a
    quality.link = href[0]
    this.movie.qualities.push(quality)
    await this.closePageByIndex(1)
    logger('getLink','download page closed')
    return this.isQualitiesDone()
}

Scraper.prototype.isQualitiesDone = function (){
    this.currentQality++
    if(this.qualities.length <= this.currentQality){
        logger('getLink','Get another movie')
        return this.clickMovie()
    }
    return this.goToDownloadPage()
}

Scraper.prototype.getMovieDetails = async function(page){
    const name = await page.$eval('div.movie_title h1 span', el => el.innerText);
    let year =  await page.$eval('div.movie_title h1 a', el => el.innerText);
    let thumbnail = await this.page.$eval('div.movie_cover .movie_img a img',(el)=>el.getAttribute('src'));
    let story = await this.page.$eval('div#mainLoad div div.mbox:nth-child(5) div.pda:nth-child(2)',(el)=>el.innerText);
    this.movie = {
        ...this.movie,
        name,
        year,
        thumbnail,
        story
    }
    let detailsData = await this.page.evaluate(
        () => Array.from(
          document.querySelectorAll('table.movieTable tbody tr'),
          row => Array.from(row.querySelectorAll('td:not(.movie_title)'), cell => cell.innerText)
        )
    );
    let requiredOptions = ["اللغة","النوع","المدة"]
    detailsData = detailsData.filter(rows=>rows.length && requiredOptions.some((key)=>rows[0].includes(key)))
    try{
        this.movie.lang = detailsData[0][1].split('•')[0]
    }catch{}
    try{
        this.movie.country = detailsData[0][1].split('•')[1]
    }catch{}
    try{
        this.movie.sections = detailsData[1][1].split('•')
    }catch{}
    try{
        this.movie.duration = detailsData[2][1]
    }catch{}

    console.log(this.movie);
}

Scraper.prototype.resetInformation = function(){
    this.currentQality = 0
    this.qualities = []
    this.tries = 0
    this.movie = {qualities:[]}
}

module.exports = Scraper
