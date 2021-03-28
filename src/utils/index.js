import { saveAs } from 'file-saver';
import Camera from '../graphics/camera';
import Circle from '../tools/circle';
import Pen from '../tools/pen';
import Shape from '../tools/shape';
import Text from '../tools/text';
import {
  rtv,
  math,
  parser,
  DARK,
  SCALE_FACTOR,
  T_STEPS,
  GRID_SIZE,
  MOUSE_DURATION,
  PI2,
  MAT_NUM_WIDTH,
  CHAR,
} from '../resources';

// custom functions!
export function sig(x) {
  return 1 / (1 + math.exp(-x));
}

export function sigp(x) {
  return math.exp(-x) / math.pow(1 + math.exp(-x), 2);
}

// http://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
// Maxwell Collard
export function randNBm() {
  const u = 1 - Math.random(); // Subtraction to flip [0, 1) to (0, 1].
  const v = 1 - Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// cache
const matrixCache = {};
export function cached(dims) {
  const s = dims.join('_');
  let m = matrixCache[s];
  if (!m) {
    m = math.matrix(math.zeros(dims));
    matrixCache[s] = m;
  }

  return m;
}

// import
export function graph(fn, d1, d2, d3) { // graphs y=f(x) from -10 to 10
  let y = 0;
  let p; let gp;
  const N = 400;
  let points = cached([N + 1, 3]);
  const asyms = cached([N + 1, 1])._data;
  const pd = points._data;

  const dx = 20 / N;

  let i = 0;
  let x = -10;
  let yLast = fn(x);
  for (; x < 10; x += dx) {
    y = fn(x);

    pd[i][d1] = x;
    pd[i][d2] = Math.max(Math.min(y, 10000), -10000);
    pd[i][d3] = 0;

    asyms[i] = 0;
    if (math.abs(y - yLast) > 20) {
      // vertical asymptote
      asyms[i] = 1;

      pd[i - 1][d2] = math.sign(pd[i - 1][d2]) * 1000;
      pd[i][d2] = math.sign(y) * 1000;
    }

    yLast = y;
    i++;
  }

  points = rtv.cam.graph_to_screen_mat(points);

  rtv.ctx.beginPath();
  for (let i = 0; i < N; i++) {
    p = points[i];

    if (asyms[i]) {
      rtv.ctx.stroke();
      rtv.ctx.beginPath();
      rtv.ctx.moveTo(p[0], p[1]);
      continue;
    }

    if (i === 0) {
      rtv.ctx.moveTo(p[0], p[1]);
    } else {
      rtv.ctx.lineTo(p[0], p[1]);
    }
  }
  rtv.ctx.stroke();
}

/**
 * graphs x=f(t) y=g(t) z=h(t) from tmin to tmax, units shows markers every 1 increment in t
 * @param {*} r
 * @param {*} tmin
 * @param {*} tmax
 * @param {*} units
 */
export function para(r, tmin, tmax, units) {
  const N = 300;
  let points = cached([N + 1, 3]);
  const pd = points._data;

  const dt = (tmax - tmin) / N;

  let i = 0;
  let data;

  for (let t = tmin; t <= tmax; t += dt) {
    data = r(t)._data;

    data[0] = Math.max(Math.min(data[0], 1000), -1000);
    data[1] = Math.max(Math.min(data[1], 1000), -1000);
    data[2] = Math.max(Math.min(data[2], 1000), -1000);

    pd[i][0] = data[0];
    pd[i][1] = data[1];
    pd[i][2] = data[2];

    i++;
  }

  points = rtv.cam.graph_to_screen_mat(points);

  rtv.ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const p = points[i];
    if (i === 0) {
      rtv.ctx.moveTo(p[0], p[1]);
    } else {
      rtv.ctx.lineTo(p[0], p[1]);
    }
  }
  rtv.ctx.stroke();

  if (units) {
    let numDots = tmax - tmin;
    numDots = Math.floor(numDots);

    if (numDots > 0) {
      let dots = cached([numDots, 3]);

      let i = 0;

      for (i = 0; i < numDots; i++) {
        data = r(i + 1)._data;

        data[0] = Math.max(Math.min(data[0], 1000), -1000);
        data[1] = Math.max(Math.min(data[1], 1000), -1000);
        data[2] = Math.max(Math.min(data[2], 1000), -1000);

        dots._data[i][0] = data[0];
        dots._data[i][1] = data[1];
        dots._data[i][2] = data[2];
      }

      dots = rtv.cam.graph_to_screen_mat(dots);

      rtv.ctx.save();
      for (let i = 0; i < numDots; i++) {
        const p = dots[i];

        rtv.ctx.beginPath();
        rtv.ctx.arc(p[0], p[1], 4, 0, PI2);
        rtv.ctx.fill();
        rtv.ctx.stroke();
      }
      rtv.ctx.restore();
    }
  }
}

