const {getBrain, saveBrain} = require('./brain.js')

const brain = getBrain()

module.exports = (app, token) => {
  loadUsers(app, token)
}

async function loadUsers(app, token) {
  try {
    const now = new Date()
    if (brain.users_last_updated) {
      const last_updated = new Date(brain.users_last_updated)
      const diff = now.getTime() - last_updated.getTime()
      const diffSec = diff / 1000
      if (diffSec < 60) {
        console.log(
          'Skipping user load, last full user list update less than 60 seconds ago',
        )
        return
      }
    }
    const result = await app.client.users.list({
      token: token,
    })

    result.members.forEach((user) => {
      if (!user.is_bot && !user.deleted) {
        brain.users[user.id] = {
          name: user.name,
          real_name: user.profile.real_name,
          display_name: user.profile.display_name,
        }
      }
    })

    console.log('Saving current Slack workspace users to brain')
    brain.users_last_updated = now.toISOString()
    saveBrain()
  } catch (error) {
    console.error('Error fetching users:', error)
  }

  app.event('team_join', async ({event}) => {
    try {
      console.log(`New user joined: ${event.user.id}`)
      brain.users[event.user.id] = {
        name: event.user.name,
        real_name: event.user.profile.real_name,
        display_name: event.user.profile.display_name,
      }
      saveBrain()
    } catch (error) {
      console.error('Error saving user to brain:', error)
    }
  })
}
