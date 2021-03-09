const puppeteer = require('puppeteer');
const proxyChain = require('proxy-chain');
const fs = require("fs");
const { default: axios } = require('axios');

const logger = (func, msg) => {
    // console.log(`${func}: ` + msg)
}
async function getHrefs(page, selector) {
    return await page.$$eval(selector, anchors => [].map.call(anchors, a => a.href));
}
async function waitFor(ms){
    return await new Promise((r)=>setTimeout(()=>{r(true)},ms))
}

function Scraper(bot) {
    this.pageNumber = Number(process.env.START_PAGE_NUMBER || 1)
    this.movieNumber = Number(process.env.START_MOVIE_NUMBER || 0)
    this.endPageNumber = Number(process.env.STOP_PAGE_NUMBER || 5)
    this.qualities = []
    this.currentQality = 0
    this.movie = {qualities:[]}
    this.tries = 0
    this.bot = bot
    this.moviesTries = 0
}

Scraper.prototype.createFolder = async function(name){
    let url = encodeURI(`https://api.streamtape.com/file/createfolder?login=2ce3ffb7dc5959747b73&key=JA6ePMldPzujMMW&name=${name}`)
    axios.post(url).then(({data})=>{
        if(data.result.folderid){
            console.log('Folder created successfully!');
            this.movie.folderid = data.result.folderid
        }else{
            console.log('Create folder fails');
            this.sendMessage(`uploding fails ${this.pageNumber} - ${this.movieNumber} - ${name}`)
            this.bot.telegram.sendMessage(566571423,'X Scraper stoped because of failing with uploading X')
            return this.stop()
        }
    }).catch((e)=>{
        console.log('Create folder fails');
        this.sendMessage(`uploding fails ${this.pageNumber} - ${this.movieNumber} - ${name}`)
        this.bot.telegram.sendMessage(566571423,'X Scraper stoped because of failing with uploading X')
        return this.stop()
    })
}

Scraper.prototype.sendMessage = function(msg){    
    this.bot.telegram.sendMessage(-1001418299416,msg,{parse_mode:"HTML"}).catch()
}
Scraper.prototype.isAllowedQuality = function(size){
    let allowedSize = 4
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
    this.browser.close()
    this.browser = null
    this.page = null
}
Scraper.prototype.start = async function () {
    const oldProxyUrl = process.env.PROXY || 'http://gdatvjla-dest:6hyymmxz5rky@45.136.228.154:6209';
    const newProxyUrl = await proxyChain.anonymizeProxy(oldProxyUrl);
    this.browser = await puppeteer.launch({
        headless: true,
        slowMo: 300,
        args: [`--proxy-server=${newProxyUrl}`,'--no-sandbox', '--disable-setuid-sandbox'],
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
    if( this.pageNumber>this.endPageNumber){
        this.stop()
        return this.sendMessage(`Instance Done!!!!`)
    }
    if(this.movie.qualities.length){
        const movies = require('./movies.json');
        let movie = {...this.movie}
        movies.push(movie)
        fs.writeFile('./movies.json', JSON.stringify(movies,null, 4), (err, data) => {
            //handle result
            this.sendMessage(`Name: ${movie.name}\nQualities: ${movie.qualities.map(u=>u.name).join()}`)
            this.bot.telegram.sendMessage(566571423,movie.name)
            this.bot.telegram.sendDocument(566571423,{source:'./movies.json'})
            console.log('Movie added to file');
        });
    }

    this.resetInformation()
    this.movieNumber++;
    if(this.movieNumber <= 0){
        this.pageNumber--
        this.movieNumber = 12
    }
    if(this.moviesTries >= 3){
        this.moviesTries = 0
        if (this.movieNumber >= 12) {
            this.pageNumber++
            this.movieNumber = 0;
        }
        this.movieNumber++
    }
    await waitFor(1000)
    logger('clickMovie',`Open page=${this.pageNumber}, movie=${this.movieNumber}`)
    await this.page.goto(`https://lake.egybest.kim/movies/?page=${this.pageNumber}`, { waitUntil: 'networkidle2', timeout:60000});
    this.sendMessage(`Open page=${this.pageNumber}, movie=${this.movieNumber}`)
    let stop = false
    await this.page.waitForSelector(`.movies a:nth-child(${this.movieNumber})`).catch(async ()=>{
        stop = true;
        await waitFor(8000)
        this.moviesTries++
        this.movieNumber--
        this.clickMovie()
    })
    if(stop)return;
    let el = await this.page.$$(`.movies a:nth-child(${this.movieNumber})`)
    if (this.movieNumber >= 12) {
        this.pageNumber++
        this.movieNumber = 0;
    }
    await el[0].click();
    await this.page.waitForNavigation()
    logger('clickMovie', 'Clicked')
    this.onPageResponse()
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
        logger('getQualities','Not in correct page');
        this.movieNumber--
        this.moviesTries++
        return this.clickMovie()
    }
    this.page.waitForSelector('td.tar a.nop.btn.g.dl._open_window',{timeout:30000}).then(async ()=>{
        await this.getMovieDetails(this.page)
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
    })
    .catch(async ()=>{
        this.resetInformation()
        this.movieNumber--
        this.moviesTries++
        return this.clickMovie()
    })
    
}

Scraper.prototype.closePage = async function (page) {
    try {
        page.close()
    } catch (e) {
        logger('Close page', 'Error')
    }
}

Scraper.prototype.onPageResponse = async function () {
    await waitFor(1800)
    await this.closePageByIndex(1)
    logger('onResponse','Page closed')
    return this.getQualitiesUrls();
    // let timeout = setTimeout(async ()=>{
    //     await this.closePageByIndex(1)
    //     logger('onResponse','Page closed')
    //     return this.getQualitiesUrls();
    // },15000)
    // this.page.on('response', async r => {
    //     if (r.request().resourceType() === 'xhr') {
    //         console.log('Response!!!!!!!!!!!!!!!!!!!!!!!!');
    //         this.page.removeAllListeners()
    //         if (r.request().url().includes('kim/api?call') && this.page.url().includes('/movie')) {
    //             logger('onPageResponse', r.status())
    //             if (r.status() == 200) {
    //                 clearTimeout(timeout)
    //                 await this.closePageByIndex(1)
    //                 logger('onResponse','Page closed')
    //                 return this.getQualitiesUrls();
    //             }
    //         }
    //     }
    // });
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
        this.resetInformation()
        this.movieNumber--
        this.moviesTries++
        return this.clickMovie()
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
    let qname = `${this.movie.name}-${quality.name.trim().replace(/ /g,'-')}`
    let upUrl = encodeURI(`https://api.streamtape.com/remotedl/add?login=2ce3ffb7dc5959747b73&key=JA6ePMldPzujMMW&url=${href[0]}&name=${qname}`)
    let {data} = await axios.post(upUrl)
    if(data.result){
        quality.vid = data.result.id
    }else{
        this.sendMessage(`uploding fails ${this.pageNumber} - ${this.movieNumber} - ${qname}`)
        quality.fails = '!Fails!'
    }
    this.movie.qualities.push(quality)
    await this.closePageByIndex(1)
    logger('getLink','download page closed')
    return this.isQualitiesDone()
}

Scraper.prototype.isQualitiesDone = async function (){
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
    // this.createFolder(name)
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
}

Scraper.prototype.resetInformation = function(){
    this.currentQality = 0
    this.qualities = []
    this.tries = 0
    this.movie = {qualities:[]}
}

module.exports = Scraper
