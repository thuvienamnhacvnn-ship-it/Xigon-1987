# Deploy

The app runs on the PTC VPS (`162.19.44.241`) as a plain Node service under
systemd — deliberately not in Docker. That box already runs four Docker stacks
belonging to other projects, and a stray `docker compose ... --remove-orphans`
there has come close to deleting a service outside the repo that issued it.
A systemd unit touches none of that.

- **Address:** http://162.19.44.241:3060
- **Directory:** `/opt/xigon1987`
- **Service:** `xigon1987.service`
- **Log:** `/var/log/xigon1987.log`
- **Database:** PGlite, in `/opt/xigon1987/.data/pg`

## Updating

```sh
ssh root@162.19.44.241
cd /opt/xigon1987
systemctl stop xigon1987     # PGlite holds the data directory; one writer only
git pull
npm ci
npm run db:migrate           # only when drizzle/ has new files
npm run build
systemctl start xigon1987
```

The stop is not optional. PGlite lets exactly one process open the data
directory, so a migration run while the service is up fails — and a build that
reads the database would be reading it from under the running site.

## First time on a new machine

Node 22 is installed from the official tarball rather than a distribution
package: Ubuntu 24.04 ships Node 18, which Next 16 refuses.

```sh
cd /tmp
curl -sL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep linux-x64.tar.xz
curl -fsSLO https://nodejs.org/dist/latest-v22.x/node-v22.X.Y-linux-x64.tar.xz
sha256sum -c -                      # against the line printed above
tar -xJf node-v22.X.Y-linux-x64.tar.xz -C /usr/local --strip-components=1

git clone https://github.com/thuvienamnhacvnn-ship-it/Xigon-1987.git /opt/xigon1987
cd /opt/xigon1987
npm ci
npm run db:migrate && npm run db:seed
npm run build
```

`.env.production` is **not** in the repo and has to be written by hand, mode
600:

```
XIGON_ADMIN_PASSWORD=…
NODE_ENV=production
```

Without the booking-platform secrets (`QUANDOO_WEBHOOK_SECRET`,
`THEFORK_WEBHOOK_SECRET`, `IMPORT_WEBHOOK_SECRET`) those endpoints answer 503
and store nothing, which is the honest state until a platform is actually
connected.

Then the unit at `/etc/systemd/system/xigon1987.service`, and
`ufw allow 3060/tcp`.

## What is still open

**There is no HTTPS.** The site answers on a bare port over plain HTTP, so the
admin password travels in clear text and every browser will call it insecure.
That is acceptable while this is something to look at; it is not acceptable
before it is shown to guests. Both are fixed by the same step: point a domain
at the box, add a vhost beside the ones in
`/opt/ptc-bonus/PTC-Loyalty/docker/nginx/conf.d/`, and take a certificate.

**Why not Vercel.** PGlite writes its database to disk. Vercel's filesystem is
read-only and each request may land on a different machine, so the site would
build, deploy, and then serve an empty menu with no reservations and no orders.
Moving there means replacing PGlite with a hosted Postgres first — not a
deployment setting.
