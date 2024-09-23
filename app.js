const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
const { loadBrain } = require('./brain.js');
const { ADMIN_ROOMS } = require('./utils.js');

let secrets = {
  'SLACK_BOT_TOKEN': '',
  'SLACK_SIGNING_SECRET': '',
  'SLACK_APP_TOKEN': ''
}

async function loadAllSecrets() {
  const { SecretsManagerClient, ListSecretsCommand, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const secretsManager = new SecretsManagerClient({ region: 'us-east-1', profile: 'default' });
  const listResponse = await secretsManager.send(new ListSecretsCommand({}));
  const secretArns = listResponse.SecretList;
  const secretPromises = Object.keys(secrets).map(async (secret) => {
    const secretArn = secretArns.find(s => s.Tags.some(tag => tag.Key === 'name' && tag.Value === secret));
    if (!secretArn) {
      throw new Error(`Secret ${secret} not found`);
    }

    const value = await secretsManager.send(new GetSecretValueCommand({ SecretId: secretArn.ARN }));
    secrets[secret] = JSON.parse(value.SecretString)[secret];
    console.log(`Loaded secret ${secret}`);
  });
  await Promise.all(secretPromises);
}

async function startApp() {
  await loadAllSecrets();

  // Load the brain from disk on startup
  loadBrain();

  // Create the app
  const app = new App({
    token: secrets.SLACK_BOT_TOKEN,
    signingSecret: secrets.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: secrets.SLACK_APP_TOKEN,
    port: process.env.PORT || 30000
  });

  // Middleware to ensure we always provide thread_ts when it exists
  // so we respond in the appropriate way.
  app.use(async ({ message, context, say, next}) => {
    context.say = async (text) => {
      if(text) {
        await say({ text: text, thread_ts: message.thread_ts})
      }
    }
    await next();
  })

  // Load all users on startup, then listen for new user events
  //require('./users.js')(app);

  // Load scripts
  const scriptsPath = path.join(__dirname, 'scripts');
  fs.readdirSync(scriptsPath).forEach(file => {
    if (file.endsWith('.js')) {
      require(path.join(scriptsPath, file))(app);
    }
  });

  await app.start();

  for (const room of ADMIN_ROOMS) {
    await app.client.chat.postMessage({
      token: secrets.SLACK_BOT_TOKEN,
      channel: room,
      text: '⚡️ CiviBot is running!'
    });
  }
  console.log('⚡️ CiviBot is running!');
}

startApp().catch((error) => {
  console.error('Error:', error);
});