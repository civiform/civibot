const fs = require('fs');
const path = require('path');
const brainFile = path.join(__dirname, 'brain.json');

module.exports = { loadBrain, saveBrain };

function loadBrain() {
  let b = {};
  if (fs.existsSync(brainFile)) {
    const data = fs.readFileSync(brainFile, 'utf8');
    b = JSON.parse(data);
  }
  b.karma = b.karma || {};
  b.users = b.users || {};
  return b;
}

function saveBrain() {
  fs.writeFileSync(brainFile, JSON.stringify(brain, null, 2), 'utf8');
}