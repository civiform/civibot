const fs = require('fs')
const path = require('path')
const brainFile = path.join(__dirname, '../brain.json')

// Declare the brain object as a singleton
let brain = {}

module.exports = {loadBrain, saveBrain, getBrain}

// Load the brain state from disk and initialize top level
// keys if they don't exist.
function loadBrain() {
  try {
    if (fs.existsSync(brainFile)) {
      console.log('Loading brain from disk')
      const data = fs.readFileSync(brainFile, 'utf8')
      brain = JSON.parse(data)
    }
  } catch (error) {
    console.error(`Error loading brain. Using a new, empty brain. ${error}`)
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
