/*
  tags: gpgpu, fbo

  <p>This example implements a parallell reduction algorithm on the GPU. </p>

  <p>Given some elements x0, x1, x2,..., and a binary operator 'op', the parallell reduction
  becomes 'op(x0, op(x1, op(x2,...) ))'. For example, given the elements 4, 2, 4, 1, and the operator '+',
  the parallell reduction will be 11, which is just the sum of the elements. </p>
*/
/* globals performance*/

import seedrandom from 'seedrandom'

// we're not gonna render anything in this demo, so make smallest possible canvas.
const canvas = document.body.appendChild(document.createElement('canvas'))
canvas.width = 1
canvas.height = 1

const regl = require('regl')(canvas)

/*
  Reduction on the GPU.

  We basically use the technique described in section 37.2 of this article:
  http://http.developer.nvidia.com/GPUGems/gpugems_ch37.html

  The algorithm: We basically start with a texture (A) of size
  (N)x(N). Then we create an FBO (B) of size (N/2)x(N/2). Then we render to FBO (B), and
  every fragment will sample four texels from (A). And by doing so, we will have performed
  a reduction of 2x2 sized blocks.

  Next, we create an FBO (C) of size (N/4)x(N/4), and, like above, we
  to render (C) to while sampling from (B), and so on. We keep going
  until we are left with an FBO of size 1x1. And that single pixel in
  that FBO contains our desired result.

  Note that we are using a texture of type RGBA8 in the below
  implementation. This means that we can't really use '+' as an
  operator for the reduction, since it will easily overflow. This can
  be solved by switching to a texture of type RGBA32F.
  But we are not using that, because it requires an extensions that is not always available.
  So to maximize compability, we use RGBA8 in this demo.
  So if you want to use the below reduce implementation in your own code, you will probably
  have to switch to RGBA32F.

  And to simplify things, we will be making the assumption that data.length will be one the numbers
  1x1, 2x2, 4x4, 8x8, 16x16,...
*/
function gpuReduceCreate(data, op) {
  // a single reduce pass
  const reducePass = regl({
    frag: `
    precision mediump float;
    uniform sampler2D tex;
    varying vec2 uv;
    uniform float rcpDim;

    float op(float a, float b) {
      return ${op};
    }

    void main () {
      float a = texture2D(tex, uv - vec2(0.0, 0.0) * rcpDim).x;
      float b = texture2D(tex, uv - vec2(1.0, 0.0) * rcpDim).x;
      float c = texture2D(tex, uv - vec2(0.0, 1.0) * rcpDim).x;
      float d = texture2D(tex, uv - vec2(1.0, 1.0) * rcpDim).x;

      float result = op(op(a, b), op(c, d));
      gl_FragColor = vec4(result);
    }`,

    vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main () {
      uv = position;
      gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
    }`,

    attributes: {
      position: [-2, 0, 0, -2, 2, 2],
    },

    uniforms: {
      tex: regl.prop('inTex'),
      rcpDim: regl.prop('rcpDim'), // reciprocal texture dimensions.
    },

    framebuffer: regl.prop('outFbo'),

    count: 3,
  })

  // We must use a texture format of type RGBA. Because you cannot create a single channel FBO of type
  // ALPHA in WebGL.
  const textureData = []
  for (let i = 0; i < data.length; i++) {
    const g = data[i]
    textureData.push(g, g, g, g)
  }

  // dimensions of the first texture is (dim)X(dim).
  const DIM = Math.sqrt(data.length)
  let dim = DIM

  const firstTexture = regl.texture({
    width: dim,
    height: dim,
    data: textureData,
    format: 'rgba',
    type: 'uint8',
    mag: 'nearest',
    min: 'nearest',
  })

  const fbos = []
  do {
    dim >>= 1
    fbos.push(
      regl.framebuffer({
        colorFormat: 'rgba',
        colorType: 'uint8',
        width: dim,
        height: dim,
      })
    )
  } while (dim > 1)

  // We'll be calling this function when profiling.  Otherwise, the
  // comparison with the CPU will be unfair, because creating all
  // those FBOs takes quite a bit of time, so the GPU would always be
  // slower than the CPU.
  return function () {
    // first pass.
    reducePass({ inTex: firstTexture, outFbo: fbos[0], rcpDim: 1.0 / (fbos[0].width * 2) })

    // the rest of the passes.
    for (i = 0; i < fbos.length - 1; i++) {
      const inFbo = fbos[i + 0]
      const outFbo = fbos[i + 1]

      reducePass({ inTex: inFbo.color[0], outFbo: outFbo, rcpDim: 1.0 / (outFbo.width * 2) })
    }

    // now retrieve the result from the GPU
    let result
    regl({ framebuffer: fbos[fbos.length - 1] })(() => {
      result = regl.read()[0]
    })
    return result
  }
}

// ---

const ITEMS = []
const GRID_SIZE = 4096

for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    // @ts-expect-error - TODO need to fix
    ITEMS.push(`${j}-${i}`)
  }
}

const getBoundingBox = (item, key) => {
  const i = Number(key) % GRID_SIZE
  const j = Math.floor(Number(key) / GRID_SIZE)

  return {
    x: i * 100,
    y: j * 100,
    width: 50,
    height: 50,
  }
}

// ---

/*
const seed = 'seed'
const rng = seedrandom(seed)
const data = []
for (let i = 0; i < 1024 * 1024; i++) {
  data.push(Math.floor(rng() * 255))
}
*/

const calculateCanvasSize = <Key extends types.KeyBase, Item extends types.ItemBase>(
  items: types.Collection<Key, Item>,
  getBoundingBox: types.GetBoundingBox<Key, Item>
): types.Size => {
  const size = { width: 0, height: 0 }

  for (const key in items) {
    const item = items[key]
    const box = getBoundingBox(item, key)
    size.width = Math.max(size.width, box.x + box.width)
    size.height = Math.max(size.height, box.y + box.height)
  }

  return size
}

const measure = (name, fn) => {
  performance.mark(`${name}-start`)
  const result = fn()
  performance.mark(`${name}-end`)

  const { duration } = performance.measure(`${name}-measure`, { start: `${name}-start`, end: `${name}-end` })
  console.debug(`${name}: ${duration}ms`)

  return result
}

const WIDTHs = measure('Setup', () => ITEMS.map((item, key) => getBoundingBox(item, key).width))
const gpuMaxReduce = measure('GPU Create', () => gpuReduceCreate(WIDTHs, 'max(a,b)'))
measure('GPU', gpuMaxReduce)
measure('CPU', () => WIDTHs.reduce((a, b) => Math.max(a, b)))
