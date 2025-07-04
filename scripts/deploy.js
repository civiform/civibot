const {exec} = require('child_process')
const {
  ADMIN_ROOMS,
  ADMIN_USERS,
  CIVIBOT_GIT_HOME,
} = require('../utils/constants.js')

const help = {
  '!deploy <ref>':
    'Deploys CiviBot onto a new revision, either a SHA or a branch. Only usable by CiviBot admins in the admin room.',
  '!deploy latest':
    'Deploys CiviBot onto the latest revision on main. Only usable by CiviBot admins in the admin room.',
}

function execWithLog(command, callback) {
  console.log(`Executing ${command}`)
  exec(command, (error, stdout, stderr) => {
    if (stdout) {
      console.log(`STDOUT\n${stdout}`)
    }
    if (stderr) {
      console.log(`STDERR\n${stderr}`)
    }
    callback(error, stdout, stderr)
  })
}

function gitRevParse(rev, context, callback) {
  execWithLog(
    `cd ${CIVIBOT_GIT_HOME} && /usr/bin/git rev-parse ${rev}`,
    (error, stdout) => {
      if (error) {
        console.log(`git rev-parse ${rev} failed: ${error}`)
        context.say(`git rev-parse ${rev} failed: ${error}`)
      } else {
        if (callback) {
          callback(stdout.trim())
        }
      }
    },
  )
}

function gitFetch(context, callback) {
  execWithLog(
    `cd ${CIVIBOT_GIT_HOME} && /usr/bin/git fetch origin`,
    (error) => {
      if (error) {
        console.log(`git fetch origin failed: ${error}`)
        context.say(`git fetch origin failed: ${error}`)
      } else {
        if (callback) {
          callback()
        }
      }
    },
  )
}

function gitCheckout(rev, context, callback) {
  execWithLog(
    `cd ${CIVIBOT_GIT_HOME} && /usr/bin/git stash clear && /usr/bin/git stash && /usr/bin/git checkout ${rev}`,
    (error) => {
      if (error) {
        console.log(`git checkout ${rev} failed: ${error}`)
        context.say(`git checkout ${rev} failed: ${error}`)
      } else {
        if (callback) {
          callback()
        }
      }
    },
  )
}

function gitLog(parent, child, context, callback) {
  execWithLog(
    `cd ${CIVIBOT_GIT_HOME} && /usr/bin/git log --no-merges --pretty=format:'%h %s - %an' ${parent}..${child}`,
    (error, stdout) => {
      if (error) {
        console.log(`git log ${parent}..${child} failed: ${error}`)
        context.say(`git log ${parent}..${child} failed: ${error}`)
      } else {
        let output = stdout.trim()
        let logs = []
        if (output) {
          logs = output.split('\n')
        }
        if (callback) {
          callback(logs)
        }
      }
    },
  )
}

function install(context, callback) {
  execWithLog(`make install`, (error) => {
    if (error) {
      console.log(`Make failed: ${error}`)
      context.say(`Make failed: ${error}`)
    } else {
      if (callback) {
        callback()
      }
    }
  })
}

function deploy(rev, force, context) {
  // This is a little awkward to read, but it allows the process to stop if
  // any of the commands fail without having to wrap every command with its
  // own error handling.
  gitRevParse('HEAD', context, (head_rev) => {
    gitFetch(context, () => {
      gitRevParse(rev, context, (parsed_rev) => {
        if (head_rev === parsed_rev) {
          if (force) {
            context.say(
              `I think I'm already running ${rev}, but I'll deploy it anyway.`,
            )
          } else {
            context.say(
              `I think I'm already running ${rev}, so I'm not deploying it again.`,
            )
            return
          }
        } else {
          context.say(
            `Upgrading from revision ${head_rev} to revision ${parsed_rev}`,
          )
        }
        gitLog(head_rev, parsed_rev, context, (commits) => {
          if (commits.length > 0) {
            let m = commits.join('\n')
            if (commits.length > 5) {
              m += `\n..and ${commits.length - 5} more`
            }
            context.say(m)
          }
        })
        gitCheckout(parsed_rev, context, () => {
          install(context, () => {
            context.say(`Successfully deployed revision ${parsed_rev}!`)
          })
        })
      })
    })
  })
}

function normalizeRev(rev) {
  const shaRegex = /^[0-9a-f]{7,40}$/i
  if (shaRegex.test(rev)) {
    return rev
  }
  return `origin/${rev}`
}

module.exports = {
  help: help,
  setup: (app) => {
    app.message(/^!deploy (\S+)( force)?$/, ({message, context}) => {
      if (
        ADMIN_ROOMS.includes(message.channel) &&
        ADMIN_USERS.includes(message.user)
      ) {
        let rev = context.matches[1]
        let force = context.matches[2]
        if (rev === 'latest') {
          rev = 'origin/main'
        }
        // Only support deploying a branch from origin for now
        rev = normalizeRev(rev)
        deploy(rev, force, context)
      }
    })
  },
}