export function implies(p, q) {
  return !p || q;
}

function reportError(e) {
  console.log(e);
  rtv.error.timer = 100;
  rtv.error.text = e;
}

// undo
let states = [];

export function rgbToHex(c) {
  return `#${((1 << 24) + (Math.round(c[0]) << 16) + (Math.round(c[1]) << 8) + Math.round(c[2])).toString(16).slice(1)}`;
}

function rgb1ToHex(a) {
  const c = [Math.round(a[0] * 255),
    Math.round(a[1] * 255),
    Math.round(a[2] * 255)];
  return rgbToHex(c);
}

export function prettyRound(num) {
  return (Math.round(num * 100) / 100).toFixed(2);
}

export function prettyRoundOne(num) {
  return (Math.round(num * 10) / 10).toFixed(1);
}

export function drawSimple(text) {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '*') {
      rtv.ctx.beginPath();
      rtv.ctx.arc(i * CHAR.SIZE + CHAR.SIZE / 2, 0, 3, 0, PI2);
      rtv.ctx.fill();
    } else {
      rtv.ctx.fillText(text[i], i * CHAR.SIZE, 0);
    }
  }
  return text.length * CHAR.SIZE;
}

function drawR(o, p, d) {
  // o tree object
  // p position
  // d should draw, false to just get the size

  let text = '';
  let argc = 0;
  let args;

  if (o && o.args) {
    args = o.args;
    argc = args.length;
  }

  let size = { w: 0, h: 0 };

  if (args) {
    if (o.name && o.name.length) {
      text = o.name;
    } else if (o.op && o.op.length) {
      text = o.op;
    }

    if (text === '+' || text === '-' || text === '*') {
      if (argc === 1) {
        if (d) rtv.ctx.fillText(text, p.x, p.y);
        const s1 = drawR(args[0], { x: p.x + CHAR.SIZE, y: p.y }, d);

        size.w = s1.w + CHAR.SIZE;
        size.h = s1.h;
      } else if (argc === 2) {
        // draw on the left and the right

        const center = false; // false -> bottom align
        let pad2 = CHAR.PAD * 2;
        if (text === '*') {
          pad2 = 0;
        }

        let s1 = drawR(args[0], { x: 0, y: 0 }, false);
        let s2 = drawR(args[1], { x: 0, y: 0 }, false);

        size.w = s1.w + text.length * CHAR.SIZE + 2 * pad2 + s2.w;
        size.h = Math.max(s1.h, s2.h);

        if (d) {
          let opp = { x: 0, y: 0 };
          if (center) {
            s1 = drawR(args[0], {
              x: p.x,
              y: p.y + size.h / 2 - s1.h / 2,
            }, d);

            opp = {
              x: p.x + s1.w + pad2,
              y: p.y + size.h / 2 - CHAR.SIZE,
            };

            s2 = drawR(args[1], {
              x: p.x + s1.w + pad2 + text.length * CHAR.SIZE + pad2,
              y: p.y + size.h / 2 - s2.h / 2,
            }, d);
          } else {
            // bottom align
            s1 = drawR(args[0], {
              x: p.x,
              y: p.y + size.h - s1.h,
            }, d);

            opp = {
              x: p.x + s1.w + pad2,
              y: p.y + size.h - CHAR.SIZE * 2,
            };

            s2 = drawR(args[1], {
              x: p.x + s1.w + pad2 + text.length * CHAR.SIZE + pad2,
              y: p.y + size.h - s2.h,
            }, d);
          }

          if (text === '*') {
            rtv.ctx.beginPath();
            rtv.ctx.arc(opp.x + CHAR.SIZE / 2, opp.y + CHAR.SIZE, 3, 0, PI2);
            rtv.ctx.fill();
          } else {
            rtv.ctx.fillText(text, opp.x, opp.y);
          }
        }
      }
    } else if (text === '^') {
      if (argc === 2) {
        // draw on the left and the right, shifted up!
        const a = args[0];
        let b = args[1];

        if (b.content) {
          b = b.content;
        }

        const s1 = drawR(a, { x: 0, y: 0 }, false);
        const s2 = drawR(b, { x: 0, y: 0 }, false);

        size.w = s1.w + s2.w;
        size.h = s1.h + s2.h - CHAR.SIZE;

        if (d) {
          drawR(a, { x: p.x, y: p.y + size.h - s1.h }, d);
          drawR(b, { x: p.x + s1.w, y: p.y }, d);
        }
      }
    } else if (text === '/') {
      if (argc === 2) {
        // draw on top and bottom
        let a = args[0]; let b = args[1];

        // remove unnecessary parens
        if (a.content) {
          a = a.content;
        }

        if (b.content) {
          b = b.content;
        }

        const s1 = drawR(a, { x: 0, y: 0 }, false);
        const s2 = drawR(b, { x: 0, y: 0 }, false);

        size.w = Math.max(s1.w, s2.w) + CHAR.PAD * 2;
        size.h = Math.max(s1.h, s2.h) * 2 + CHAR.PAD * 4;

        if (d) {
          drawR(a, {
            x: p.x + size.w / 2 - s1.w / 2,
            y: p.y + size.h / 2 - s1.h - CHAR.PAD * 2,
          }, d);

          drawR(b, {
            x: p.x + size.w / 2 - s2.w / 2,
            y: p.y + size.h / 2 + CHAR.PAD * 2,
          }, d);

          rtv.ctx.beginPath();
          rtv.ctx.moveTo(p.x, p.y + size.h / 2);
          rtv.ctx.lineTo(p.x + size.w, p.y + size.h / 2);
          rtv.ctx.stroke();
        }
      }
    } else if (text === '!') {
      const s1 = drawR(args[0], { x: p.x, y: p.y }, d);
      if (d) rtv.ctx.fillText(text, p.x + s1.w, p.y);

      size.w = s1.w + CHAR.SIZE;
      size.h = s1.h;
    } else if (o.fn) {
      // function call
      let h = 0;

      // get height of all args
      const N = args.length;
      const hs = [];
      for (let i = 0; i < N; i++) {
        const s1 = drawR(args[i], { x: 0, y: 0 }, false);
        hs.push(s1);

        h = Math.max(h, s1.h);
      }

      size.h = h;

      // draw it
      text = `${o.name}(`;
      const cally = p.y + size.h / 2 - CHAR.SIZE;

      if (d) {
        for (let i = 0; i < text.length; i++) {
          rtv.ctx.fillText(text[i], p.x + i * CHAR.SIZE, cally);
        }
      }

      let xo = text.length * CHAR.SIZE;

      for (let i = 0; i < N; i++) {
        const s1 = drawR(args[i], { x: p.x + xo, y: p.y + size.h / 2 - hs[i].h / 2 }, d);
        xo += s1.w;

        if (i === N - 1) {
          if (d) rtv.ctx.fillText(')', p.x + xo, cally);
        } else if (d) rtv.ctx.fillText(',', p.x + xo, cally);

        xo += CHAR.SIZE;
      }

      size.w = xo;
    }
  } else {
    // no args

    if (o.name && o.name.length) {
      text = o.name;
    } else if (o.value) {
      text = o.value;
    } else {
      text = '?';
    }

    if (o.content) {
      // parens
      let s1 = drawR(o.content, { x: 0, y: 0 }, false);
      // ctx.save();
      // ctx.scale(1, s1.h/(char_size*2));
      if (d) rtv.ctx.fillText('(', p.x, p.y + s1.h / 2 - CHAR.SIZE);
      if (d) rtv.ctx.fillText(')', p.x + s1.w + CHAR.SIZE, p.y + s1.h / 2 - CHAR.SIZE);
      // ctx.restore();

      s1 = drawR(o.content, { x: p.x + CHAR.SIZE, y: p.y }, d);

      size.w = s1.w + CHAR.SIZE * 2;
      size.h = s1.h;
    } else if (o.node) {
      size = drawR(o.node, { x: p.x, y: p.y }, d);
    } else if (o.object && o.value) {
      // assignment

      const s1 = drawR(o.value, { x: 0, y: 0 }, false);
      const text = `${o.object.name} = `;

      if (d) {
        rtv.ctx.save();
        rtv.ctx.translate(p.x, p.y + s1.h / 2 - CHAR.SIZE);
        drawSimple(text);
        rtv.ctx.restore();

        drawR(o.value, { x: p.x + text.length * CHAR.SIZE, y: p.y }, d);
      }

      size.w = s1.w + text.length * CHAR.SIZE;
      size.h = s1.h;
    } else if (o.blocks) {
      // block

      const items = o.blocks;
      let h = 0;

      // get height of all args
      const N = items.length;
      const hs = [];
      for (let i = 0; i < N; i++) {
        const s1 = drawR(items[i], { x: 0, y: 0 }, false);
        hs.push(s1);

        h = Math.max(h, s1.h);
      }

      size.h = h;

      // draw it
      const cally = p.y + size.h / 2 - CHAR.SIZE;
      let xo = 0;

      for (let i = 0; i < N; i++) {
        const s1 = drawR(items[i], { x: p.x + xo, y: p.y + size.h / 2 - hs[i].h / 2 }, d);
        xo += s1.w;

        if (i !== N - 1) {
          if (d) rtv.ctx.fillText(';', p.x + xo, cally);
        }
        xo += CHAR.SIZE;
      }

      xo -= CHAR.SIZE;

      size.w = xo;
    } else if (o.items) {
      // array

      const items = o.items;
      let h = 0;

      // get height of all args
      const N = items.length;
      const hs = [];
      for (let i = 0; i < N; i++) {
        const s1 = drawR(items[i], { x: 0, y: 0 }, false);
        hs.push(s1);

        h = Math.max(h, s1.h);
      }

      size.h = h;

      // draw it
      const cally = p.y + size.h / 2 - CHAR.SIZE;
      let xo = CHAR.SIZE; // first open bracket

      for (let i = 0; i < N; i++) {
        const s1 = drawR(items[i], { x: p.x + xo, y: p.y + size.h / 2 - hs[i].h / 2 }, d);
        xo += s1.w;

        if (i !== N - 1) {
          if (d) rtv.ctx.fillText(',', p.x + xo, cally);
        }
        xo += CHAR.SIZE;
      }

      rtv.ctx.save();
      rtv.ctx.scale(1, size.h / (CHAR.SIZE * 2));
      if (d) rtv.ctx.fillText('[', p.x, cally);
      if (d) rtv.ctx.fillText(']', p.x + xo - CHAR.SIZE, cally);
      rtv.ctx.restore();

      size.w = xo;
    } else if (o.expr) {
      // function definition
      const s1 = drawR(o.expr, { x: 0, y: 0 }, false);

      text = o.name;
      text += `(${o.params.join(',')}) = `;

      if (d) {
        rtv.ctx.save();
        rtv.ctx.translate(p.x, p.y + s1.h - CHAR.SIZE * 2);
        drawSimple(text);
        rtv.ctx.restore();
      }

      const xo = text.length * CHAR.SIZE;

      drawR(o.expr, { x: p.x + xo, y: p.y }, d);

      size.w = xo + s1.w;
      size.h = s1.h;
    } else {
      if (d) {
        const N = text.length;
        for (let i = 0; i < N; i++) {
          rtv.ctx.fillText(text[i], p.x + i * CHAR.SIZE, p.y);
        }
      }

      size.w = text.length * CHAR.SIZE;
      size.h = CHAR.SIZE * 2;
    }
  }

  if (rtv.debug && d) rtv.ctx.strokeRect(p.x, p.y, size.w, size.h);

  return size;
}

