const fs = require('fs')
const path = require('path')
const brainFile = path.join(__dirname, 'brain.json')

// Declare the brain object as a singleton
let brain = {}

module.exports = {loadBrain, saveBrain, getBrain}

// Load the brain state from disk and initialize top level
// keys if they don't exist.
function loadBrain() {
  if (fs.existsSync(brainFile)) {
    const data = fs.readFileSync(brainFile, 'utf8')
    brain = JSON.parse(data)
  }
  brain.karma = brain.karma || {}
  brain.users = brain.users || {}
  brain.facts = brain.facts || {}
  return brain
}

function saveBrain() {
  fs.writeFileSync(brainFile, JSON.stringify(brain, null, 2), 'utf8')
}

function getBrain() {
  return brain
}
