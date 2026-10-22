// Turns a raw generated image (any format ffmpeg reads) into the game-ready
// ART_SIZE×ART_SIZE PNG for one ASSET_PATHS key. Terrain is centre-cropped to
// a square and stays opaque. Everything else has its flat background keyed
// out, is cropped to the figure (centred, standing on the bottom edge), and
// gets hard 0/255 alpha so no fringe shows on the map.
//
//   bun run sprite <asset-key> <raw.png> [out.png]
//
// Needs ffmpeg and ffprobe on PATH.

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ART_SIZE, ASSET_PATHS, type AssetKey } from '../src/phaser/assets';

const KEY_TOLERANCE = 56; // RGB distance from the background colour

type Image = { width: number; height: number; data: Uint8Array };

function run(command: string, args: string[], input?: Uint8Array): Buffer {
  const result = spawnSync(command, args, {
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`${command} failed: ${result.stderr}`);
  return result.stdout;
}

function decode(path: string): Image {
  const [width, height] = run('ffprobe', [
    ...['-v', 'error', '-select_streams', 'v:0'],
    ...['-show_entries', 'stream=width,height', '-of', 'csv=p=0', path],
  ])
    .toString()
    .trim()
    .split(',')
    .map(Number);
  const data = run('ffmpeg', [
    ...['-v', 'error', '-i', path, '-frames:v', '1'],
    ...['-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
  ]);
  return { width: width!, height: height!, data: new Uint8Array(data) };
}

function encode(image: Image, path: string): void {
  run(
    'ffmpeg',
    [
      ...['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba'],
      ...['-s', `${image.width}x${image.height}`, '-i', '-'],
      ...['-frames:v', '1', '-pix_fmt', 'rgba', path],
    ],
    image.data,
  );
}

// Clears every pixel close to the mean corner colour, including pockets the
// figure encloses (between a spear and a body), so draw on a background
// colour the figure never uses, such as flat magenta.
function keyBackground({ width, height, data }: Image): void {
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  const bg = [0, 1, 2].map(
    (c) => corners.reduce((sum, i) => sum + data[i * 4 + c]!, 0) / 4,
  );
  for (let i = 0; i < width * height; i += 1) {
    const distance = Math.hypot(
      data[i * 4]! - bg[0]!,
      data[i * 4 + 1]! - bg[1]!,
      data[i * 4 + 2]! - bg[2]!,
    );
    if (distance < KEY_TOLERANCE) data[i * 4 + 3] = 0;
  }
}

// The square source window the output samples: the figure's bounding box
// widened to a square, centred across and resting on the bottom edge.
function figureSquare({ width, height, data }: Image) {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3]! < 128) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error('nothing left after keying the background');
  const side = Math.max(right - left + 1, bottom - top + 1);
  return {
    x: Math.round((left + right + 1 - side) / 2),
    y: bottom + 1 - side,
    side,
  };
}

// Area-averages the window down to ART_SIZE, weighting colour by alpha.
// Pixels outside the source count as transparent.
function downscale(
  src: Image,
  window: { x: number; y: number; side: number },
  hardAlpha: boolean,
): Image {
  const out = new Uint8Array(ART_SIZE * ART_SIZE * 4);
  const step = window.side / ART_SIZE;
  for (let oy = 0; oy < ART_SIZE; oy += 1) {
    for (let ox = 0; ox < ART_SIZE; ox += 1) {
      const sum = [0, 0, 0, 0];
      let count = 0;
      const y0 = Math.floor(window.y + oy * step);
      const y1 = Math.max(y0 + 1, Math.floor(window.y + (oy + 1) * step));
      const x0 = Math.floor(window.x + ox * step);
      const x1 = Math.max(x0 + 1, Math.floor(window.x + (ox + 1) * step));
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          count += 1;
          if (x < 0 || y < 0 || x >= src.width || y >= src.height) continue;
          const i = (y * src.width + x) * 4;
          const a = src.data[i + 3]!;
          for (let c = 0; c < 3; c += 1) sum[c] += src.data[i + c]! * a;
          sum[3] += a;
        }
      }
      const o = (oy * ART_SIZE + ox) * 4;
      const alpha = sum[3]! / count;
      const opaque = hardAlpha ? alpha >= 128 : true;
      if (!opaque || sum[3] === 0) continue;
      for (let c = 0; c < 3; c += 1) out[o + c] = Math.round(sum[c]! / sum[3]!);
      out[o + 3] = 255;
    }
  }
  return { width: ART_SIZE, height: ART_SIZE, data: out };
}

const [key, input, output] = process.argv.slice(2);
if (!key || !Object.hasOwn(ASSET_PATHS, key) || !input) {
  console.error(
    `usage: bun run sprite <asset-key> <raw.png> [out.png]\nkeys: ${Object.keys(ASSET_PATHS).join(', ')}`,
  );
  process.exit(1);
}
const assetKey = key as AssetKey;
const source = decode(input);
const terrain = assetKey.startsWith('terrain-');
let window;
if (terrain) {
  // Terrain tiles the floor seamlessly, so any transparency in the source
  // would show the page through the map: drop it.
  for (let i = 3; i < source.data.length; i += 4) source.data[i] = 255;
  const side = Math.min(source.width, source.height);
  window = {
    x: Math.floor((source.width - side) / 2),
    y: Math.floor((source.height - side) / 2),
    side,
  };
} else {
  keyBackground(source);
  window = figureSquare(source);
}
const outPath =
  output ?? join(import.meta.dirname, '..', 'public', ASSET_PATHS[assetKey]);
encode(downscale(source, window, !terrain), outPath);
console.log(`${outPath}  ${ART_SIZE}x${ART_SIZE}`);
