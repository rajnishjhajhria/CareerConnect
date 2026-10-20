#!/usr/bin/env bash
# CareerConnect — idempotent MongoDB bootstrap (sandbox-resets can wipe /tmp AND
# ~/.cache; the workspace code survives, so recovery is scripted instead of manual).
# Run from anywhere:  bash backend/scripts/start-mongo.sh   (or: npm run mongo)
# • already listening?            → exit 0
# • mongod binary missing?        → download the 7.0.14 tarball, extract only bin/mongod
# • otherwise                     → start mongod (dbpath ~/.cache/mongodb/data — outside
#                                    the workspace snapshot on purpose: a live WiredTiger
#                                    dir is churn, not content; the SEED script is the
#                                    reproducible source of truth for the demo data)
set -e
MONGO_HOME="$HOME/.cache/mongodb"
BIN="$MONGO_HOME/bin/mongod"
DATA="$MONGO_HOME/data"

if (exec 3<>/dev/tcp/127.0.0.1/27017) 2>/dev/null; then
  echo "mongod already listening on 27017 — nothing to do"
  exit 0
fi

if [ ! -x "$BIN" ]; then
  echo "mongod not installed here — fetching 7.0.14 (~120 MB compressed, one time)…"
  TMP="$(mktemp -d)"
  curl -sL -o "$TMP/mongo.tgz" https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.14.tgz
  mkdir -p "$MONGO_HOME/bin"
  tar -xzf "$TMP/mongo.tgz" -C "$TMP" --wildcards '*/bin/mongod'
  mv "$TMP"/mongodb-*/bin/mongod "$BIN"
  rm -rf "$TMP"
fi

mkdir -p "$DATA"
nohup "$BIN" --dbpath "$DATA" --bind_ip 127.0.0.1 --port 27017 > "$MONGO_HOME/mongod.out" 2>&1 &

for _ in $(seq 1 30); do
  if (exec 3<>/dev/tcp/127.0.0.1/27017) 2>/dev/null; then
    echo "mongod is up on 27017"
    exit 0
  fi
  sleep 1
done
echo "mongod did not come up — check $MONGO_HOME/mongod.out" >&2
exit 1
