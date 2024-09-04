module.exports = (app, brain) => {
  const { saveBrain } = require('../brain.js');

  ignorelist = [
    /^(lib)?stdc$/,
    /-{2,}/,
    /^[rwx-]+$/,
    /```/,
  ]

  ADD_RESPONSES = [
    "gets a point!", "gained some karma!", "karma +1!", "is even more awesome!"
  ]

  SUBTRACT_RESPONSES = [
    "lost a point.", "lost some karma.", "karma -1.", "is less awesome."
  ]

  SELF_RESPONSES = [
    "Sorry, no cheating %name!", "Nice try %name, but no.", "You can't give karma to yourself %name."
  ]

  function addResponse() {
    return ADD_RESPONSES[Math.floor(Math.random() * ADD_RESPONSES.length)];
  }

  function subtractResponse() {
    return SUBTRACT_RESPONSES[Math.floor(Math.random() * SUBTRACT_RESPONSES.length)];
  }

  function selfResponse(name) {
    return SELF_RESPONSES[Math.floor(Math.random() * SELF_RESPONSES.length)].replace('%name', name);
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
    name = name.toLowerCase();
    for (const [id, user] of Object.entries(brain.users)) {
      if (user.name.toLowerCase() == name) {
        return id
      }
    }
    return null
  }

  function getKarma(subject) {
    return brain.karma ? brain.karma[subject] || 0 : 0;
  }

  function addKarma(subject) {
    brain.karma[subject] = getKarma(subject) + 1;
    saveBrain();
  }

  function subtractKarma(subject) {
    brain.karma[subject] = getKarma(subject) - 1;
    saveBrain();
  }

  function clearKarma(subject) {
    delete brain.karma[subject];
    saveBrain();
  }

  function cheatKarma(subject, amount) {
    brain.karma[subject] = amount;
    saveBrain();
  }

  function sortKarma() {
    const karmaEntries = Object.entries(brain.karma);
    return karmaEntries.sort((a, b) => b[1] - a[1]);
  }

  function top(n = 5){
    return sortKarma().slice(0, n);
  }

  function bottom(n = 5){
    return sortKarma().slice(-n).reverse();
  }

  function selfKarma(user, subject) {
    return false
    //return subject == user || (brain.users[user] &&  brain.users[user].name == subject)
  }

  function filtered(subject) {
    return ignorelist.some((regex) => subject.match(regex));
  }

  async function changeKarma(message, matches, increment) {
    unique = new Set();
    messages = [];
    for (const match of matches) {
      subject = match.toLowerCase().trim();
      if (unique.has(subject)) {
        continue;
      }
      unique.add(subject);
      if (filtered(subject)) {
        continue;
      }
      if (selfKarma(message.user, subject)) {
        messages.push(selfResponse(subject).replace('%name', subject));
        continue;
      }
      if (increment) {
        addKarma(subject);
        messages.push(`${subject} ${addResponse()} (Karma: ${getKarma(subject)})`);
      } else {
        subtractKarma(subject);
        messages.push(`${subject} ${subtractResponse()} (Karma: ${getKarma(subject)})`);
      }
    }
    return messages.join('\n');
  }

  app.message(/(\S|\s)(--|\+\+)(\s|$)/, async ({ message, say }) => {
    plus_matches = []
    // Group 4 is @name followed by a space
    // Group 5 is word not followed by a space, :, or +
    // Group 6 is word or words in parentheses
    // Group 7 is emojis
    // Group 8 is space, delimiter for other scripts, or EOL
    plus_matcher = new RegExp(
    "(" +
      "(" +
        "(" +
          "<@(\\S+[^+:\\s])>\\s" +
          "|(\\S+[^+:\\s])" +
          "|\\(([^\\(\\)]+\\W[^\\(\\)]+)\\)" +
          "|(:[^:\\s]+:)\\s?" +
        ")" +
        "\\+\\+" +
        "(\\s|[!-~]|$)" +
      ")" +
    ")", 'g');
    matches = message.text.matchAll(plus_matcher);
    for (const match of matches) {
      plus_matches.push(...[getUser(match[4]), match[5], match[6], match[7]].filter(Boolean));
    }
    result = await changeKarma(message, plus_matches, true);
    if (result && result.trim()) {
      await say(result);
    }

    minus_matches = []
    minus_matcher = new RegExp(
      "(" +
        "(" +
          "(" +
            "<@(\\S+[^+:\\s])>\\s" +
            "|(\\S+[^+:\\s])" +
            "|\\(([^\\(\\)]+\\W[^\\(\\)]+)\\)" +
            "|(:[^:\\s]+:)\\s?" +
          ")" +
          "--" +
          "(\\s|[!-~]|$)" +
        ")" +
      ")", 'g');
    matches = message.text.matchAll(minus_matcher);
    for (const match of matches) {
      minus_matches.push(...[match[4], match[5], match[6], match[7]].filter(Boolean));
    }
    result = await changeKarma(message, minus_matches, false);
    if (result && result.trim()) {
      await say(result);
    }
  });

  app.message(/^!\s*karma\s?(top|best)?$/i, async ({ say }) => {
    messages = ['The Most Karmically Awesome'];
    top_karma = top(5);
    let rank = 1;
    for (const [subject, karma] of top_karma) {
      messages.push(`${rank}. ${subject}: ${karma}`);
      rank++;
    }
    await say(messages.join('\n'));
  });

  app.message(/^!\s*karma (bottom|worst)$/i, async ({say }) => {
    messages = ['The Most Karmically Challenged'];
    top_karma = bottom(5);
    let rank = 1;
    for (const [subject, karma] of top_karma) {
      messages.push(`${rank}. ${subject}: ${karma}`);
      rank++;
    }
    await say(messages.join('\n'));
  });

  app.message(/^!\s*karma (clear|reset) ([\s\S]+)$/, async ({ context, message, say }) => {
    subject = context.matches[2].trim();
    if (subject.match(/^<@(\S+)>$/) || userNameExists(subject)) {
      await say("You can't clear a person's karma. Don't be mean!");
    } else {
      subject = subject.toLowerCase();
      let prevKarma = getKarma(subject);
      clearKarma(subject);
      await say(`All ${prevKarma} of ${subject}'s karma has evaporated into nothingness.`);
    }
  });

  app.message(/^!\s*karma (.+)$/i, async ({ context, message, say }) => {
    subject = context.matches[1].trim();
    userMatch = subject.match(/<@(\S+)>/);
    if (userMatch) {
      subject = getUser(userMatch[1]);
    } else {
      subject = subject.toLowerCase();
    }
    if (subject in brain.karma) {
      await say(`Karma for ${subject}: ${getKarma(subject)}`);
    } else {
      await say(`No karma for ${subject}`);
    }
  });
}