export function drawVect(_x, _y, _z, x, y, z) {
  let a = rtv.cam.graph_to_screen(_x, _y, _z);
  let b = rtv.cam.graph_to_screen(x, y, z);

  a = { x: a[0], y: a[1] };
  b = { x: b[0], y: b[1] };

  rtv.ctx.beginPath();
  rtv.ctx.moveTo(a.x, a.y);
  rtv.ctx.lineTo(b.x, b.y);
  rtv.ctx.stroke();

  // draw an arrow head
  const theta = Math.atan2(b.y - a.y, b.x - a.x);

  rtv.ctx.beginPath();
  rtv.ctx.moveTo(b.x, b.y);
  rtv.ctx.lineTo(
    b.x + Math.cos(theta - Math.PI * 3 / 4) * 15,
    b.y + Math.sin(theta - Math.PI * 3 / 4) * 15,
  );
  rtv.ctx.moveTo(b.x, b.y);
  rtv.ctx.lineTo(
    b.x + Math.cos(theta + Math.PI * 3 / 4) * 15,
    b.y + Math.sin(theta + Math.PI * 3 / 4) * 15,
  );
  rtv.ctx.stroke();
}

export function drawBrackets(sx, sy, width, height) {
  rtv.ctx.beginPath();
  rtv.ctx.moveTo(sx + 7, sy);
  rtv.ctx.lineTo(sx, sy);
  rtv.ctx.lineTo(sx, sy + height);
  rtv.ctx.lineTo(sx + 7, sy + height);
  rtv.ctx.stroke();

  rtv.ctx.beginPath();
  rtv.ctx.moveTo(sx + width - 7, sy);
  rtv.ctx.lineTo(sx + width, sy);
  rtv.ctx.lineTo(sx + width, sy + height);
  rtv.ctx.lineTo(sx + width - 7, sy + height);
  rtv.ctx.stroke();
}

