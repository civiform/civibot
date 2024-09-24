# civibot
Slack app for the CiviForm workspace. This is designed to be run in a specific EC2 instance.

## Setup
### Prerequisites
1. EC2 instance with Ubuntu 24.04 (probably works fine on others, but this is what it's using now).
2. Create a user called `civibot` with sudo access, using /bin/bash for the shell.
3. Install make, nodejs, npm, git, unzip.
4. Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
5. In IAM (not IAM Identity Center), create a `civibot` user. Create an access key for the user.
6. On the host, run `aws configure`, providing the access key and secret.
7. Requires `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `SLACK_APP_TOKEN` secrets in AWS Secrets Manager.
   a. Each secret should have the given name, and the actual key in the secret should also be the given name, with the value being the Slack secret value. It should also have a tag called `name` with the value being the secret name.
   b. Create a policy in AWS that allows the `secretsmanager:GetSecretValue` permission on the ARNs for the three secrets (note that the ARN looks like `arn:aws:secretsmanager:us-east-1:<account id>:secret:SLACK_BOT_TOKEN-<random string>` so you will probably want to use `SLACK_BOT_TOKEN-*` in the resource definition), as well as `secretsmanager:ListSecrets` for all resources (`"*"`).
   c. Apply the policy to the `civibot` user.
8. The civibot_github key should be in `/home/civibot/.ssh` with mode `0600`. You can get this key from Nick.
9. `/home/civibot/.ssh/config` should have the following contents:
```
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/civibot_github
  IdentitiesOnly yes
```

### Running
1. Clone the repo.
2. Run `make install`. This will install a service that runs the bot.
3. Tail the log in `/home/civibot/civibot/logs/civibot.log` to ensure there are no errors.

## Development
You can deploy a different branch of the civibot repo by using the `!deploy` command. You must be in either #civibot-admin or #civibot-test to do this, and must be on the list of CiviBot admins. If you get things stuck with the app unable to start on the new branch, contact Nick to SSH into the node and fix it (or do so yourself if you have the SSH key). There is also a `!restart` command in case things get weird, but it's still responding to commands.

Run `make fmt` to format your code before submitting a PR.

### Tips
* If you want to be able to have CiviBot respond in whatever context it was triggered in (channel, DM, thread), use `context.say` instead of just `say`. If you need to respond with custom blocks (see the xkcd script), use the regular `say`.
* Create a `help` hash that maps command names to help text. Then, export both this and a `setup` function that does the actual meat of the script. These two things are automatically loaded by the app.
