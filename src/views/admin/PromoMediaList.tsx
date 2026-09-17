'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import styles from './Admin.module.css';
import { MEDIA_ACCEPT, MEDIA_MAX_ITEMS, IMAGE_MAX_MB, VIDEO_MAX_MB } from '@/lib/media-limits';
import type { PromoMedia } from '@/db/schema';

/**
 * The files an offer shows, in the order the card will show them.
 *
 * The list is the point. An offer card cycles through what is here, five
 * seconds each, so the order on this screen is the order a guest sees — which
 * is why moving an item is two arrows rather than a number in a box.
 *
 * Nothing here decides what a file *is*. The little "Video"/"Bild" label is a
 * guess from what the browser said, good enough to draw a thumbnail with; the
 * server reads the bytes and has the last word, including the right to refuse.
 */

export type MediaItem =
  | { key: string; source: 'stored'; media: PromoMedia }
  | {
      key: string;
      source: 'new';
      file: File;
      url: string;
      kind: 'image' | 'video';
      /** A frame lifted off the clip in the browser; absent until it is ready. */
      poster?: File;
      posterUrl?: string;
      working?: boolean;
    };

export function storedItem(media: PromoMedia): MediaItem {
  return { key: `stored:${media.path}`, source: 'stored', media };
}

export function PromoMediaList({
  items,
  onChange,
  idPrefix,
}: {
  items: MediaItem[];
  onChange: Dispatch<SetStateAction<MediaItem[]>>;
  idPrefix: string;
}) {
  const [tooMany, setTooMany] = useState(false);

  /*
   * Every object URL this component hands out, so they can all be released when
   * it closes. Revoking them as rows change would blank the thumbnail of a row
   * that was only being reordered, so they are held until the form goes away.
   */
  const urls = useRef<string[]>([]);
  useEffect(() => {
    const held = urls.current;
    return () => {
      for (const url of held) URL.revokeObjectURL(url);
    };
  }, []);

  function hold(file: File): string {
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    return url;
  }

  async function add(files: FileList | null) {
    if (!files?.length) return;

    const room = MEDIA_MAX_ITEMS - items.length;
    setTooMany(files.length > room);

    const added = [...files].slice(0, Math.max(room, 0)).map((file, index): MediaItem => {
      // A guess, only so the row can draw itself. The server reads the bytes.
      const video = file.type.startsWith('video/');
      return {
        key: `new:${Date.now()}:${index}:${file.name}`,
        source: 'new',
        file,
        url: hold(file),
        kind: video ? 'video' : 'image',
        working: video,
      };
    });
    onChange((prev) => [...prev, ...added]);

    /*
     * Posters are made after the rows appear, not before: pulling a frame out
     * of a clip takes a moment, and a form that freezes while it happens looks
     * broken. A clip whose frame never arrives is still publishable.
     */
    for (const item of added) {
      if (item.source !== 'new' || item.kind !== 'video') continue;
      const poster = await posterFrom(item.file);
      onChange((prev) =>
        prev.map((entry) =>
          entry.key === item.key && entry.source === 'new'
            ? {
                ...entry,
                poster: poster ?? undefined,
                posterUrl: poster ? hold(poster) : undefined,
                working: false,
              }
            : entry,
        ),
      );
    }
  }

  function move(index: number, by: -1 | 1) {
    onChange((prev) => {
      const to = index + by;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setTooMany(false);
    onChange((prev) => prev.filter((_, at) => at !== index));
  }

  return (
    <div className={styles.promoMediaBox}>
      <div className={styles.promoMediaHead}>
        <span className={styles.promoMediaLabel}>Bilder und Video</span>
        <span className={styles.promoMediaHint}>
          In dieser Reihenfolge zeigt die Karte sie, je fünf Sekunden. Bilder bis {IMAGE_MAX_MB} MB (JPG, PNG,
          WebP), Videos bis {VIDEO_MAX_MB} MB (MP4, WebM), höchstens {MEDIA_MAX_ITEMS} Dateien.
        </span>
      </div>

      {items.length === 0 ? (
        <p className={styles.promoMediaEmpty}>Noch nichts ausgewählt — die Karte zeigt dann einen leeren Rahmen.</p>
      ) : (
        <ol className={styles.promoMediaList}>
          {items.map((item, index) => (
            <li key={item.key} className={styles.promoMediaItem}>
              <span className={styles.promoMediaRank}>{index + 1}</span>
              <Thumb item={item} />

              <div className={styles.promoMediaInfo}>
                <span className={styles.promoMediaName}>{nameOf(item)}</span>
                <span className={styles.promoMediaKind}>{describe(item)}</span>
              </div>

              <div className={styles.promoMediaBtns}>
                <button
                  type="button"
                  className={styles.small}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Nach vorne"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.small}
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Nach hinten"
                >
                  ↓
                </button>
                <button type="button" className={styles.smallDanger} onClick={() => remove(index)}>
                  Entfernen
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {tooMany ? (
        <p className={styles.error} role="alert">
          Nicht alles übernommen — mehr als {MEDIA_MAX_ITEMS} Dateien passen nicht auf eine Aktion.
        </p>
      ) : null}

      <div className={styles.promoMediaAdd}>
        <label htmlFor={`${idPrefix}-add`} className="btn btn--sm">
          + Dateien hinzufügen
        </label>
        <input
          id={`${idPrefix}-add`}
          type="file"
          multiple
          accept={MEDIA_ACCEPT}
          className="visually-hidden"
          disabled={items.length >= MEDIA_MAX_ITEMS}
          onChange={(event) => {
            void add(event.target.files);
            // Cleared so choosing the same file twice in a row still counts.
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function Thumb({ item }: { item: MediaItem }) {
  if (item.source === 'stored') {
    return item.media.kind === 'video' ? (
      <video
        className={styles.promoMediaThumb}
        src={item.media.path}
        poster={item.media.poster ?? undefined}
        muted
        playsInline
        preload="metadata"
      />
    ) : (
      <img className={styles.promoMediaThumb} src={item.media.path} alt="" loading="lazy" />
    );
  }

  return item.kind === 'video' ? (
    <video className={styles.promoMediaThumb} src={item.url} poster={item.posterUrl} muted playsInline preload="metadata" />
  ) : (
    <img className={styles.promoMediaThumb} src={item.url} alt="" />
  );
}

function nameOf(item: MediaItem): string {
  return item.source === 'stored' ? item.media.path.split('/').pop() ?? item.media.path : item.file.name;
}

function describe(item: MediaItem): string {
  if (item.source === 'stored') {
    const size = item.media.width && item.media.height ? ` · ${item.media.width}×${item.media.height}` : '';
    const poster = item.media.kind === 'video' ? (item.media.poster ? ' · mit Standbild' : ' · ohne Standbild') : '';
    return `${item.media.kind === 'video' ? 'Video' : 'Bild'}${size}${poster} · gespeichert`;
  }

  const mb = (item.file.size / 1024 / 1024).toFixed(1);
  if (item.kind !== 'video') return `Bild · ${mb} MB · neu`;
  if (item.working) return `Video · ${mb} MB · Standbild wird erstellt …`;
  return `Video · ${mb} MB · ${item.poster ? 'mit Standbild' : 'ohne Standbild'} · neu`;
}

/**
 * A still lifted out of a clip, in the browser.
 *
 * There is no way to decode a video frame on this server — the libraries that
 * could all ship unsigned native binaries, which this machine blocks — but the
 * browser that is about to upload the file has already decoded it. The frame
 * comes back as an ordinary JPEG and is checked on the server like any other
 * upload, so nothing is trusted here beyond the pixels.
 *
 * Returns null whenever that does not work: a codec the browser cannot play, a
 * clip that never loads. `OfferMedia` shows a clip without a poster perfectly
 * well, and a made-up still would be worse than none.
 */
async function posterFrom(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');

  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;

    await once(video, 'loadeddata', 6000);
    // Not the very first frame: clips very often open on black.
    video.currentTime = Math.min(0.5, (Number.isFinite(video.duration) ? video.duration : 1) / 3);
    await once(video, 'seeked', 4000);

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    return blob ? new File([blob], 'standbild.jpg', { type: 'image/jpeg' }) : null;
  } catch {
    return null;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

function once(target: HTMLVideoElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      window.clearTimeout(timer);
      target.removeEventListener(event, done);
      target.removeEventListener('error', fail);
      resolve();
    };
    const fail = () => {
      window.clearTimeout(timer);
      target.removeEventListener(event, done);
      target.removeEventListener('error', fail);
      reject(new Error(event));
    };
    const timer = window.setTimeout(fail, timeoutMs);
    target.addEventListener(event, done, { once: true });
    target.addEventListener('error', fail, { once: true });
  });
}
