module.exports = (app) => {
  const { getBrain, saveBrain } = require('../brain.js');

  const brain = getBrain();

  function add(key, val) {
    if (brain.facts[key]) {
      return `${key} is already ${brain.facts[key]}`;
    } else {
      return set(key, val);
    }
  }

  function append(key, val) {
    if (brain.facts[key]) {
      brain.facts[key] += `, ${val}`;
      saveBrain();
      return `Alright, ${key} is also ${val}`;
    } else {
      return `No fact for ${key}. It can't also be ${val} if it isn't anything yet.`;
    }
  }

  function set(key, val) {
    brain.facts[key] = val;
    saveBrain();
    return `Alright, ${key} is ${val}`;
  }

  function del(key) {
    delete brain.facts[key];
    saveBrain();
    return `Alright, I have no idea what ${key} is now.`;
  }

  function get(key) {
    if (brain.facts[key]) {
      return brain.facts[key]
    } else {
      return `No fact for ${key}`;
    }
  }

  function random() {
    const keys = Object.keys(brain.facts);
    if (keys.length == 0) {
      return 'No facts yet';
    }
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return `${randomKey} is ${brain.facts[randomKey]}`;
  }

  function handle(text) {
    let match;
    if ((match = /^~(.+?) is also (.+)/i.exec(text))) {
      return append(match[1], match[2]);
    } else if ((match = /^~(.+?) is (.+)/i.exec(text))) {
      return add(match[1], match[2]);
    } else if ((match = /^~(.+)/i.exec(text))) {
      return get(match[1]);
    }
  }

  app.message(/^~(.+)/i, async ({ message, context }) => {
    await context.say(handle(message.text));
  });

  app.message(/^no, (.+) is (.+)/i, async ({ context }) => {
    await context.say(set(context.matches[1], context.matches[2]));
  });

  app.message(/^!facts? list/i, async ({ context }) => {
    const facts = Object.keys(brain.facts);
    if (facts.length == 0) {
      await context.say('No facts yet');
    } else {
      await context.say(`${facts.join('\n')}`);
    }
  });

  app.message(/^!facts? delete "(.*)"/i, async ({ context }) => {
    await context.say(del(context.matches[1]));
  });

  app.message(/^!facts? delete(.*)$/i, async ({ context }) => {
    await context.say(del(context.matches[1]));
  });

  app.message(/^!facts? random/i, async ({ context }) => {
    await context.say(random());
  });
}