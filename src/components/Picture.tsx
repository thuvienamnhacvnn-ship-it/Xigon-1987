import manifest from '../../public/img/manifest.json';

type SceneEntry = { widths: number[]; ratio: number; lqip: string };
type PlateEntry = { widths: number[]; ratio: number };

const scenes = manifest.scene as unknown as Record<string, SceneEntry>;
const plates = manifest.plate as unknown as Record<string, PlateEntry>;
const dishes = manifest.dish as unknown as Record<string, SceneEntry>;

type SceneProps = {
  id: string;
  alt: string;
  /** Matches the CSS box, e.g. "(min-width: 900px) 55vw, 100vw". */
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * A photograph from the pre-generated set.
 *
 * Sizes are baked by `scripts/build-assets.mjs`, so the server needs no image
 * pipeline at runtime and every crop was chosen deliberately rather than by a
 * generic resizer.
 */
export function Scene({ id, alt, sizes, className, priority = false }: SceneProps) {
  const asset = scenes[id];
  if (!asset) return <div className={className} data-missing-asset={id} aria-hidden="true" />;

  const srcSet = (ext: string) => asset.widths.map((w) => `/img/scene/${id}-${w}.${ext} ${w}w`).join(', ');
  const widest = asset.widths[asset.widths.length - 1];

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
      <img
        src={`/img/scene/${id}-${widest}.webp`}
        alt={alt}
        width={widest}
        height={Math.round(widest / asset.ratio)}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
        style={{
          backgroundImage: asset.lqip ? `url(${asset.lqip})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    </picture>
  );
}

/**
 * The photograph of a dish as it is served.
 *
 * Distinct from `Plate`, which is the same dish cut out on transparency for
 * floating over the room. Most dishes have a photograph; only a handful were
 * ever cut out. The dish page asked for the cut-out first and fell through to
 * an empty frame with the dish's code in it when there was none — so a dish with
 * a perfectly good photograph, shown on the card and in the basket, opened onto
 * a blank box.
 */
export function Dish({ id, alt, sizes, className, priority = false }: SceneProps) {
  const asset = dishes[id];
  if (!asset) return null;

  const srcSet = asset.widths.map((w) => `/img/dish/${id}-${w}.webp ${w}w`).join(', ');
  const widest = asset.widths[asset.widths.length - 1];

  return (
    <img
      src={`/img/dish/${id}-${widest}.webp`}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={widest}
      height={Math.round(widest / asset.ratio)}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      style={{
        backgroundImage: asset.lqip ? `url(${asset.lqip})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );
}

type PlateProps = {
  id: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * A dish cut out on transparency, meant to float over anything.
 *
 * Kept separate from `Scene` because a plate has no backdrop of its own: it is
 * a foreground object, and swapping one for another must never disturb the
 * layer behind it.
 */
export function Plate({ id, alt, sizes, className, priority = false }: PlateProps) {
  const asset = plates[id];
  if (!asset) return <div className={className} data-missing-plate={id} aria-hidden="true" />;

  const srcSet = asset.widths.map((w) => `/img/plate/${id}-${w}.webp ${w}w`).join(', ');
  const widest = asset.widths[asset.widths.length - 1];

  return (
    <img
      src={`/img/plate/${id}-${widest}.webp`}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={widest}
      height={Math.round(widest / asset.ratio)}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
    />
  );
}

export function plateIds(): string[] {
  return Object.keys(plates);
}
