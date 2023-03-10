const puppeteer = require('puppeteer')
const util = require('util')
const request = require('request')
// const fs = require('fs')
const requestPromise = util.promisify(request) // https://stackoverflow.com/a/54667338/12412595

const secret = process.env.WEBHOOK_URL_LEPIN // set in pipeline variable
if (!secret) {
  console.log('private token (WEBHOOK_URL_LEPIN) is not exported yet to environment variables!')
  process.exit(1)
}

async function main() {
  const cookie = {
    name: 'aep_usuc_f',
    value: 'site=glo&c_tp=HUF&x_alimid=4432579547&ups_d=1|1|1|1&isb=y&ups_u_t=1691674248522&region=HU&b_locale=en_US&ae_u_p_s=2',
    domain: '.aliexpress.com',
    path: '/',
    httpOnly: true,
    secure: true
}
  const agentList = [
    // https://techblog.willshouse.com/2012/01/03/most-common-user-agents/
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.61 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.61 Safari/537.36'
  ]
  const realUserAgent = agentList[Math.floor(Math.random() * agentList.length)]
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--window-size=1400,900', '--single-process', '--no-zygote', '--no-sandbox']
  })
  const page = await browser.newPage()
  await page.setCookie(cookie)
  await page.setUserAgent(realUserAgent)
  await page.setGeolocation({ latitude: 47.4813602, longitude: 18.9902192 })

  // *********** Hogwarts
  const hogwarts = {
    id: '71043',
    name: 'Hogwarts Castle',
    keyword: 'school|castle',
    url: 'https://m.aliexpress.com/wholesale/71043.html?SearchText=71043&g=y&maxPrice=110000.0&maxprice=110000&minPrice=35000.0&minprice=35000&sorttype=price_asc&trafficChannel=seo&gatewayAdapt=Pc2Msite'
  }

  // ********** Star Wars
  const starWars = {
    id: '75252',
    name: 'Star Destroyer',
    keyword: 'destroyer',
    url: 'https://m.aliexpress.com/wholesale/75252.html?SearchText=75252&g=y&maxPrice=110000.0&maxprice=110000&minPrice=35000.0&minprice=35000&sorttype=price_asc&trafficChannel=seo&gatewayAdapt=Pc2Msite' 
  }
  // select the LEPIN set
  const target = starWars // hogwarts
  await page.goto(target.url)

  const cookies = await page.$('#gdpr-new-container')
  if (cookies !== null) await page.click('button[data-role="gdpr-accept"]')

  // scroll down a bit for more offers
  await page.evaluate(() => {
    const element = document.querySelector('._2_Bq1')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  })
  await new Promise(r => setTimeout(r, 3000))
  // zoom out to load all offers
  await page.evaluate(() => (document.body.style.zoom = 0.7))
  // create object
  const items = await page.evaluate(() => {
    const cards = document.querySelectorAll('a._1lP57._3FPIS')

    const items = Array.from(cards).map((el, i) => {
      const links = el
      const prices = el.querySelector('div.WvaUg')
      const titles = el.querySelector('h1.WccSj')
      const images = el.querySelector('img.product-img')
      const shipping = el.querySelector('div._1dbRT')
      const stores = el.querySelector('span[class*=store--]')
      const sold = el.querySelector('span._2PeJI')
      const rated = el.querySelector('span._3cSMn')

      return {
        _id: i + 1,
        link: links?.href?.replace(/\?.*/, ''),
        title: titles?.innerText,
        price: prices?.innerText,
        image: images?.src,
        shipping: shipping?.innerText ? shipping?.innerText.replace(/\+/, '') : 'n/a',
        store: stores?.innerText,
        sold: sold?.innerText ? sold?.innerText : 'n/a',
        rated: rated?.innerText ? rated?.innerText : 'n/a'
      }
    })
    return items
  })
  const filteredItems = items.filter(
    e =>
      e.title?.match(new RegExp(target.keyword, 'gi')) &&
      !e.title?.match(/led|light|super.star.destroyer/gi) &&
      parseInt(e.price?.replace(/^HUF|,/g, '')) < 111000
  )
  // console.log(filteredItems)

  await browser.close()

  const msg = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Today's cheapest prices for the ${target.name} set (${target.id})`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `you can browse them all <${target.url}|here>`
        }
      }
    ],
    fallback: 'This is a plain-text fallback for the message'
  }

  filteredItems.forEach(el => {
    msg.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${el.title}* _(from <${el.link}|this seller>)_ \n??? *price:* ${el.price} + ${el.shipping}\n??? *sold:* ${
          el.sold
        }\n??? *rated:* ${el.rated}${el.rated > 0 ? '???' : ''}`
      },
      accessory: {
        type: 'image',
        image_url: el.image ? el.image : 'https://i.etsystatic.com/13575415/r/il/94ee96/1210017425/il_570xN.1210017425_8pym.jpg',
        alt_text: el.title
      }
    })
  })

  console.log(JSON.stringify(msg))
  // fs.writeFileSync('msg_TEMP.json', JSON.stringify(msg))

  if (filteredItems.length < 1) console.log('nothing today')
  else {
    await requestPromise(
      {
        url: secret,
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(msg)
      },
      function (e, resp, body) {
        console.log('sendin...' + body)
        if (e) {
          console.error(e)
        }
      }
    )
  }
}

main()
