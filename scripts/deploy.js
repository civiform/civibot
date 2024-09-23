const { exec } = require('child_process');

admins = [
  'nick.burgan',
]

function pullCode(user, branch) {
  return new Promise((resolve, reject) => {
    if (branch != 'main' && admins.indexOf(user) == -1) {
      reject('You can only pull from the main branch');
    }
    exec(`git fetch origin && git checkout origin/${branch}`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}
module.exports = (app) => {

}