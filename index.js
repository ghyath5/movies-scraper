// const axios = require('axios').default
// const cheerio = require('cheerio');

// (async ()=>{
//     let response = await axios.get(
//         'https://lake.egybest.kim/vs-mirror/vidstream.to/f/1NCaUqUQjA/?vclid=a231e7f5977cefb3aa7eaf133e250a9e7d7277700c2e801834e57d4cLoooVxuEoVoHoVKzberdTppVpACecoGopMsoVHVoVuItoVoHoVshDpxCXpSWrVHVoVLGpbVoHoVPWekbppWRgZWWdWgeipMwoWWoVog&r',
//         {
//             headers:{
//                 cookie:`__cfduid=d34b0c5cacceb97cd693831bc8d48dc711614433181; PSSID=IjifUip0UuSsYNL4fLR8ld3Lohx6zerGcavEuRWb8UUhqRdBMqZGAyZ-hr9lckWmxaJsXQcJIjRb10YLBcTxSxAUJpLA6NeRwnnc-1BdBcbMnUZdUDNiOm0acTUt5rJe; 43b0db32=VcccSuBjcScKcSYWrmPHqVsHKCkyUYKEHWsSKScSOzNflsScKqYPqYKqKqqqqqAHqIScSjBrbcScKcSHqRlCcRmdWpVqcScP-a09ce34b6bd50c127691ebcfc75bb5ab; JS_TIMEZONE_OFFSET=-7200; _ga=GA1.1.417954390.1614433185; EGUDI=HSNkYS6P3n6K8lD3.86c732861c65ec1a4a868d96d6af32c269324d982e9941958b568abf2be0bf3880e6003bdc2aa7a3d9de913b97de126f3084c3e7981ea3ff4bc0d4b90979ff22; push_subscribed=ignore; _ga_MF39N897MZ=GS1.1.1614433184.1.1.1614433448.0`
//             }
//         }
//         )
//     console.log(response.data);
//     const $ = cheerio.load(response.data);
// })()



const path = require('path')
const { Client } = require('tdlnode')

const api_id = '3904871'
const api_hash = 'fd4e636c6897359730914e1cf812eda2'
const phone_number = '+18136464274' // or const token = 'your token'

const configuration = {
    path_to_binary_file: path.resolve(__dirname, './lib/libtdjson'),
    database_directory: path.resolve(__dirname, './storage'),
    files_directory: path.resolve(__dirname, './downloads'),
    log_file_path: path.resolve(__dirname, './logs/tdl.log'),
}

const up = async () => {
    const client = new Client({ api_id, api_hash, phone_number }, configuration)

    await client.init()

    const chats = await client.fetch({
        '@type': 'getChats',
        'offset_order': '9223372036854775807',
        'offset_chat_id': 0,
        'limit': 100,
    })

    console.log(chats)

    client.stop()
}

up()