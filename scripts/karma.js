const help = {
  '!karma <subject>': 'Get the karma for <subject>',
  '<subject>++':
    'Add karma to <subject>. Can enclose in () for a subject with spaces. Can use @ to mention a user.',
  '<subject>--':
    'Subtract karma from <subject>. Can enclose in () for a subject with spaces. Can use @ to mention a user.',
  '!karma top': 'Get the top 5 karma subjects',
  '!karma bottom': 'Get the bottom 5 karma subjects',
  '!karma clear <subject>':
    "Clear karma for <subject>. You can't do this to a user.",
  '!karma set <amount> <subject>':
    'Set karma for <subject> to <amount>. Can use @ to mention a user. Only usable by admins in the admin room.',
}

module.exports = {
  help: help,
  setup: (app) => {
    const {getBrain, saveBrain} = require('../utils/brain.js')
    const {ADMIN_ROOMS, ADMIN_USERS} = require('../utils/constants.js')

    const brain = getBrain()

    const IGNORELIST = [/^(lib)?stdc$/, /-{2,}/, /^[rwx-]+$/, /```/]

    const ADD_RESPONSES = [
      'gets a point!',
      'gained some karma!',
      'karma +1!',
      'is even more awesome!',
    ]

    const SUBTRACT_RESPONSES = [
      'lost a point.',
      'lost some karma.',
      'karma -1.',
      'is less awesome.',
    ]

    const SELF_RESPONSES = [
      'Sorry, no cheating %name!',
      'Nice try %name, but no.',
      "You can't give karma to yourself %name.",
    ]

    function addResponse() {
      return ADD_RESPONSES[Math.floor(Math.random() * ADD_RESPONSES.length)]
    }

    function subtractResponse() {
      return SUBTRACT_RESPONSES[
        Math.floor(Math.random() * SUBTRACT_RESPONSES.length)
      ]
    }

    function selfResponse(name) {
      return SELF_RESPONSES[
        Math.floor(Math.random() * SELF_RESPONSES.length)
      ].replace('%name', name)
    }

    function getUser(id) {
      if (!id) {
        return null
      }
      if (brain.users[id]) {
        return brain.users[id].name
      } else {
        return null
      }
    }

    function userNameExists(name) {
      name = name.toLowerCase()
      for (const [id, user] of Object.entries(brain.users)) {
        if (user.name.toLowerCase() == name) {
          return id
        }
      }
      return null
    }

    function getKarma(subject) {
      return brain.karma ? brain.karma[subject] || 0 : 0
    }

    function addKarma(subject) {
      brain.karma[subject] = getKarma(subject) + 1
      saveBrain()
    }

    function subtractKarma(subject) {
      brain.karma[subject] = getKarma(subject) - 1
      saveBrain()
    }

    function clearKarma(subject) {
      delete brain.karma[subject]
      saveBrain()
    }

    function cheatKarma(subject, amount) {
      brain.karma[subject] = Number(amount)
      saveBrain()
    }

    function sortKarma() {
      const karmaEntries = Object.entries(brain.karma)
      return karmaEntries.sort((a, b) => b[1] - a[1])
    }

    function top(n = 5) {
      return sortKarma().slice(0, n)
    }

    function bottom(n = 5) {
      return sortKarma().slice(-n).reverse()
    }

    function selfKarma(user, subject) {
      return (
        subject == user ||
        (brain.users[user] && brain.users[user].name == subject)
      )
    }

    function filtered(subject) {
      return IGNORELIST.some((regex) => subject.match(regex))
    }

    async function changeKarma(message, matches, increment) {
      let unique = new Set()
      let messages = []
      for (const match of matches) {
        let subject = match.toLowerCase().trim()
        if (unique.has(subject)) {
          continue
        }
        unique.add(subject)
        if (filtered(subject)) {
          continue
        }
        if (selfKarma(message.user, subject)) {
          messages.push(selfResponse(subject).replace('%name', subject))
          continue
        }
        if (increment) {
          addKarma(subject)
          messages.push(
            `${subject} ${addResponse()} (Karma: ${getKarma(subject)})`,
          )
        } else {
          subtractKarma(subject)
          messages.push(
            `${subject} ${subtractResponse()} (Karma: ${getKarma(subject)})`,
          )
        }
      }
      return messages.join('\n')
    }

    app.message(/(\S|\s)(--|\+\+)(\s|$)/, async ({message, context}) => {
      let plus_matches = []
      // Group 4 is @name followed by a space
      // Group 5 is word not followed by a space, :, or +
      // Group 6 is word or words in parentheses
      // Group 7 is emojis
      // Group 8 is space, delimiter for other scripts, or EOL
      const plus_matcher = new RegExp(
        '(' +
          '(' +
          '(' +
          '<@(\\S+[^+:\\s])>\\s' +
          '|(\\S+[^+:\\s])' +
          '|\\(([^\\(\\)]+\\W[^\\(\\)]+)\\)' +
          '|(:[^:\\s]+:)\\s?' +
          ')' +
          '\\+\\+' +
          '(\\s|[!-~]|$)' +
          ')' +
          ')',
        'g',
      )
      let matches = message.text.matchAll(plus_matcher)
      for (const match of matches) {
        plus_matches.push(
          ...[getUser(match[4]), match[5], match[6], match[7]].filter(Boolean),
        )
      }
      let result = await changeKarma(message, plus_matches, true)
      if (result && result.trim()) {
        await context.say(result)
      }

      let minus_matches = []
      const minus_matcher = new RegExp(
        '(' +
          '(' +
          '(' +
          '<@(\\S+[^+:\\s])>\\s' +
          '|(\\S+[^+:\\s])' +
          '|\\(([^\\(\\)]+\\W[^\\(\\)]+)\\)' +
          '|(:[^:\\s]+:)\\s?' +
          ')' +
          '--' +
          '(\\s|[!-~]|$)' +
          ')' +
          ')',
        'g',
      )
      matches = message.text.matchAll(minus_matcher)
      for (const match of matches) {
        minus_matches.push(
          ...[match[4], match[5], match[6], match[7]].filter(Boolean),
        )
      }
      result = await changeKarma(message, minus_matches, false)
      if (result && result.trim()) {
        await context.say(result)
      }
    })

    app.message(/^!\s*karma\s?(top|best)?$/i, async ({context}) => {
      let messages = ['The Most Karmically Awesome']
      let top_karma = top(5)
      let rank = 1
      for (const [subject, karma] of top_karma) {
        messages.push(`${rank}. ${subject}: ${karma}`)
        rank++
      }
      await context.say(messages.join('\n'))
    })

    app.message(/^!\s*karma (bottom|worst)$/i, async ({context}) => {
      let messages = ['The Most Karmically Challenged']
      let top_karma = bottom(5)
      let rank = 1
      for (const [subject, karma] of top_karma) {
        messages.push(`${rank}. ${subject}: ${karma}`)
        rank++
      }
      await context.say(messages.join('\n'))
    })

    app.message(/^!\s*karma (clear|reset) ([\s\S]+)$/, async ({context}) => {
      let subject = context.matches[2].trim()
      if (subject.match(/^<@(\S+)>$/) || userNameExists(subject)) {
        await context.say("You can't clear a person's karma. Don't be mean!")
      } else {
        subject = subject.toLowerCase()
        let prevKarma = getKarma(subject)
        clearKarma(subject)
        await context.say(
          `All ${prevKarma} of ${subject}'s karma has evaporated into nothingness.`,
        )
      }
    })

    app.message(/^!\s*karma set (\d+) (.+)$/, async ({message, context}) => {
      if (
        ADMIN_ROOMS.includes(message.channel) &&
        ADMIN_USERS.includes(message.user)
      ) {
        let karma = context.matches[1]
        let subject = context.matches[2].trim()
        let userMatch = subject.match(/<@(\S+)>/)
        if (userMatch) {
          subject = getUser(userMatch[1])
        } else {
          subject = subject.toLowerCase()
        }
        let prevKarma = getKarma(subject)
        cheatKarma(subject, karma)
        await context.say(
          `${subject}'s karma has been set to ${karma} (was ${prevKarma})`,
        )
      }
    })

    app.message(
      /^!\s*karma\s+(?!set|clear|reset|top|best|bottom|worst\b)(.+)$/i,
      async ({context}) => {
        let subject = context.matches[1].trim()
        let userMatch = subject.match(/<@(\S+)>/)
        if (userMatch) {
          subject = getUser(userMatch[1])
        } else {
          subject = subject.toLowerCase()
        }
        if (subject in brain.karma) {
          await context.say(`Karma for ${subject}: ${getKarma(subject)}`)
        } else {
          await context.say(`No karma for ${subject}`)
        }
      },
    )
  },
}