export function drawNetwork(layers, pos) {
  const pad = 120;
  const radius = 20;

  const pad2 = 250;
  // [pos[0] - pad2/2 - j*(pad2+80), pos[1] + pad2/2 - pad2 * units/2 + i*pad2];
  const loc = (i, j, units) => [
    pos[0] - pad2 * units / 2 + pad2 / 2 + i * pad2,
    -pad + pos[1] - j * pad2,
  ];

  // connections
  for (let j = 0; j < layers.length - 1; j++) {
    const units = layers[j];
    const unitsNext = layers[j + 1];

    for (let i = 0; i < units; i++) {
      const p = loc(i, j, units);

      for (let k = 0; k < unitsNext; k++) {
        const p2 = loc(k, j + 1, unitsNext);

        const l = new Shape([0, 0, 0, 1], [{ x: p[0], y: p[1] }, { x: p2[0], y: p2[1] }]);
        rtv.objs.push(l);
      }
    }
  }

  // neurons
  for (let j = 0; j < layers.length; j++) {
    const units = layers[j];

    for (let i = 0; i < units; i++) {
      const p = loc(i, j, units);
      const c = new Circle([1, 1, 1, 1], { x: p[0], y: p[1] });
      c.properties[rtv.frame].fill = [255, 255, 255, 255]; // white fill
      rtv.objs.push(c);
    }
  }
}

