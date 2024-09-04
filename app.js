const {App} = require('@slack/bolt')
const fs = require('fs')
const path = require('path')
const {loadBrain} = require('./utils/brain.js')
const {ADMIN_ROOMS} = require('./utils/constants.js')
const process = require('process')
const {exec} = require('child_process')

let secrets = {
  SLACK_BOT_TOKEN: '',
  SLACK_SIGNING_SECRET: '',
  SLACK_APP_TOKEN: '',
}

// This is used to prevent querying for all users on startup,
// since doing this frequently during development will get
// you rate limited.
let SKIP_USER_LOAD = true

async function loadAllSecrets() {
  const {SecretsManagerClient, ListSecretsCommand, GetSecretValueCommand} =
    await import('@aws-sdk/client-secrets-manager')
  const secretsManager = new SecretsManagerClient({region: 'us-east-1'})
  const listResponse = await secretsManager.send(new ListSecretsCommand({}))
  const secretArns = listResponse.SecretList
  const secretPromises = Object.keys(secrets).map(async (secret) => {
    const secretArn = secretArns.find((s) =>
      s.Tags.some((tag) => tag.Key === 'name' && tag.Value === secret),
    )
    if (!secretArn) {
      throw new Error(`Secret ${secret} not found`)
    }

    const value = await secretsManager.send(
      new GetSecretValueCommand({SecretId: secretArn.ARN}),
    )
    secrets[secret] = JSON.parse(value.SecretString)[secret]
    console.log(`Loaded secret ${secret}`)
  })
  await Promise.all(secretPromises)
}

async function startApp() {
  await loadAllSecrets()

  // Load the brain from disk on startup
  loadBrain()

  // Create the app
  const app = new App({
    token: secrets.SLACK_BOT_TOKEN,
    signingSecret: secrets.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: secrets.SLACK_APP_TOKEN,
    port: process.env.PORT || 30000,
  })

  // Middleware to ensure we always provide thread_ts when it exists
  // so we respond in the appropriate way.
  app.use(async ({message, context, say, next}) => {
    context.say = async (text) => {
      if (text) {
        await say({text: text, thread_ts: message.thread_ts})
      }
    }
    await next()
  })

  // Load all users on startup, then listen for new user events
  if (!SKIP_USER_LOAD) {
    require('./utils/users.js')(app, secrets.SLACK_BOT_TOKEN)
  }

  // Load scripts
  const scriptsPath = path.join(__dirname, 'scripts')
  fs.readdirSync(scriptsPath).forEach((file) => {
    if (file.endsWith('.js')) {
      const scriptModule = require(path.join(scriptsPath, file))
      if (scriptModule.setup) {
        scriptModule.setup(app)
      }
    }
  })

  let rev
  exec('git rev-parse HEAD', (err, stdout) => {
    if (err) {
      console.error(`Error executing git rev-parse: ${err}`)
      rev = 'unknown'
    } else {
      rev = stdout.trim()
    }
  })

  await app.start()

  for (const room of ADMIN_ROOMS) {
    await app.client.chat.postMessage({
      token: secrets.SLACK_BOT_TOKEN,
      channel: room,
      text: '⚡️ CiviBot is running at revision ' + rev,
    })
  }
  console.log('⚡️ CiviBot is running at revision ' + rev)
}

startApp().catch((error) => {
  console.error('Error:', error)
})
