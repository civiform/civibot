#!/bin/bash

PATH=/bin:/usr/bin:/sbin:/usr/sbin
CIVIBOT_LOCATION=/home/civibot/civibot
BACKUP_LOCATION=/home/civibot/brain_backups
suffix=$(date +%F-%s)
mkdir -p ${BACKUP_LOCATION}
chown -R civibot:civibot ${BACKUP_LOCATION}
filename="${BACKUP_LOCATION}/brain-${suffix}.json"
cp ${CIVIBOT_LOCATION}/brain.json "$filename"
if [ -f "$filename" ]; then
  gzip -f "$filename"
else
  echo "$filename does not exist."
fi
find ${BACKUP_LOCATION} -mtime +7 -exec rm -f {} \;