const cacheFn = {};
export function drawFn(fn) {
  let tree;

  if (cacheFn[fn]) {
    tree = cacheFn[fn];
  } else {
    try {
      tree = math.parse(fn);
    } catch (e) {

    }

    if (tree) {
      cacheFn[fn] = tree;
    }
  }

  if (!tree) {
    return { w: 0, h: 0 };
  }

  rtv.ctx.save();
  rtv.ctx.textAlign = 'left';
  rtv.ctx.textBaseline = 'top';
  const size = drawR(tree, { x: 0, y: 0 }, false);
  drawR(tree, { x: 0, y: -size.h / 2 }, true);
  rtv.ctx.restore();

  return size;
}

export function matrixSize(matrix) {
  if (matrix && matrix.length === 0) {
    return;
  }

  const pad = 24;

  return [matrix[0].length * (MAT_NUM_WIDTH + pad), matrix.length * GRID_SIZE];
}

export function drawMatrix(matrix, colorIJ) {
  rtv.ctx.save();
  rtv.ctx.textAlign = 'right';

  const pad = 24;

  let shift = 0;
  if (rtv.keys.ctrl) {
    shift = 24;
  }

  const maxWidth = MAT_NUM_WIDTH - 10;

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (colorIJ) {
        colorIJ(i, j);
      }
      rtv.ctx.fillText(
        matrix[i][j],
        j * (MAT_NUM_WIDTH + pad) + 124 + shift,
        i * GRID_SIZE + 20,
        maxWidth,
      );
    }
  }

  const size = matrixSize(matrix);
  drawBrackets(0, 0, size[0], size[1]);

  rtv.ctx.restore();
}

export function formatMatrix(matrix) {
  if (matrix.length === 0) {
    return null;
  }

  // format for display
  const formatted = [];
  let round = prettyRoundOne;

  if (rtv.keys.ctrl) {
    round = prettyRound;
  }

  if (typeof matrix[0] === 'number') {
    // array
    for (let i = 0; i < matrix.length; i++) {
      formatted.push([round(matrix[i])]);
    }
  } else {
    // matrix
    for (let i = 0; i < matrix.length; i++) {
      const row = [];
      for (let j = 0; j < matrix[i].length; j++) {
        row.push(round(matrix[i][j]));
      }

      formatted.push(row);
    }
  }

  return formatted;
}

export function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  let x; let
    y;

  if (evt.touches) {
    for (let i = 0; i < evt.touches.length; i++) {
      if (evt.touches[i].touchType === 'stylus') {
        return {
          x: (evt.touches[i].clientX - rect.left) * SCALE_FACTOR,
          y: (evt.touches[i].clientY - rect.top) * SCALE_FACTOR,
        };
      }
    }
  }

  return {
    x: (evt.clientX - rect.left) * SCALE_FACTOR,
    y: (evt.clientY - rect.top) * SCALE_FACTOR,
  };
}

export function constrainToGrid(p) {
  const gs = GRID_SIZE / 4;
  return { x: Math.floor((p.x + gs / 2) / gs) * gs, y: Math.floor((p.y + gs / 2) / gs) * gs };
}

export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function between(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function grad2(c, x, y) {
  // c is compiled obj
  // depends on x and y
  const h = 0.0001;

  parser.set('x', x + h);
  const fxh = c.evaluate(parser.scope);
  parser.set('x', x);
  const fx = c.evaluate(parser.scope);

  parser.set('y', y + h);
  const fyh = c.evaluate(parser.scope);
  parser.set('y', y);
  const fy = c.evaluate(parser.scope);

  return [(fxh - fx) / h, (fyh - fy) / h];
}

export function rotationMatrix(rx, ry, rz) {
  const Rx = [[1, 0, 0],
    [0, Math.cos(rx), -Math.sin(rx)],
    [0, Math.sin(rx), Math.cos(rx)]];

  const Ry = [[Math.cos(ry), 0, Math.sin(ry)],
    [0, 1, 0],
    [-Math.sin(ry), 0, Math.cos(ry)]];

  const Rz = [[Math.cos(rz), -Math.sin(rz), 0],
    [Math.sin(rz), Math.cos(rz), 0],
    [0, 0, 1]];

  return math.multiply(math.multiply(Rx, Ry), Rz);
}

export function sigmoid(x, num, offset, width) {
  return num / (1.0 + Math.exp(-(x + offset) * width));
}

export function easeInOut(x) {
  return 1.0 / (1.0 + Math.exp(-(x - 0.5) * 10));
}

export function copy(d) {
  return JSON.parse(JSON.stringify(d));
}

function changeFrames() {
  for (let i = 0; i < rtv.objs.length; i++) {
    const obj = rtv.objs[i];
    if (obj.properties[rtv.frame] && obj.properties[rtv.next_frame] == null) {
      obj.properties[rtv.next_frame] = copy(obj.properties[rtv.frame]);
      if (rtv.next_frame < rtv.frame) {
        // make that shit transparent?
        obj.properties[rtv.next_frame].c[3] = 0.0;
      }
    }
  }
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ] : null;
}

