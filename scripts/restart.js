const exec = require('child_process').exec;
const { ADMIN_ROOMS } = require('../utils.js');

function restart() {
  console.log('Restarting CiviBot...');
  setTimeout(() => {
    exec('sudo /bin/systemctl restart civibot.service', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error restarting CiviBot: ${error}`);
        return;
      }
      console.log(`CiviBot restarted successfully`);
    });
  }, 2000);
}

module.exports = (app) => {
  app.message(/^!\s*restart$/, async ({ message, context }) => {
    console.log(message);
    if(ADMIN_ROOMS.includes(message.channel)) {
      console.log(`Restart triggered by ${message.user}`);
      restart();
      await context.say("Restarting now...");
    }
  });
}