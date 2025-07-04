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
  'Charlotte - Staging': 'https://civiform-staging.charlottenc.gov',
}

const help = {
  '!versions': 'Get the deployed CiviForm version for all known sites',
}

async function fetchWithRedirects(url, maxRedirects = 10) {
  let currentUrl = `${url}/programs` // Avoid having to follow redirects

  console.debug('Fetching', currentUrl)
  const res = await fetch(currentUrl, {
    jar: true,
    followAllRedirects: true,
    maxRedirects: 10,
  })
  return await res.text()
}

function extractShaFromHTML(html, url) {
  const $ = cheerio.load(html)
  const metaTag = $('meta[name="civiform-build-tag"]').attr('content')
  if (metaTag) {
    return metaTag.split('-')[1]
  } else {
    console.debug(
      `Could not find the civiform-build-tag in response from ${url} in the following HTML: `,
      html,
    )
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
            const sha = extractShaFromHTML(body, url)
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
