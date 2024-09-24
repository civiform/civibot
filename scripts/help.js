const fs = require('fs');
const path = require('path');

const help = {
  '!help': 'Show this message',
}

const scriptsDir = path.join(__dirname)

function getHelpMessages() {
  const helpMessages = {};

  const files = fs.readdirSync(scriptsDir);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const scriptModule = require(path.join(scriptsDir, file));
      if(scriptModule.help) {
        Object.assign(helpMessages, scriptModule.help)
      }
    }
  });
  return helpMessages;
}

module.exports = {
  help: help,
  setup: (app) => {
    app.message(/^!\s*help$/, async ({ context }) => {
      const helpMessages = getHelpMessages();
      const helpText = Object.keys(helpMessages).map(key => `${key}: ${helpMessages[key]}`).join('\n');
      await context.say(helpText);
    });
  }
}