export function transformProps(e, props, step = 0.2) {
  const transformations = {
    l: (p) => ({ w: p.w + 1 }),
    j: (p) => ({ w: p.w - 1 }),
    i: (p) => ({ h: p.h + 1 }),
    k: (p) => ({ h: p.h - 1 }),
    u: (p) => ({ r: p.r - Math.PI / 12 }),
    o: (p) => ({ r: p.r + Math.PI / 12 }),
  };

  if (e.key in transformations) {
    e.preventDefault();
    return { ...props, ...transformations[e.key](props) };
  }

  return props;
}

export function constrain(v) {
  return Math.min(1, Math.max(0, v));
}

function interpolateColors(ac, bc, interp) {
  let same = true;
  const N = ac.length;
  for (let i = 0; i < N; i++) {
    if (ac[i] !== bc[i]) {
      same = false;
    }
  }

  if (same) {
    return ac;
  }

  const ic = new Array(N);

  for (let i = 0; i < N; i++) {
    ic[i] = (1 - interp) * ac[i] + interp * bc[i];
  }

  return ic;
}

export function interpolate(a, b) {
  if (!b) {
    return a;
  }

  const interp = {};
  for (const key in a) {
    if (key === 'p') {
      // interpolate position
      const ap = a[key];
      const bp = b[key];

      interp[key] = {
        x: (1 - rtv.t_ease) * ap.x + rtv.t_ease * bp.x,
        y: (1 - rtv.t_ease) * ap.y + rtv.t_ease * bp.y,
      };
    } else if (key === 'w' || key === 'h' || key === 'r' || key === 'a_s' || key === 'a_e') {
      // interpolate width, height, or rotation
      const aw = a[key];
      const bw = b[key];
      interp[key] = (1 - rtv.t_ease) * aw + rtv.t_ease * bw;
    } else if (key === 'rxyz') {
      const ar = a[key];
      const br = b[key];
      interp[key] = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        interp[key][i] = (1 - rtv.t_ease) * ar[i] + rtv.t_ease * br[i];
      }
    } else if (key === 'c') {
      // interpolate colors
      const ac = a[key];
      const bc = b[key];
      interp[key] = interpolateColors(ac, bc, constrain(rtv.t_ease));
    } else if (key === 'path') {
      // interpolate paths
      const ap = a[key];
      const bp = b[key];
      const N = ap.length;
      const ip = new Array(N);
      for (let i = 0; i < N; i++) {
        const newp = {
          x: (1 - rtv.t_ease) * ap[i].x + rtv.t_ease * bp[i].x,
          y: (1 - rtv.t_ease) * ap[i].y + rtv.t_ease * bp[i].y,
        };
        ip[i] = newp;
      }

      interp[key] = ip;
    } else if (key === 't') {
      if (rtv.t_ease < 0.5) {
        interp[key] = a[key];
      } else {
        interp[key] = b[key];
      }
    } else {
      interp[key] = a[key];
    }
  }

  return interp;
}

export function textArrayToObjs(arr, keepAnimation) {
  const newObjs = [];
  for (let i = 0; i < arr.length; i++) {
    const o = arr[i];
    let newObj = null;

    if (o.type === 'Shape') {
      newObj = new Shape();
    } else if (o.type === 'Circle') {
      newObj = new Circle();
    } else if (o.type === 'Text') {
      newObj = new Text();
    }

    if (keepAnimation) {
      newObj.properties = o.properties;
    } else {
      newObj.properties = {};
      newObj.properties[rtv.frame] = o.properties[1];
      newObj.select();
    }

    newObjs.push(newObj);
  }

  return newObjs;
}

function stateToString() {
  return JSON.stringify({
    num_frames: rtv.num_frames, frame: rtv.frame, objs: rtv.objs, cam: rtv.cam, pen: rtv.pen,
  });
}

