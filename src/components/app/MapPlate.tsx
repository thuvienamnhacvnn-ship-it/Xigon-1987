import styles from './MapPlate.module.css';
import map from '../../../public/img/map/contact.json';
import { RESTAURANT } from '@/lib/restaurant';
import type { Dictionary } from '@/lib/dictionary';

/**
 * Where the restaurant is, shown rather than offered.
 *
 * The map is a single image built into the repository by `npm run map` and
 * served from our own domain, so it is simply on the screen — no button, no
 * consent dialogue, and no request to anybody else. The alternative was an
 * empty grey box with "load the map" in the middle of it, or handing every
 * guest's address to a tile server before they had asked for a map at all.
 *
 * The attribution is not decoration either: the tiles are OpenStreetMap's under
 * ODbL, and the licence requires the credit. The interactive map stays one
 * click away for the guest who wants to pan around it — that click is theirs to
 * make, and only then does anything leave our domain.
 */
export function MapPlate({ dict }: { dict: Dictionary }) {
  const address = `${RESTAURANT.name}, ${RESTAURANT.street}, ${RESTAURANT.postalCode} ${RESTAURANT.city}`;
  const interactive = `https://www.openstreetmap.org/?mlat=${map.lat}&mlon=${map.lon}#map=${map.zoom}/${map.lat}/${map.lon}`;

  return (
    <figure className={styles.plate}>
      <img
        className={styles.image}
        src="/img/map/contact.webp"
        width={map.width}
        height={map.height}
        alt={dict.contact.mapAlt}
        loading="lazy"
        decoding="async"
      />

      {/*
       * The pin is placed from the same numbers the image was built with, as a
       * percentage, so it stays on the door whatever size the panel is.
       */}
      <span
        className={styles.pin}
        style={{ left: `${(map.pinX / map.width) * 100}%`, top: `${(map.pinY / map.height) * 100}%` }}
        aria-hidden="true"
      >
        <span className={styles.pinDot} />
        <span className={styles.pinRing} />
      </span>

      <span
        className={styles.label}
        style={{ left: `${(map.pinX / map.width) * 100}%`, top: `${(map.pinY / map.height) * 100}%` }}
      >
        {RESTAURANT.name}
      </span>

      <figcaption className={styles.foot}>
        <a
          className={styles.open}
          href={interactive}
          target="_blank"
          rel="noreferrer noopener"
          title={address}
        >
          {dict.contact.mapOpen}
          <span aria-hidden="true"> ↗</span>
        </a>
        <span className={styles.credit}>{dict.contact.mapCredit}</span>
      </figcaption>
    </figure>
  );
}
