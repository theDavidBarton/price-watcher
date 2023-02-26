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
  await page.setUserAgent(realUserAgent)

  // *********** Hogwarts
  const hogwarts = {
    id: '71043',
    name: 'Hogwarts Castle',
    keyword: 'school|castle',
    url: 'https://www.aliexpress.com/af/71043.html?SearchText=71043&maxPrice=110000.0&minPrice=45000.0&sortType=price_asc'
  }

  // ********** Star Wars
  const starWars = {
    id: '75252',
    name: 'Star Destroyer',
    keyword: 'destroyer',
    url: 'https://www.aliexpress.com/af/75252.html?SearchText=75252&sortType=price_asc&minPrice=35000&maxPrice=110000'
  }
  // select the LEPIN set
  const target = starWars // hogwarts
  await page.goto(target.url)

  const cookies = await page.$('#gdpr-new-container')
  if (cookies !== null) await page.click('button[data-role="gdpr-accept"]')
  // Click on the country/region selector
  let screenBase64
  try {
    await page.click('#switcher-info')
    await page.waitForSelector('.switcher-shipto .country-selector')
    new Promise(r => setTimeout(r, 1000))
    await page.screenshot({ path: __dirname + '/screen.png' })
    screenBase64 = fs.readFileSync(__dirname + '/screen.png', 'base64')
    await page.click('.switcher-shipto .country-selector')
    await page.click('.address-select-content li[data-name="Hungary"]')
    await page.click('button[data-role="save"]')
    await page.waitForNavigation()
  } catch (e) {
    console.log(screenBase64)
  }

  // scroll down a bit for more offers
  await page.evaluate(() => {
    const element = document.querySelector('div[class*=list--gallery]')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  })
  new Promise(r => setTimeout(r, 6000))
  // zoom out to load all offers
  await page.evaluate(() => (document.body.style.zoom = 0.7))
  // create object
  const items = await page.evaluate(() => {
    const cards = document.querySelectorAll('a[class*=manhattan--container]')

    const items = Array.from(cards).map((el, i) => {
      const links = el
      const prices = el.querySelector('div[class*=price--]')
      const images = el.querySelector('img[class*=img--]')
      const shipping = el.querySelector('div[class*=topList--]')
      const stores = el.querySelector('span[class*=store--]')
      const sold = el.querySelector('span[class*=trade--]')
      const rated = el.querySelector('span[class*=evaluation--]')

      return {
        _id: i + 1,
        link: links.href.replace(/\?.*/, ''),
        title: images?.src
          .split('/')[5]
          .replace(/-/g, ' ')
          .replace(/\.jpg.*/, ''),
        price: prices.innerText,
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
    e => e.image?.match(new RegExp(target.keyword, 'gi')) && !e.image?.match(/led|light|super.star.destroyer/gi)
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
        text: `*${el.title}* _(from <${el.link}|${el.store}>)_ \n• *price:* ${el.price} + ${el.shipping}\n• *sold:* ${
          el.sold
        }\n• *rated:* ${el.rated}${el.rated > 0 ? '★' : ''}`
      },
      accessory: {
        type: 'image',
        image_url: el.image,
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
