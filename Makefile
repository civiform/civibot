SHELL:=/bin/bash
PATH:=node_modules/.bin:$(PATH)

SYSCONFDIR=$(PREFIX)/etc
VARDIR=$(PREFIX)/var
INITDIR=$(SYSCONFDIR)/systemd/system
CIVIBOTDIR=/home/civibot/civibot
LOGDIR=/home/civibot/civibot_logs
BACKUPDIR=/home/civibot/brain_backups
INSTALL=/bin/install -p

all: lint test

node_modules:
	test -d node_modules || npm install

install:
	npm ci
	# Remove any cruft not stored in git
	# git clean -d -f
	sudo mkdir -p $(LOGDIR) $(BACKUPDIR) $(SYSCONFDIR)/civibot $(INITDIR) $(SYSCONFDIR)/logrotate.d $(SYSCONFDIR)/cron.hourly
	sudo chown civibot:civibot $(LOGDIR)
	sudo chown civibot:civibot $(BACKUPDIR)
	sudo /bin/cp -p $(CIVIBOTDIR)/contrib/civibot.service $(INITDIR)
	sudo /bin/systemctl daemon-reload
	sudo /bin/cp -sf $(CIVIBOTDIR)/contrib/civibot.logrotate $(SYSCONFDIR)/logrotate.d
	sudo /bin/cp -sf $(CIVIBOTDIR)/contrib/backup-brain.sh $(SYSCONFDIR)/cron.hourly
	sudo /bin/systemctl enable civibot.service
	sudo /bin/systemctl restart civibot.service

restart:
	sudo /bin/systemctl restart civibot.service

.PHONY: list
list:
	@$(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$'

clean:
	clear