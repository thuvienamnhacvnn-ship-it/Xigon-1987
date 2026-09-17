'use client';

/**
 * The state of the room, held outside React's tree.
 *
 * The film is the background of the whole site, not of one screen: it is
 * mounted once in the shell and stays mounted while the guest moves between
 * screens, so the shot never restarts and never reloads. That means the element
 * lives above the screens in the tree, while the controls that drive it — the
 * scene pills, play, sound — live inside one of them.
 *
 * A module-scoped store is the honest way to connect the two. Context would
 * have to be threaded through server components that have no business knowing
 * about a video, and lifting the state into the layout would make the layout a
 * client component and drag every screen with it.
 */

export type SceneId = 'atmosphaere' | 'kueche' | 'bar';
export const SCENES: SceneId[] = ['atmosphaere', 'kueche', 'bar'];

export type RoomState = {
  scene: SceneId;
  /**
   * Whether the guest is standing in the room — that is, on Erleben.
   *
   * The film plays there and is paused everywhere else. On the other screens it
   * is still the background, held on a frame, because a moving picture behind a
   * price list is something people ask you to turn off.
   */
  active: boolean;
  playing: boolean;
  muted: boolean;
  /** The browser accepted the file and then never produced a frame. */
  failed: boolean;
  ready: boolean;
};

let state: RoomState = {
  scene: 'atmosphaere',
  active: false,
  playing: false,
  muted: true,
  failed: false,
  ready: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRoom(): RoomState {
  return state;
}

export function setRoom(patch: Partial<RoomState>) {
  // Nothing changed, nothing to redraw — this runs on every `timeupdate`-ish
  // event the backdrop reports back.
  let changed = false;
  for (const key of Object.keys(patch) as (keyof RoomState)[]) {
    if (state[key] !== patch[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  state = { ...state, ...patch };
  emit();
}

/*
 * The controls are on one screen and the element is in the shell, so the
 * commands travel as intentions rather than as calls. The backdrop is the only
 * thing that touches the <video>.
 */
type Command = 'toggle-play' | 'toggle-sound';
const commands = new Set<(command: Command) => void>();

export function onCommand(handler: (command: Command) => void): () => void {
  commands.add(handler);
  return () => {
    commands.delete(handler);
  };
}

export function send(command: Command) {
  for (const handler of commands) handler(command);
}
