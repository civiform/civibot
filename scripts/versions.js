const cheerio = require('cheerio')
const {exec} = require('child_process')

const urls = {
  'Seattle - Prod': 'https://civiform.seattle.gov',
  'Seattle - Staging': 'https://civiformstage.seattle.gov',
  'Seattle - Test': 'https://civiformtest.seattle.gov',
  'Bloomington - Prod': 'https://civiform.bloomington.in.gov',
  'Arkansas - Prod': 'https://myarciviform.arkansas.gov',
  'Arkansas - Staging': 'https://civiform-staging.ar.gov',
  'Charlotte - Prod': 'https://civiform.charlottenc.gov',
}

const help = {
  '!versions': 'Get the deployed CiviForm version for all known sites',
}

async function fetchWithRedirects(url, maxRedirects = 10) {
  let currentUrl = url
  let cookies = ''
  let redirectCount = 0

  while (redirectCount < maxRedirects) {
    console.debug('Fetching', currentUrl)
    const res = await fetch(currentUrl, {
      headers: {
        Cookie: cookies,
      },
      redirect: 'manual',
    })

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const setCookies = []
      res.headers.forEach((value, name) => {
        if (name.toLowerCase() === 'set-cookie') {
          setCookies.push(value)
        }
      })
      if (setCookies.length > 0) {
        cookies = mergeCookies(cookies, setCookies)
      }

      currentUrl = new URL(res.headers.get('location'), currentUrl).href
      redirectCount++
    } else {
      return await res.text()
    }
  }
  throw new Error('Too many redirects')
}

function mergeCookies(existingCookies, setCookieHeaders) {
  const cookieMap = {}
  existingCookies.split('; ').forEach((cookie) => {
    const [name, value] = cookie.split('=')
    if (name && value) cookieMap[name] = value
  })
  setCookieHeaders.forEach((cookie) => {
    const [cookiePart] = cookie.split(';')
    const [name, value] = cookiePart.split('=')
    if (name && value) cookieMap[name] = value
  })
  return Object.entries(cookieMap)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

function extractShaFromHTML(html) {
  const $ = cheerio.load(html)
  const metaTag = $('meta[name="civiform-build-tag"]').attr('content')
  if (metaTag) {
    return metaTag.split('-')[1]
  }
}

async function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error running ${command}: ${stderr || error.message}`)
      } else {
        resolve(stdout.trim())
      }
    })
  })
}

module.exports = {
  help: help,
  setup: (app) => {
    app.message(/^!\s*versions$/i, async ({context}) => {
      await execCommand(
        'test -d civiform || git clone git@github.com:civiform/civiform',
      )
      await execCommand('cd civiform && git fetch --tags')
      const fetchVersions = await Promise.all(
        Object.entries(urls).map(async ([site, url]) => {
          // Once everyone is on a version where the home page doesn't need
          // a cookie, we can get rid of the cookie part.
          try {
            const body = await fetchWithRedirects(url)
            const sha = extractShaFromHTML(body)
            if (sha) {
              const v = await execCommand(`cd civiform && git describe ${sha}`)
              return `${site}: ${v}`
            } else {
              return `${site}: Version not found`
            }
          } catch (error) {
            return `${site}: Error fetching version (${error.message})`
          }
        }),
      )
      await context.say(fetchVersions.join('\n'))
    })
  },
}