function strToState(str) {
  const dict = JSON.parse(str);
  const arr = dict.objs;

  if (dict.num_frames) {
    rtv.num_frames = dict.num_frames;
  }

  if (dict.frame) {
    rtv.frame = dict.frame;
    rtv.frames.create_buttons();
  }

  if (dict.pen) {
    rtv.pen = new Pen();
    rtv.pen.drawings = dict.pen.drawings;
  }

  if (dict.cam && dict.cam.properties) {
    rtv.cam = new Camera();
    rtv.cam.properties = dict.cam.properties;
    rtv.cam.update_props();
  }

  rtv.objs = textArrayToObjs(arr, true);
}

export function saveState() {
  // save state
  const str = stateToString();
  if (states.length > 0) {
    const last = states[states.length - 1];
    if (str !== last) {
      states.push(str);
    }
  } else {
    states = [str];
  }
}

export function undo() {
  if (states.length > 1) {
    states = states.splice(0, states.length - 1);
    strToState(states[states.length - 1]);
  }
}

export function save(objs) {
  const str = stateToString();
  const blob = new Blob([str], { type: 'text/plain;charset=utf-8' });
  const name = document.getElementById('name').value;
  saveAs(blob, name);
}

export function load(evt) {
  const files = evt.target.files; // FileList object
  const f = files[0];

  const reader = new FileReader();

  reader.addEventListener('load', ({ target: { result: string } }) => strToState(string));

  reader.readAsText(f);
}

export function saveLocal() {
  localStorage.setItem('page', stateToString());
}

export function loadLocal() {
  // Grab the objects from storage
  const page = localStorage.getItem('page');
  if (page && page.length) {
    strToState(page);
  }
}

export function insertFrame() {
  rtv.num_frames += 1;
  for (let f = rtv.num_frames; f >= rtv.frame; f--) {
    for (let i = 0; i < rtv.objs.length; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.copy_properties === 'function') {
        if (!obj.properties[f]) {
          continue;
        }
        obj.copy_properties(f, f + 1);
      }
    }

    if (rtv.cam.properties[f]) {
      rtv.cam.properties[f + 1] = copy(rtv.cam.properties[f]);
    }
  }
  rtv.frames.create_buttons();
}

export function enterSelect() {
  rtv.tool = 'select';
  rtv.new_line = null;
}

/**
 * Enters presentation mode.
 */
export function present() {
  /**
     * Sets page up for presentation mode.
     */
  function setUpPresentationMode() {
    enterSelect(); // Enter select mode
    document.body.style.cursor = 'none'; // Hide cursor
    document.body.style.overflow = 'hidden'; // Disable and hide scrollbars
    rtv.presenting = true; // Declare presentation mode entered
  }

  if (window.scrollY !== 0) { // Check if already at top
    window.scrollTo({
      top: 0, // Scroll to top
      behavior: 'smooth', // Smooth scroll
    }); // Scroll window

    /**
         * Sets up presentation mode once window is scrolled to top.
         */
    function scrollListener() { // Scroll listener
      if (window.scrollY === 0) { // Check if smooth scroll finished
        window.removeEventListener('scroll', scrollListener); // Stop listening
        setUpPresentationMode();
      }
    }
    window.addEventListener('scroll', scrollListener); // Attach scroll listener
  } else {
    setUpPresentationMode();
  }
}

function constrainFrame(f) {
  return Math.max(1, Math.min(rtv.num_frames, f));
}

export function loopFrame(f) {
  if (f >= rtv.num_frames + 1) {
    return 1;
  } if (f < 1) {
    return rtv.num_frames;
  }

  return f;
}

