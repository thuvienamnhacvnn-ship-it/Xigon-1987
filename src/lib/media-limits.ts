/**
 * What an offer's media may be, in one place because both ends need it.
 *
 * The server is what enforces these — the form cannot be trusted and does not
 * have to be — but the form has to say them out loud, because a refusal that
 * arrives after a minute of uploading is a refusal nobody reads.
 *
 * Video is capped well below images on purpose. A clip on an offer card loops
 * silently for five seconds beside a photograph; it is decoration, not a film,
 * and unlike a photograph it is served in full to every guest who opens the
 * page. Six megabytes of photograph is a generous original; six megabytes of
 * video is a bandwidth bill.
 */

export const IMAGE_MAX_MB = 6;
export const VIDEO_MAX_MB = 4;

export const IMAGE_MAX_BYTES = IMAGE_MAX_MB * 1024 * 1024;
export const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;

/**
 * What the file picker offers. Only a hint to the operating system: the bytes
 * are identified again on the server, which is the check that counts.
 */
export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime';

/** Beyond this an offer is a gallery, and the card cannot show a gallery. */
export const MEDIA_MAX_ITEMS = 8;
