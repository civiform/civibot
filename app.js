const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
const { loadBrain, saveBrain } = require('./brain.js');

brain = loadBrain();
module.exports = { brain };

// Create the app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 30000
});

// On startup, load all current users into the brain
async function loadUsers() {
  try {
    const result = await app.client.users.list({
      token: process.env.SLACK_BOT_TOKEN
    });

    result.members.forEach(user => {
      if (!user.is_bot && !user.deleted) {
        brain.users[user.id] = {
          name: user.name,
          real_name: user.profile.real_name,
          display_name: user.profile.display_name,
        };
      }
    });
    console.log('Saving current Slack workspace users to brain');
    saveBrain();
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}
loadUsers();

// Load scripts
const scriptsPath = path.join(__dirname, 'scripts');
fs.readdirSync(scriptsPath).forEach(file => {
  if (file.endsWith('.js')) {
    require(path.join(scriptsPath, file))(app, brain);
  }
});

// Start the app
(async () => {
  // Start your app
  await app.start();

  console.log('⚡️ CiviBot is running!');
})();