export function drawAxes(ctx) {
  if (!rtv.cam.R) {
    return;
  }

  ctx.save();

  let csysStyle = rtv.cam.style();
  let props = rtv.cam.properties[rtv.frame];

  // do a fade in and out
  if (rtv.transition.transitioning) {
    const csysNextStyle = rtv.cam.properties[rtv.next_frame].style;

    if (csysNextStyle != null && csysNextStyle !== csysStyle) {
      // changing text
      const constrained = constrain(rtv.t_ease);
      ctx.globalAlpha = Math.cos(constrained * 2 * Math.PI) / 2 + 0.5;
      if (constrained >= 0.5) {
        csysStyle = csysNextStyle;
        if (rtv.cam.properties[rtv.next_frame]) {
          props = rtv.cam.properties[rtv.next_frame];
        }
      }
    }
  }

  if (csysStyle === '3d' || csysStyle === 'flat') {
    // draw gridlines
    ctx.strokeStyle = '#DDDDDD';

    if (csysStyle === '3d') {
      let axis = rtv.cam.ticks[0];
      axis = math.matrix(axis);
      axis = rtv.cam.graph_to_screen_mat(axis);
      const N = axis.length;
      for (let j = 0; j < N; j += 2) {
        if (j === 20 || j === 62) {
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(axis[j][0], axis[j][1]);
        ctx.lineTo(axis[j + 1][0], axis[j + 1][1]);
        ctx.stroke();
      }
    } else {
      const w = rtv.c.clientWidth * 2;
      const h = rtv.c.clientHeight * 2;

      const dx = GRID_SIZE * props.w;
      const dy = GRID_SIZE * props.h;

      const p = rtv.cam.graph_to_screen(0, 0, 0);

      for (let x = p[0] % dx; x < w; x += dx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let y = p[1] % dy; y < h; y += dy) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';

    // center
    const c = rtv.cam.graph_to_screen(0, 0, 0);

    // axes
    let axes = math.matrix([[10, 0, 0],
      [0, 10, 0],
      [0, 0, 10],
      [-10, 0, 0],
      [0, -10, 0],
      [0, 0, -10]]);

    axes = rtv.cam.graph_to_screen_mat(axes);

    let labels;
    if (rtv.cam.axes_names) {
      labels = rtv.cam.axes_names;
    } else {
      labels = ['x', 'y', 'z'];
    }

    const colors = ['#FF0000', '#00FF00', '#0000FF'];

    const N = axes.length;
    for (let i = 0; i < N; i++) {
      ctx.fillStyle = colors[i % 3];
      ctx.strokeStyle = colors[i % 3];

      const x = axes[i][0];
      const y = axes[i][1];

      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = 0;

    for (let i = 0; i < 3; i++) {
      const x = axes[i][0];
      const y = axes[i][1];

      ctx.beginPath();
      ctx.fillStyle = '#FFFFFF';
      ctx.arc(x, y, 16, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = colors[i % 3];
      ctx.strokeStyle = colors[i % 3];
      ctx.fillText(labels[i], x, y);
    }
  }

  ctx.restore();
}

export function transitionWithNext(next) {
  if (rtv.transition.transitioning) {
    return;
  }

  if (next > rtv.num_frames) {
    return;
  }

  if (rtv.tool === 'copy frame') {
    enterSelect();
    // copy properties
    for (let i = 0; i < rtv.objs.length; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.copy_properties === 'function') {
        obj.copy_properties(rtv.frame, next);
      }
    }

    return;
  }

  rtv.new_line = null;
  rtv.next_frame = next;
  changeFrames();
  let steps = T_STEPS;
  if (!rtv.presenting || rtv.keys.meta || rtv.keys.ctrl) {
    // make it instant when menu open
    steps = 0;
  }

  rtv.transition.run(steps, next, (targ) => {
    rtv.frame = targ;
    parser.set('frame', rtv.frame);

    rtv.objs.forEach((obj) => {
      if (typeof obj.parse_text === 'function') {
        obj.parse_text(obj.properties[rtv.frame].t);
      }

      if (typeof obj.eval === 'function') {
        obj.eval();
      }
    });
  });
}

export function drawCursor() {
  if (rtv.presenting && rtv.tool === 'pen') {
    const pad = 20;

    rtv.ctx.save();

    rtv.ctx.translate(rtv.mouse.pos.x, rtv.mouse.pos.y);

    rtv.ctx.strokeStyle = rtv.pen.color;

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, 0);
    rtv.ctx.lineTo(pad / 2, pad);
    rtv.ctx.moveTo(0, 0);
    rtv.ctx.lineTo(-pad / 2, pad);

    rtv.ctx.stroke();
    rtv.ctx.restore();
  } else if (rtv.presenting && rtv.mouse.time > 0) {
    // draw a cursor

    const mx = rtv.mouse.pos.x;
    const my = rtv.mouse.pos.y;

    rtv.ctx.save();
    rtv.ctx.translate(mx, my);
    rtv.ctx.strokeStyle = DARK;
    rtv.ctx.beginPath();

    if (rtv.mouse.down) {
      rtv.mouse.time = MOUSE_DURATION;

      rtv.ctx.arc(0, 0, 10, 0, PI2, 0);
    } else {
      const pad = 20;

      if (rtv.tool === 'camera') {
        rtv.ctx.moveTo(-pad, 0);
        rtv.ctx.lineTo(pad, 0);
        rtv.ctx.moveTo(0, -pad);
        rtv.ctx.lineTo(0, pad);
      } else {
        rtv.ctx.moveTo(pad, 0);
        rtv.ctx.lineTo(0, 0);
        rtv.ctx.lineTo(0, pad);
        rtv.ctx.moveTo(0, 0);
        rtv.ctx.lineTo(pad, pad);
      }
    }

    rtv.ctx.stroke();
    rtv.ctx.restore();
  }
}

/**
 * Draws a solid background.
 * @param {CanvasRenderingContext2D} ctx Canvas context.
 * @param {string} color Background color.
 */
export function drawBackground(ctx, color) {
  ctx.save(); // Save canvas state
  ctx.globalCompositeOperation = 'destination-over'; // Draw underneath existing content
  ctx.fillStyle = color; // Set fill style to requested background color
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Draw filled rectangle to cover surface
  ctx.restore(); // Restore canvas state
}
