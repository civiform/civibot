const url = 'https://xkcd.com'

const help = {
  '!xkcd': 'Get the latest xkcd comic',
  '!xkcd random': 'Get a random xkcd comic',
  '!xkcd <number>': 'Get a specific xkcd comic',
}

module.exports = {
  help: help,
  setup: (app) => {
    async function sendComic(say, data) {
      await say({
        text: `*${data.safe_title}* - ${data.alt}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${data.safe_title}*`,
            },
          },
          {
            type: 'image',
            image_url: data.img,
            alt_text: data.alt,
          },
        ],
      })
    }

    app.message(/^!\s*xkcd\s*$/i, async ({say}) => {
      const response = await fetch(`${url}/info.0.json`)
      const data = await response.json()
      sendComic(say, data)
    })

    app.message(/^!\s*xkcd\s*random$/i, async ({say}) => {
      let response = await fetch(`${url}/info.0.json`)
      let data = await response.json()
      const randNum = Math.floor(Math.random() * data.num)
      response = await fetch(`${url}/${randNum}/info.0.json`)
      data = await response.json()
      sendComic(say, data)
    })

    app.message(/^!\s*xkcd\s*(\d+)$/i, async ({context, say}) => {
      const num = context.matches[1]
      const response = await fetch(`${url}/${num}/info.0.json`)
      if (response.status === 404) {
        await say(`No comic with number ${num} found.`)
      } else {
        const data = await response.json()
        sendComic(say, data)
      }
    })
  },
}
