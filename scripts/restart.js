const exec = require('child_process').exec
const {ADMIN_ROOMS, ADMIN_USERS} = require('../utils/constants.js')

const help = {
  '!restart':
    'Restarts CiviBot. Only usable by CiviBot admins in the admin room.',
}

function restart() {
  console.log('Restarting CiviBot...')
  setTimeout(() => {
    exec(
      'sudo /bin/systemctl restart civibot.service',
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error restarting CiviBot: ${error}`)
          console.error(`Error stdout: ${stdout}`)
          console.error(`Error stderr: ${stderr}`)
          return
        }
        console.log(`CiviBot restarted successfully`)
      },
    )
  }, 2000)
}

module.exports = {
  help: help,
  setup: (app) => {
    app.message(/^!\s*restart$/, async ({message, context}) => {
      console.log(message)
      if (
        ADMIN_ROOMS.includes(message.channel) &&
        ADMIN_USERS.includes(message.user)
      ) {
        console.log(`Restart triggered by ${message.user}`)
        restart()
        await context.say('Restarting now...')
      }
    })
  },
}
