import { google } from 'googleapis'
import dotenv from 'dotenv'
import Koa from 'koa'
import koaCash from 'koa-cash';
import TTLCache from '@isaacs/ttlcache';

dotenv.config()

var client = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  Buffer.from(process.env.GOOGLE_PRIVATE_KEY, 'base64').toString('utf-8'),
  ['https://www.googleapis.com/auth/spreadsheets'],
  null,
  process.env.GOOGLE_PRIVATE_KEY_ID
)
await client.authorize()
var service = google.sheets({
  version: 'v4',
  auth: client,
})

const getValue = async (cell) => {
  return (await service.spreadsheets.values.get({
    spreadsheetId: "1jzCZQFueFo6hHRZ0apPrc8InIHZhSnJaFTxuVqVIvn0",
    range: cell,
  })).data.values[0][0]
}

const getLatestOffering = async () => {
  return await getValue('Reminders!B8')
}

const getPreacher = async () => {
  return await getValue('Reminders!B3')
}

const time = 30 * 60 * 1000
const cache = new TTLCache({ttl: time})
const app = new Koa()

app.use(koaCash({
  maxAge: time,
  get: (key) => cache.get(key),
  set: (key, value) => cache.set(key, value)
}))

app.use(async (ctx) => {
  if (ctx.path === '/favicon.ico') {
    ctx.status = 204
    return
  }

  ctx.set('Access-Control-Allow-Origin', '*')
  
  if (ctx.request.query.type !== 'refresh' && await ctx.cashed()) return;

  if (ctx.path == '/api/preacher') {
    ctx.body = await getPreacher() || "Unknown"
    return
  }
  
  ctx.type = 'application/rss+xml'
  ctx.body = `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>Wollongong Seventh-day Adventist Church</title><link>https://www.illawarraadventist.org/</link><description>Wollongong Seventh-day Adventist Church</description><item><title>${await getLatestOffering() || "Unknown"}</title><link>https://www.illawarraadventist.org/</link><description></description></item></channel></rss>`
})

app.listen(3100, ()=>{console.log('Server running on port 3100 (inside the container)')});
