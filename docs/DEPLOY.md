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

## The domain

`www.xigon1987.com` is registered at Namecheap and its nameservers are
Namecheap's own (`dns1/dns2.registrar-servers.com`), so the records are changed
in the Namecheap dashboard — nothing on this server can do it.

Two records, replacing whatever the parking page left behind:

| Type | Host | Value |
|---|---|---|
| A | `@` | `162.19.44.241` |
| A | `www` | `162.19.44.241` |

The nginx in front of this app is a container belonging to the ptc-bonus stack
and it also serves `ptc-bonus.com` and `ptc-hub.org`. **A broken vhost file
there does not break one site, it breaks three** — nginx refuses to start when
any `server` block names a certificate that does not exist. So the vhost goes
in twice, in this order, and `nginx -t` runs before every reload:

1. `deploy/nginx/xigon1987.conf` — plain HTTP. Installed already. This is what
   answers the moment DNS arrives, and it is what Let's Encrypt fetches its
   proof from.
2. `deploy/nginx/xigon1987-https.conf` — the real thing, installed **after**
   `certbot certonly` has succeeded. The commands are in the file's own header.

The app is a plain Node service on the host, so nginx reaches it through the
docker bridge gateway (`172.18.0.1:3060`) rather than by container name.

`X-Forwarded-Proto` matters more here than it looks: the app decides whether
its cookies may be marked `Secure` from that header, so behind the HTTPS block
the basket and the back-office session become `Secure` on their own, with no
setting to remember. See `src/server/cookie-security.ts`.

When the domain is live and HTTPS is on, close the bare port —
`ufw delete allow 3060/tcp` — so there is one way in and it is encrypted.

## What is still open

**There is no HTTPS yet**, because the certificate cannot be issued until the
domain resolves to this server. Until then the site answers on a bare port over
plain HTTP, the admin password travels in clear text, and every browser calls
it insecure. That is acceptable while this is something to look at; it is not
acceptable before it is shown to guests.

**Why not Vercel.** PGlite writes its database to disk. Vercel's filesystem is
read-only and each request may land on a different machine, so the site would
build, deploy, and then serve an empty menu with no reservations and no orders.
Moving there means replacing PGlite with a hosted Postgres first — not a
deployment setting.
