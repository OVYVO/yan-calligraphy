import sharp from 'sharp'
import type { SplitRegionGeometry } from '../../shared/schemas/split'

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 255
}

function estimatePaperColor(data: Buffer, width: number, height: number, channels: number) {
  const samples: Array<[number, number, number]> = []
  const sampleSize = Math.max(1, Math.min(8, Math.floor(Math.min(width, height) / 8)))
  const corners = [
    [0, 0],
    [Math.max(0, width - sampleSize), 0],
    [0, Math.max(0, height - sampleSize)],
    [Math.max(0, width - sampleSize), Math.max(0, height - sampleSize)],
  ]

  for (const [startX, startY] of corners) {
    for (let y = startY!; y < Math.min(startY! + sampleSize, height); y += 1) {
      for (let x = startX!; x < Math.min(startX! + sampleSize, width); x += 1) {
        const offset = (y * width + x) * channels
        samples.push([data[offset] ?? 255, data[offset + 1] ?? 255, data[offset + 2] ?? 255])
      }
    }
  }

  return {
    r: median(samples.map(sample => sample[0])),
    g: median(samples.map(sample => sample[1])),
    b: median(samples.map(sample => sample[2])),
  }
}

export function assertRegionInsideImage(
  region: Pick<SplitRegionGeometry, 'x' | 'y' | 'width' | 'height'>,
  imageWidth: number,
  imageHeight: number,
) {
  if (region.x + region.width > imageWidth || region.y + region.height > imageHeight)
    throw new Error('文字区域超出图片范围')
}

export async function extractRegionMatte(
  sourcePath: string,
  region: SplitRegionGeometry,
) {
  const extracted = sharp(sourcePath, { failOn: 'error' }).extract({
    left: region.x,
    top: region.y,
    width: region.width,
    height: region.height,
  })

  if (!region.matte)
    return await extracted.png().toBuffer()

  const { data, info } = await extracted
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const paper = estimatePaperColor(data, info.width, info.height, info.channels)
  const rgba = Buffer.alloc(info.width * info.height * 4)

  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const sourceOffset = pixel * info.channels
    const targetOffset = pixel * 4
    const red = data[sourceOffset] ?? 255
    const green = data[sourceOffset + 1] ?? 255
    const blue = data[sourceOffset + 2] ?? 255
    const colorDistance = Math.sqrt(
      (red - paper.r) ** 2
      + (green - paper.g) ** 2
      + (blue - paper.b) ** 2,
    )
    const paperLuminance = 0.2126 * paper.r + 0.7152 * paper.g + 0.0722 * paper.b
    const pixelLuminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    const darkness = Math.max(0, paperLuminance - pixelLuminance)
    const signal = Math.max(colorDistance, darkness * 1.25)
    const alpha = Math.round(Math.max(0, Math.min(255, ((signal - 8) / 72) * 255)))

    rgba[targetOffset] = red
    rgba[targetOffset + 1] = green
    rgba[targetOffset + 2] = blue
    rgba[targetOffset + 3] = alpha
  }

  return await sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).png().toBuffer()
}
