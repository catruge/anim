import Camera from './graphics/camera';
import Circle from './tools/circle';
import Frames, { configureCanvas } from './graphics/frames';
import Menu from './ui/menu';
import Network from './tools/network';
import Pen from './tools/pen';
import Shape from './tools/shape';
import RecordingManager from './graphics/recording-manager';
import Text from './tools/text';
import Transition from './graphics/transition';
import initVolumeMeter from './audio/volume-meter';
import * as utils from './utils';
import {
  rtv,
  math,
  parser,
  DARK,
  CANVAS_BG,
  COLORS,
  FONT,
  GRID_SIZE,
  MOUSE_DURATION,
  PI2,
} from './resources';

// http://www.javascriptkit.com/javatutors/requestanimationframe.shtml
window.requestAnimationFrame
    ??= window.mozRequestAnimationFrame
    ?? window.webkitRequestAnimationFrame
    ?? window.msRequestAnimationFrame
    ?? ((f) => setTimeout(f, 1000 / rtv.fps)); // simulate calling code 60

math.import({
  logicTable() {
    const O = [true, false];

    for (let k = 0; k < arguments.length; k++) {
      rtv.ctx.save();
      const s = utils.copy(arguments[k]);

      const props = parser.evaluate('text_props');
      const x = props.p.x;
      const y = props.p.y;
      rtv.ctx.translate(x + 5 * GRID_SIZE * k, y + GRID_SIZE);
      rtv.ctx.fillText(s, 0, 0);

      for (let i = 0; i < 2; i++) {
        const p = O[i];

        for (let j = 0; j < 2; j++) {
          const q = O[j];

          s.replace('P', p);
          s.replace('Q', q);
          const r = math.beval(s);

          if (r) {
            rtv.ctx.fillStyle = COLORS[4];
            rtv.ctx.fillText('T', 0, GRID_SIZE);
          } else {
            rtv.ctx.fillStyle = COLORS[1];
            rtv.ctx.fillText('F', 0, GRID_SIZE);
          }

          rtv.ctx.beginPath();
          rtv.ctx.strokeStyle = COLORS[5];
          rtv.ctx.moveTo(0, GRID_SIZE / 2 - 2);
          rtv.ctx.lineTo(GRID_SIZE * 5, GRID_SIZE / 2 - 2);
          rtv.ctx.stroke();

          rtv.ctx.translate(0, GRID_SIZE);
        }
      }

      rtv.ctx.restore();
    }
  },
  implies(p, q) { // LOGIC: Returns whether p => q is a true statement. Only false when p=T and q=F
    return utils.implies(p, q);
  },
  beval(statement) { // LOGIC: Boolean evaluation, "true^false||true"
    return eval(statement
      .toLowerCase()
      .replace('^', '&&'));
  },
  // eslint-disable-next-line max-len
  tautology(statement) { // LOGIC: "P&&Q||false" tries all combinations of true and false for p and q, returns true if f is always true
    const O = [true, false];

    for (let i = 0; i < 2; i++) {
      const p = O[i];
      for (let j = 0; j < 2; j++) {
        const q = O[j];

        const s = utils.copy(statement);
        s.replace('P', p);
        s.replace('Q', q);

        if (!math.beval(s)) {
          return false;
        }
      }
    }

    return true;
  },
  // eslint-disable-next-line max-len
  contradiction(statement) { // LOGIC: "P&&Q||false" tries all combinations of true and false for p and q, returns true if f is always false
    const O = [true, false];

    for (let i = 0; i < 2; i++) {
      const p = O[i];
      for (let j = 0; j < 2; j++) {
        const q = O[j];

        const s = utils.copy(statement);
        s.replace('P', p);
        s.replace('Q', q);

        if (math.beval(s)) {
          return false;
        }
      }
    }

    return true;
  },
  egg({ _data: f }) {
    const radius = 100;

    let col = 'white';
    if (f[0]) {
      col = 'white';
    } else if (f[1]) {
      col = COLORS[3];
    } else if (f[2]) {
      col = COLORS[4];
    }

    let scol = 'white';
    if (f[3]) {
      scol = 'white';
    } else if (f[4]) {
      scol = COLORS[3];
    } else if (f[5]) {
      scol = COLORS[4];
    }

    let spots = 0;
    if (f[6]) {
      spots = 1;
    } else if (f[7]) {
      spots = 3;
    } else if (f[8]) {
      spots = 5;
    }

    const hairy = f[10];

    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const x = props.p.x;
    const y = props.p.y;
    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h * 1.2);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.beginPath();
    rtv.ctx.arc(x, y, radius, 0, 2 * math.PI, 0);
    rtv.ctx.fillStyle = col;
    rtv.ctx.strokeStyle = 'black';
    rtv.ctx.fill();
    rtv.ctx.stroke();

    const da = 2 * math.PI / math.max(spots, 1);
    for (let i = 0; i < spots; i++) {
      const a = da * i;
      rtv.ctx.beginPath();
      rtv.ctx.arc(x + math.cos(a) * (20 + spots * 2) + 30,
        y + math.sin(a) * (20 + spots * 2) + 30,
        10, 0, 2 * math.PI, 0);
      rtv.ctx.fillStyle = scol;
      rtv.ctx.fill();
      rtv.ctx.stroke();
    }

    if (hairy) {
      const n = 40;
      const da = 2 * math.PI / n;
      for (let i = 0; i < n; i++) {
        const a = da * i;

        const sx = x + math.cos(a) * radius;
        const sy = y + math.sin(a) * radius;

        rtv.ctx.beginPath();

        rtv.ctx.moveTo(sx,
          sy);

        rtv.ctx.lineTo(sx + math.cos(a) * 15,
          sy + math.sin(a) * 15);

        rtv.ctx.stroke();
      }
    }

    rtv.ctx.restore();
  },
  rad(deg) { // converts to radians
    return deg * math.pi / 180;
  },
  deg(rad) { // converts to degrees
    return rad * 180.0 / math.pi;
  },
  loop(fn, count) { // function of index 0 to count-1
    if (count <= 0) {
      return;
    }

    for (let i = 0; i < count; i++) {
      fn(i);
    }
  },
  fifo(matrix, value) {
    return math.matrix(matrix
      .toArray()
      .slice(1)
      .concat(value));
  },
  push(matrix, value) {
    return math.concat(matrix, [value]);
  },
  dims(m) {
    return math.matrix(m.size());
  },
  surface(fn) {
    const d = 21; const d2 = d / 2;
    const dims = [d * d, 3];
    const m = utils.cached(dims);
    let md = m._data;

    let xin = 0; let zin = 0; let yout = 0;
    let i = 0;
    for (let x = 0; x < d; x++) {
      for (let z = 0; z < d; z++) {
        xin = (x - d2) + 0.5;
        zin = (z - d2) + 0.5;
        yout = fn(xin, zin);
        md[i][0] = xin;
        md[i][1] = yout;
        md[i][2] = zin;
        i += 1;
      }
    }

    md = rtv.cam.graph_to_screen_mat(m);

    i = 0;
    for (let x = 0; x < d; x++) {
      rtv.ctx.beginPath();
      let xc = md[i][0];
      let yc = md[i][1];
      rtv.ctx.moveTo(xc, yc);

      for (let z = 0; z < d; z++) {
        xc = md[i][0];
        yc = md[i][1];

        rtv.ctx.lineTo(xc, yc);

        i += 1;
      }

      rtv.ctx.stroke();

      rtv.ctx.beginPath();
      xc = md[x][0];
      yc = md[x][1];
      rtv.ctx.moveTo(xc, yc);

      for (let j = 0; j < dims[0]; j += d) {
        xc = md[x + j][0];
        yc = md[x + j][1];

        rtv.ctx.lineTo(xc, yc);
      }

      rtv.ctx.stroke();
    }
  },
  surfacez(fn) {
    const d = 21; const d2 = d / 2;
    const dims = [d * d, 3];
    const m = utils.cached(dims);
    let md = m._data;

    let a = 0; let b = 0;
    let i = 0;
    for (let x = 0; x < d; x++) {
      for (let z = 0; z < d; z++) {
        a = (x - d2) + 0.5;
        b = (z - d2) + 0.5;
        md[i][0] = a;
        md[i][1] = b;
        md[i][2] = fn(a, b);
        i += 1;
      }
    }

    md = rtv.cam.graph_to_screen_mat(m);

    i = 0;
    for (let x = 0; x < d; x++) {
      rtv.ctx.beginPath();
      let xc = md[i][0];
      let yc = md[i][1];
      rtv.ctx.moveTo(xc, yc);

      for (let z = 0; z < d; z++) {
        xc = md[i][0];
        yc = md[i][1];

        rtv.ctx.lineTo(xc, yc);

        i += 1;
      }

      rtv.ctx.stroke();

      rtv.ctx.beginPath();
      xc = md[x][0];
      yc = md[x][1];
      rtv.ctx.moveTo(xc, yc);

      for (let j = 0; j < dims[0]; j += d) {
        xc = md[x + j][0];
        yc = md[x + j][1];

        rtv.ctx.lineTo(xc, yc);
      }

      rtv.ctx.stroke();
    }
  },
  randn() { // no args: random normal, 1 arg shape: dims of matrix to return
    const N = arguments.length;
    if (N === 1) {
      const shape = arguments[0];
      let m = utils.cached(shape._data);
      m = m.map(utils.randNBm);

      return m;
    }
    return utils.randNBm();
  },
  axes(x, y, z) { // replace default camera axis names
    rtv.cam.axes_names = [x, y, z];
  },
  block() { // exectutes each argument
  },
  rotation(rx, ry, rz) { // creates a 3x3 rotation matrix
    return math.matrix(utils.rotationMatrix(rx, ry, rz));
  },
  grid(rangex, rangey = rangex) { // returns matrix x*y by 2
    const xd = rangex._data;
    const yd = rangey._data;
    const xN = xd.length; const yN = yd.length;
    const m = utils.cached([xN * yN, 2]);

    let idx = 0;

    for (let i = 0; i < xN; i++) {
      for (let j = 0; j < yN; j++) {
        const row = m._data[idx];
        row[0] = xd[i];
        row[1] = yd[j];
        idx += 1;
      }
    }

    return m;
  },
  rotateCamera(rx, ry, rz) { // rotates the camera
    const rxyz = [rx, ry, rz];
    if (!isNaN(math.sum(rxyz))) {
      rtv.cam.properties[rtv.frame].rxyz = rxyz;
    } else {
      rtv.cam.properties[rtv.frame].rxyz = [0, 0, 0];
    }
  },
  T(m) { // transpose m
    return math.transpose(m);
  },
  // eslint-disable-next-line max-len
  scatter(points, pointSize, colorFn) { // points [[x1, y1, z1], ...], psize, color([x,y,z])=[r,g,b] 0 <= r <= 1
    const size = points.size();
    const n = size[0];
    const pointsD = points._data;

    let psize = 8;
    if (arguments.length >= 2) {
      psize = arguments[1];
    }
    const psizeHalf = psize / 2;

    const camData = rtv.cam.graph_to_screen_mat(points);

    rtv.ctx.save();
    if (arguments.length === 3) {
      // gradation

      const indices = new Array(n);
      for (let i = 0; i < n; ++i) indices[i] = i;

      indices
        .map((i) => camData[i][2])
        .sort((a, b) => (a < b ? 1 : (a > b ? -1 : 1)));

      let col;
      for (let j = 0; j < n; j++) {
        const i = indices[j];

        const p = pointsD[i];

        // constrain
        col = colorFn(p)._data;
        col = [utils.constrain(col[0]), utils.constrain(col[1]), utils.constrain(col[2])];
        rtv.ctx.fillStyle = utils.rgbToHex(math.multiply(col, 255));
        rtv.ctx.fillRect(camData[i][0] - psizeHalf, camData[i][1] - psizeHalf, psize, psize);
      }
    } else {
      for (let i = 0; i < n; i++) {
        rtv.ctx.fillRect(camData[i][0] - psizeHalf, camData[i][1] - psizeHalf, psize, psize);
      }
    }
    rtv.ctx.restore();
  },
  point(a, size, color) { // point [x,y,z] size color[r,g,b]
    let psize = 8;
    if (size) {
      psize = size;
    }

    if (psize <= 0) {
      return;
    }

    const camData = rtv.cam.graph_to_screen_mat(math.matrix([a]))[0];

    rtv.ctx.save();
    rtv.ctx.beginPath();
    if (color) {
      const constrained = color.map(utils.constrain);
      rtv.ctx.fillStyle = utils.rgbToHex(math.multiply(constrained, 255).toArray());
    }
    rtv.ctx.arc(camData[0], camData[1], psize, 0, PI2);
    rtv.ctx.fill();

    rtv.ctx.restore();
  },
  graph(fn) { // graphs y=f(x)
    utils.graph(fn, 0, 1, 2);
  },
  // eslint-disable-next-line max-len
  paral(r, tmin, tmax, units) { // parametric line, graphs r(t)=[f(t), g(t), h(t)] from t=tmin to tmax
    utils.para(r, tmin, tmax, units);
  },
  graphxy(fn) { // graphs y=f(x)
    utils.graph(fn, 0, 1, 2);
  },
  graphyx(fn) { // graphs x=f(y)
    utils.graph(fn, 1, 0, 2);
  },
  graphxz(fn) {
    utils.graph(fn, 0, 2, 1);
  },
  graphyz(fn) {
    utils.graph(fn, 1, 2, 0);
  },
  draw(points, fill) { // draws line from point to point [[x1,y1,z1], ...], draws arrow
    const N = points.size()[0];
    const mapped = rtv.cam.graph_to_screen_mat(points);

    rtv.ctx.save();
    rtv.ctx.beginPath();
    let p; let lastp;
    for (let i = 0; i < N; i++) {
      p = mapped[i];
      if (i === 0) {
        rtv.ctx.moveTo(p[0], p[1]);
      } else {
        rtv.ctx.lineTo(p[0], p[1]);
      }

      lastp = p;
    }
    rtv.ctx.stroke();
    if (fill) {
      const col = fill._data.map(utils.constrain);
      rtv.ctx.fillStyle = utils.rgbToHex(math.multiply(col, 255));
      rtv.ctx.globalAlpha = 0.8;
      rtv.ctx.fill();
    }
    rtv.ctx.restore();
  },
  drawxy(xs, ys) {
    const N = xs.size()[0];
    const m = utils.cached([N, 3]);
    for (let i = 0; i < N; i++) {
      m._data[i][0] = xs._data[i];
      m._data[i][1] = ys._data[i];
      m._data[i][2] = 0;
    }

    math.draw(m);
  },
  oval(_p, hr, vr, _n) {
    let n = 10;
    if (arguments.length >= 4) {
      n = _n;
    }

    const path = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n * 2 * math.PI;
      const p = math.add(_p, [math.cos(t) * hr, math.sin(t) * vr, 0]);
      path.push(p);
    }

    return math.matrix(path);
  },
  vect(a, b) {
    if (!a) {
      return;
    }

    const aL = 're' in a && a.im
      ? math.matrix([a.re, a.im])
      : a;

    const bL = b && b.re && b.im
      ? math.matrix([b.re, b.im])
      : b;

    let _x = 0;
    let _y = 0;
    let _z = 0;

    let x = 0;
    let y = 0;
    let z = 0;

    if (!bL) {
      x = aL._data[0];
      y = aL._data[1];

      if (aL.size()[0] === 3) {
        z = aL._data[2];
      }
    } else {
      _x = aL._data[0];
      _y = aL._data[1];

      if (aL.size()[0] === 3) {
        _z = aL._data[2];
      }

      x = bL._data[0];
      y = bL._data[1];

      if (bL.size()[0] === 3) {
        z = bL._data[2];
      }
    }

    utils.drawVect(_x, _y, _z, x, y, z);
  },
  if(fnCondition, fnA, fnB) { // if fn_condition() == true then fn_a() else fn_b()
    if (fnCondition()) {
      fnA();
    } else {
      fnB();
    }
  },
  list(fn, array) { // [fn(v) for v in array]
    const N = array.size()[0];
    const d = array._data;

    let v = fn(d[0])._data;
    // get return size
    const dims = [N, v.length];

    const m = utils.cached(dims);
    const md = m._data;

    for (let i = 0; i < N; i++) {
      v = fn(d[i]);
      const vd = v._data;

      if (vd) {
        const vN = vd.length;
        for (let j = 0; j < vN; j++) {
          md[i][j] = vd[j];
        }
      } else {
        md[i] = v;
      }
    }

    return m;
  },
  view(x, { _data: p } = { _data: [0, 0] }) { // matrix, position: [x, y, z]
    let t = [];
    if (x._data) {
      const d = x.map(utils.prettyRound)._data;
      if (x._size.length === 1) {
        t = [d.join(' ')];
      } else {
        for (let r = 0; r < d.length; r++) {
          t.push(d[r].join(' '));
        }
      }
    }

    const mapped = rtv.cam.graph_to_screen(p[0], p[1], 0);
    for (let i = 0; i < t.length; i++) {
      rtv.ctx.textAlign = 'left';
      rtv.ctx.fillText(t[i], mapped[0], mapped[1] + GRID_SIZE * i);
    }
  },
  labels(labels, points) { // render labels ["l1", ...] at [[x1, y1, z1], ...]
    const mapped = rtv.cam.graph_to_screen_mat(points);
    const N = labels.size()[0];
    let p;
    rtv.ctx.save();
    rtv.ctx.textAlign = 'center';
    for (let i = 0; i < N; i++) {
      p = mapped[i];
      rtv.ctx.fillText(labels._data[i], p[0], p[1]);
    }
    rtv.ctx.restore();
  },
  sig(x) { // sigmoid(x)
    if (x._data) {
      const b = x.map(utils.sig);
      return b;
    }

    return utils.sig(x);
  },
  sigp(x) { // sigmoid_prime(x)
    if (x._data) {
      const b = x.map(utils.sigp);
      return b;
    }

    return utils.sigp(x);
  },
  // eslint-disable-next-line max-len
  field(f, _n, _uv) { // plots a vector field f(x,y,z) using a grid, _n # vectors, _uv force unit length
    let n = 10;
    let uv = false;

    if (arguments.length >= 2) {
      n = _n - 1;

      if (n <= 0) {
        n = 1;
      }
    }

    if (arguments.length >= 3 && _uv === true) {
      uv = true;
    }

    const d = 20 / n;

    for (let x = -10; x <= 10; x += d) {
      for (let y = -10; y <= 10; y += d) {
        for (let z = -10; z <= 10; z += d) {
          let v = f(x, y, z)._data;
          if (uv) {
            const n = math.norm(v);
            v = [v[0] / n, v[1] / n, v[2] / n];
          }

          utils.drawVect(x, y, z, x + v[0], y + v[1], z + v[2]);
        }
      }
    }
  },
  // eslint-disable-next-line max-len
  fielda(f, _n, _uv) { // plots an animated vector field f(x,y,z) using a grid, _n # vectors, _uv force unit length
    let n = 10;
    let uv = false;

    const mod = 0.2;
    const flo = (rtv.t / 500) % mod;

    if (arguments.length >= 3) {
      n = _n - 1;

      if (n <= 0) {
        n = 1;
      }
    }

    if (arguments.length >= 4 && _uv === true) {
      uv = true;
    }

    const d = 20 / n;

    rtv.ctx.save();
    rtv.ctx.globalAlpha = math.sin(flo / mod * math.PI);

    for (let x = -10; x <= 10; x += d) {
      for (let y = -10; y <= 10; y += d) {
        for (let z = -10; z <= 10; z += d) {
          let v = f(x, y, z)._data;
          if (uv) {
            const n = math.norm(v);
            v = [v[0] / n, v[1] / n, v[2] / n];
          }

          const a = rtv.cam.graph_to_screen(x + flo * v[0], y + flo * v[1], z + flo * v[2]);

          rtv.ctx.beginPath();
          rtv.ctx.arc(a[0], a[1], 5, 0, PI2);
          rtv.ctx.fill();
        }
      }
    }
    rtv.ctx.restore();
  },
  paras(r, _urs, _ure, _vrs, _vre, _n = 1, f) { // parametric surface r(u,v) with optional field f
    let n = 10;

    if ((_ure - _urs) <= 0 || (_vre - _vrs) <= 0 || n <= 0) {
      return;
    }

    if (arguments.length >= 6) {
      n = _n;
    }

    const du = (_ure - _urs) / n;
    const dv = (_vre - _vrs) / n;

    rtv.ctx.save();

    let u = _urs;
    let v = _vrs;

    for (let i = 0; i <= n; i++) {
      u = _urs + du * i;

      rtv.ctx.beginPath();
      for (let j = 0; j <= n; j++) {
        v = _vrs + dv * j;

        const p = r(u, v)._data;
        const camp = rtv.cam.graph_to_screen(p[0], p[1], p[2]);
        if (v === 0) {
          rtv.ctx.moveTo(camp[0], camp[1]);
        } else {
          rtv.ctx.lineTo(camp[0], camp[1]);
        }
      }
      rtv.ctx.stroke();
    }

    for (let i = 0; i <= n; i++) {
      v = _vrs + dv * i;

      rtv.ctx.beginPath();
      for (let j = 0; j <= n; j++) {
        u = _urs + du * j;
        const p = r(u, v)._data;
        const camp = rtv.cam.graph_to_screen(p[0], p[1], p[2]);
        if (u === 0) {
          rtv.ctx.moveTo(camp[0], camp[1]);
        } else {
          rtv.ctx.lineTo(camp[0], camp[1]);
        }
      }
      rtv.ctx.stroke();
    }

    if (f) {
      for (let i = 0; i <= n; i++) {
        u = _urs + du * i;

        for (let j = 0; j <= n; j++) {
          v = _vrs + dv * j;

          const p = r(u, v)._data;

          const vect = f(p[0], p[1], p[2])._data;
          utils.drawVect(p[0], p[1], p[2], p[0] + vect[0], p[1] + vect[1], p[2] + vect[2]);
        }
      }
    }

    rtv.ctx.restore();
  },
  integral(f, a, b, _n) {
    if (a === b) {
      return 0;
    }

    let aL = a;
    let bL = b;

    let negate = false;
    if (aL > bL) {
      rtv.t = bL;
      bL = aL;
      aL = rtv.t;
      negate = true;
    }

    let n = 10000;
    if (arguments.length >= 4) {
      n = _n;
    }

    const dx = (bL - aL) / n;
    let sum = 0;
    for (let x = aL; x <= bL; x += dx) {
      sum += f(x) * dx;
    }

    if (negate) {
      sum *= -1;
    }

    return sum;
  },
  der(f, _h) { // return derivative approximation function _h = dx default .001
    let h = 0.001;
    if (arguments.length >= 2) {
      h = _h;
    }

    return function g(a) {
      return (f(a + h) - f(a)) / h;
    };
  },
  visnet({ _data: layers }, retHighlighted) { // Draws a neural net layers = [1, 2, 3, 2, 1]
    const props = parser.evaluate('text_props');
    const pos = [props.p.x, props.p.y];

    const pad = 200;
    const radius = 20;

    const h = layers.length * pad;
    const w = Math.max(...layers) * pad;

    const loc = (i, j, units) => [
      pos[0] + 30 + w / 2 - pad * units / 2 + i * pad,
      pos[1] + h - j * pad - 120,
    ];

    rtv.ctx.save();

    // connections
    let highConn = [];
    let highNeur = [];

    for (let j = 0; j < layers.length - 1; j++) {
      const units = layers[j];
      const unitsNext = layers[j + 1];

      for (let i = 0; i < units; i++) {
        const p = loc(i, j, units);

        for (let k = 0; k < unitsNext; k++) {
          const p2 = loc(k, j + 1, unitsNext);

          /*
                    let vline = [p2[0] - p[0], p2[1] - p[1]];
                    let mvect = [mouse.x - p[0], mouse.y - p[1]];

                    let dot = mvect[0] * vline[0] + mvect[1] * vline[1];

                    let vlen = math.norm(vline);
                    let total_len = vlen * math.norm(mvect);

                    if (dot > total_len * .998 && dot < vlen*vlen) {
                        ctx.strokeStyle = "red";
                    } else {
                        ctx.strokeStyle = "black";
                    } */

          rtv.ctx.strokeStyle = 'black';

          if (highConn.length === 0) {
            const dx1 = p[0] - rtv.mouse.pos.x;
            const dy1 = p[1] - rtv.mouse.pos.y;

            const dx2 = p2[0] - rtv.mouse.pos.x;
            const dy2 = p2[1] - rtv.mouse.pos.y;

            const d1 = math.sqrt(dx1 * dx1 + dy1 * dy1);
            const d2 = math.sqrt(dx2 * dx2 + dy2 * dy2);

            const vline = [p2[0] - p[0], p2[1] - p[1]];
            const vlen = math.norm(vline);

            if (d1 + d2 < vlen + 1) {
              rtv.ctx.strokeStyle = COLORS[3];
              highConn = [i, k, j]; // unit i to unit k in layer j
              highNeur = [[i, j], [k, j + 1]];
            }
          }

          rtv.ctx.beginPath();
          rtv.ctx.moveTo(p[0], p[1]);
          rtv.ctx.lineTo(p2[0], p2[1]);
          rtv.ctx.stroke();
        }
      }
    }

    rtv.ctx.fillStyle = 'white';

    // neurons
    for (let j = 0; j < layers.length; j++) {
      const units = layers[j];

      for (let i = 0; i < units; i++) {
        const p = loc(i, j, units);

        rtv.ctx.strokeStyle = 'black';

        // if we have a highlighted connection and we're in the right layer
        if (highConn.length !== 0) {
          if (highConn[2] === j) {
            if (highConn[0] === i) {
              if (j === 0) {
                rtv.ctx.strokeStyle = COLORS[1];
              } else {
                rtv.ctx.strokeStyle = COLORS[2];
              }
            }
          } else if (highConn[2] === j - 1) {
            if (highConn[1] === i) {
              if (j === 0) {
                rtv.ctx.strokeStyle = COLORS[1];
              } else {
                rtv.ctx.strokeStyle = COLORS[2];
              }
            }
          }
        } else {
          const dx = rtv.mouse.pos.x - p[0];
          const dy = rtv.mouse.pos.y - p[1];

          if (dx * dx + dy * dy < 400) {
            if (j === 0) {
              rtv.ctx.strokeStyle = COLORS[1];
            } else {
              rtv.ctx.strokeStyle = COLORS[2];
            }

            highNeur = [[i, j]];
          }
        }

        rtv.ctx.beginPath();
        rtv.ctx.arc(p[0], p[1], radius, 0, 2 * Math.PI);
        rtv.ctx.fill();
        rtv.ctx.stroke();
      }
    }

    rtv.ctx.restore();

    if (arguments.length >= 2 && retHighlighted) {
      return [highConn, highNeur];
    }
  },
  int(n) {
    return n | 0;
  },
  // eslint-disable-next-line max-len
  elefield({ _data: charges }, location) { // charges = [q1, x1, y1, z1, q2, x2, y2, z2, etc.], provide location for field there
    if (arguments.length === 1) {
      const n = 5;
      const d = 20 / n;
      let p = [0, 0];
      const pl = 5; // path length

      // let move = ((millis % 1000) /1000 * .5 + .5);
      // console.log(move);

      for (let x = -10; x <= 10; x += d) {
        for (let y = -10; y <= 10; y += d) {
          for (let z = -10; z <= 10; z += d) {
            let xp = x;
            let yp = y;
            let zp = z;

            for (let j = 0; j <= pl; j++) {
              rtv.ctx.beginPath();
              p = rtv.cam.graph_to_screen(xp, yp, zp);
              rtv.ctx.moveTo(p[0], p[1]);
              let dead = false;

              // add up forces from charges
              for (let i = 0; i < charges.length; i += 4) {
                const q = charges[i];
                const cx = charges[i + 1];
                const cy = charges[i + 2];
                const cz = charges[i + 3];

                const v = [xp - cx, yp - cy, zp - cz];
                const len = math.norm(v);
                const l2 = len * len;

                const c = math.coulomb.value * q / len / l2;

                if (len > 2) {
                  xp += c * v[0];
                  yp += c * v[1];
                  zp += c * v[2];
                } else {
                  j = pl;
                  dead = true;
                }
              }

              if (dead === false) {
                p = rtv.cam.graph_to_screen(xp, yp, zp);
                rtv.ctx.strokeStyle = utils.rgbToHex([
                  math.round((pl - j) / pl * 255),
                  0,
                  math.round(j / pl * 255),
                ]);
                rtv.ctx.lineTo(p[0], p[1]);
                rtv.ctx.stroke();
              }
            }
          }
        }
      }
    } else if (arguments.length === 2) {
      // calculate field at the provided location
      const loc = location._data;

      const xp = loc[0];
      const yp = loc[1];
      const zp = loc[2];

      let xt = 0;
      let yt = 0;
      let zt = 0;

      // add up forces from charges
      for (let i = 0; i < charges.length; i += 4) {
        const q = charges[i];
        const cx = charges[i + 1];
        const cy = charges[i + 2];
        const cz = charges[i + 3];

        const v = [xp - cx, yp - cy, zp - cz];
        const len = math.norm(v);
        const l2 = len * len;

        const c = math.coulomb.value * q / len / l2; // math.coulomb.value*

        xt += c * v[0];
        yt += c * v[1];
        zt += c * v[2];
      }

      return [xt, yt, zt];
    }
  },
  // eslint-disable-next-line max-len
  eleforce({ _data: charges }, j) { // charges = [q1, x1, y1, z1, q2, x2, y2, z2, etc.] force on jth charge
    const oc = charges[j * 4];
    const xp = charges[j * 4 + 1];
    const yp = charges[j * 4 + 2];
    const zp = charges[j * 4 + 3];

    let fx = 0;
    let fy = 0;
    let fz = 0;

    // add up forces from charges
    for (let i = 0; i < charges.length; i += 4) {
      if (i === j * 4) {
        continue;
      }

      const q = charges[i];
      const cx = charges[i + 1];
      const cy = charges[i + 2];
      const cz = charges[i + 3];

      const v = [xp - cx, yp - cy, zp - cz];
      const len = math.norm(v);
      const l2 = len * len;

      const c = math.coulomb.value * q * oc / len / l2; // math.coulomb.value*

      fx += c * v[0];
      fy += c * v[1];
      fz += c * v[2];
    }

    return [fx, fy, fz];
  },
  vismult(W, x) { // visualize matrix vector multiplication
    const pad = 24;

    const props = parser.evaluate('text_props');
    const loc = [props.p.x, props.p.y + pad];

    const result = math.multiply(W, x);

    const xformat = utils.formatMatrix(x._data);
    const rformat = utils.formatMatrix(result._data);
    const Wformat = utils.formatMatrix(W._data);

    const rsize = utils.matrixSize(rformat);
    const Wsize = utils.matrixSize(utils.formatMatrix(W._data));
    const xsize = utils.matrixSize(xformat);

    // draw neural network
    const rows = W._size[0];
    const cols = W._size[1];

    const high = math.visnet(math.matrix([x._size[0], W._size[0]]), true);
    const highConn = high[0];
    const highNeur = high[1];

    // draw matrices

    // draw result matrix
    rtv.ctx.save();

    rtv.ctx.font = FONT.ANIM;

    rtv.ctx.translate(loc[0] + 10, loc[1] + 330);
    utils.drawMatrix(rformat, (i, j) => {
      rtv.ctx.fillStyle = 'black';
      for (let n = 0; n < highNeur.length; n++) {
        const highn = highNeur[n];
        if (highn[1] === 1 && highn[0] === i) {
          rtv.ctx.fillStyle = COLORS[2];
        }
      }
    });

    rtv.ctx.fillStyle = 'black';
    rtv.ctx.fillText('=', rsize[0] + pad, rsize[1] / 2);

    // draw W matrix
    rtv.ctx.translate(rsize[0] + pad * 3, 0);
    utils.drawMatrix(Wformat, (i, j) => {
      rtv.ctx.fillStyle = 'black';
      if (highConn.length && highConn[0] === j && highConn[1] === i) {
        rtv.ctx.fillStyle = COLORS[3];
      }
    });

    rtv.ctx.fillText('*', Wsize[0] + pad, rsize[1] / 2);

    // draw x matrix
    rtv.ctx.translate(Wsize[0] + pad * 3, rsize[1] / 2 - xsize[1] / 2);
    utils.drawMatrix(xformat, (i, j) => {
      rtv.ctx.fillStyle = 'black';

      for (let n = 0; n < highNeur.length; n++) {
        const highn = highNeur[n];
        if (highn[1] === 0 && highn[0] === i) {
          rtv.ctx.fillStyle = COLORS[1];
        }
      }
    });

    rtv.ctx.restore();
  },
  visdot(W, x) { // visualize matrix vector multiplication but as dot products
    const pad = 24;

    const props = parser.evaluate('text_props');
    const loc = [props.p.x, props.p.y + pad];

    const result = math.multiply(W, x);

    const rformat = utils.formatMatrix(result._data);
    const rsize = utils.matrixSize(rformat);

    // draw neural network
    const rows = W._size[0];
    const cols = W._size[1];

    const high = math.visnet(math.matrix([x._size[0], W._size[0]]), true);
    const highConn = high[0];
    const highNeur = high[1];

    // draw matrices

    // draw result matrix
    rtv.ctx.save();

    rtv.ctx.font = FONT.ANIM;

    rtv.ctx.translate(loc[0] + 10, loc[1] + 330);
    utils.drawMatrix(rformat, (i, j) => {
      rtv.ctx.fillStyle = 'black';
      for (let n = 0; n < highNeur.length; n++) {
        const highn = highNeur[n];
        if (highn[1] === 1 && highn[0] === i) {
          rtv.ctx.fillStyle = 'red';
        }
      }
    });

    rtv.ctx.fillStyle = 'black';
    rtv.ctx.fillText('=', rsize[0] + pad, rsize[1] / 2);

    // draw dot prod matrix
    rtv.ctx.translate(rsize[0] + pad * 3, 0);
    const dp = [];

    let round = utils.prettyRoundOne;
    if (rtv.keys.ctrl) {
      round = utils.prettyRound;
    }

    for (let i = 0; i < W._data.length; i++) {
      let text = '';

      for (let j = 0; j < W._data[0].length; j++) {
        text += `${round(W._data[i][j])}*${round(x._data[j])}`;
        if (j < W._data[0].length - 1) {
          text += ' + ';
        }
      }

      rtv.ctx.fillText(text, 0, i * GRID_SIZE + 20);
    }

    rtv.ctx.restore();
  },
  // eslint-disable-next-line max-len
  magfield(path, current, { _data: atPoint }) { // mag field from path [[x1, y1, z1], [x2, y2, z2], ...]
    const n = 5;
    const d = 20 / n;

    function bAt(x, y, z, { _data: path }, current) {
      let b = math.zeros(3);
      const c = current * math.magneticConstant.value / 4.0 / math.PI; // u0 I / 4 / pi

      for (let i = 0; i < path.length - 1; i += 1) {
        const p1 = path[i];
        const p2 = path[i + 1];

        let r = math.subtract([x, y, z], p1);
        const rnorm = math.norm(r);
        r = math.multiply(r, 1 / rnorm);

        const ds = math.subtract(p2, p1);
        let db = math.cross(ds, r);
        db = math.multiply(db, 1 / math.pow(rnorm, 2));

        b = math.add(b, db);
      }

      return math.multiply(b, c);
    }

    if (arguments.length >= 3) {
      const b = bAt(atPoint[0], atPoint[1], atPoint[2], path, current);

      return b;
    }
    for (let x = -10; x <= 10; x += d) {
      for (let y = -10; y <= 10; y += d) {
        for (let z = -10; z <= 10; z += d) {
          let b = bAt(x, y, z, path, current);

          if (math.norm(b) > 0.1) {
            b = b._data;
            utils.drawVect(x, y, z, x + b[0], y + b[1], z + b[2]);
          }
        }
      }
    }
  },
  circle(_p, r, _n) {
    let n = 10;
    if (arguments.length >= 3) {
      n = _n;
    }

    const path = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n * 2 * math.PI;
      const p = math.add(_p, [math.cos(t) * r, math.sin(t) * r, 0]);
      path.push(p);
    }

    return math.matrix(path);
  },
  interp(a, b, divisions) { // interpolate from [x1,y1,z1,...] -> [x2,y2,z2,...]
    const ad = a._data;
    const bd = b._data;

    const L = utils.cached([divisions, ad.length]);

    for (let i = 0; i < divisions; i++) {
      const t = i / (divisions - 1);
      for (let j = 0; j < ad.length; j++) {
        L._data[i][j] = ad[j] * (1 - t) + t * bd[j];
      }
    }

    return L;
  },
  zer() {
    return [0, 0, 0];
  },
  linspace(a, b, steps) {
    const path = [];

    path.push(a);

    if (steps > 2) {
      const dt = 1 / (steps - 2);
      let t = 0;
      for (let i = 0; i < steps - 2; i++) {
        path.push(math.add(math.multiply(a, (1 - t)), math.multiply(t, b)));
        t += dt;
      }
    }

    path.push(b);

    return math.matrix(path);
  },
  say(text, _voice, _rate, _pitch) { // text to speech
    let voice = 11;

    if (_voice) {
      voice = _voice;
    }

    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.pitch = 0.8;

    if (arguments.length >= 3) {
      utterThis.rate = _rate;
    }

    if (arguments.length >= 4) {
      utterThis.pitch = _pitch;
    }

    utterThis.voice = rtv.speech.voices[voice];
    rtv.speech.synth.cancel();
    rtv.speech.synth.speak(utterThis);
  },
  enableVolMeter() {
    if (rtv.meter === undefined) {
      rtv.meter = initVolumeMeter();
    }
  },
  traceToggle() { // enable or disable canvas clearing
    try {
      parser.evaluate('_trace');
    } catch (e) {
      parser.set('_trace', false);
    }

    parser.set('_trace', !parser.evaluate('_trace'));
  },
  drawFarmer() {
    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const x = props.p.x;
    const y = props.p.y;

    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -1.25, y + -211);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(4.000000000000001, 4.000000000000001);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -41.25, y + -201);
    rtv.ctx.rotate(6.2831853071795845);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 38.75, y + -201);
    rtv.ctx.rotate(-6.2831853071795845);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -1.25, y + -171);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -1.25, y + -86);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-20, -45);
    rtv.ctx.lineTo(-40, 45);
    rtv.ctx.lineTo(40, 45);
    rtv.ctx.lineTo(20, -45);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -21.25, y + -21);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, -20);
    rtv.ctx.lineTo(0, 20);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 18.75, y + -21);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, -20);
    rtv.ctx.lineTo(0, 20);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -36.25, y + -101);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(15, -30);
    rtv.ctx.lineTo(-15, 30);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 33.75, y + -101);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-15, -30);
    rtv.ctx.lineTo(15, 30);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -57.91666666666674, y + -154.33333333333331);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-23.333333333333258, -56.666666666666686);
    rtv.ctx.lineTo(-13.333333333333258, 33.333333333333314);
    rtv.ctx.lineTo(36.66666666666674, 23.333333333333314);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 55.41666666666674, y + -154.33333333333331);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(23.333333333333258, -56.666666666666686);
    rtv.ctx.lineTo(13.333333333333258, 33.333333333333314);
    rtv.ctx.lineTo(-36.66666666666674, 23.333333333333314);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -71.25, y + -291);
    rtv.ctx.rotate(-1.308996938995747);
    rtv.ctx.scale(4.000000000000001, 3.400000000000001);
    rtv.ctx.arc(0, 0, 20, 1.308996938995747, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 68.75, y + -291);
    rtv.ctx.rotate(-2.0943951023931953);
    rtv.ctx.scale(4.000000000000001, -3.800000000000001);
    rtv.ctx.arc(0, 0, 20, 1.308996938995747, 2.8797932657906453, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -86.25, y + -206);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, -5);
    rtv.ctx.lineTo(-5, 5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.restore();
  },
  drawComputer() {
    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const x = props.p.x;
    const y = props.p.y;

    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -3.5, y + -186);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-128, -96);
    rtv.ctx.lineTo(-128, 144);
    rtv.ctx.lineTo(192, 144);
    rtv.ctx.lineTo(192, -96);
    rtv.ctx.lineTo(-128, -96);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -151.5, y + -154.5);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(20, -127.5);
    rtv.ctx.lineTo(-20, -87.5);
    rtv.ctx.lineTo(-20, 102.5);
    rtv.ctx.lineTo(20, 112.5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -186.5, y + -124.5);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(15, -77.5);
    rtv.ctx.lineTo(-15, -27.5);
    rtv.ctx.lineTo(-15, 42.5);
    rtv.ctx.lineTo(15, 62.5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -11.5, y + -22);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-40, -20);
    rtv.ctx.lineTo(-80, 20);
    rtv.ctx.lineTo(80, 20);
    rtv.ctx.lineTo(40, -20);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 53.5, y + -187);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, 5);
    rtv.ctx.lineTo(-5, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 98.5, y + -197);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, 5);
    rtv.ctx.lineTo(0, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 143.5, y + -187);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-5, 5);
    rtv.ctx.lineTo(5, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 118.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.20000000000000007, 0.20000000000000007);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 118.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 98.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(2.1999999999999997, 0.8);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 28.5, y + -122);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 20, 1.1102230246251565e-16, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 0.5, y + -182);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-112, -80);
    rtv.ctx.lineTo(-112, 120);
    rtv.ctx.lineTo(168, 120);
    rtv.ctx.lineTo(168, -80);
    rtv.ctx.lineTo(-112, -80);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -41.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(2.1999999999999997, 0.8);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -21.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.6000000000000001, 0.6000000000000001);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -21.5, y + -162);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(0.20000000000000007, 0.20000000000000007);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 3.5, y + -187);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-5, 5);
    rtv.ctx.lineTo(5, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -41.5, y + -197);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, 5);
    rtv.ctx.lineTo(0, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -86.5, y + -187);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, 5);
    rtv.ctx.lineTo(-5, -5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.restore();
  },
  drawFace() {
    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const x = props.p.x;
    const y = props.p.y;

    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -56.25, y + -53.5);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    // pupil
    rtv.ctx.save();
    rtv.ctx.beginPath();
    let angle = math.atan2(rtv.mouse.pos.y - y + 53.5, rtv.mouse.pos.x - x + 56.25);
    rtv.ctx.translate(x + -56.25, y + -53.5);
    rtv.ctx.rotate(angle);
    rtv.ctx.translate(8, 0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 10, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 56.25, y + -53.5);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 20, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    // pupil
    rtv.ctx.save();
    rtv.ctx.beginPath();
    angle = math.atan2(rtv.mouse.pos.y - y + 53.5, rtv.mouse.pos.x - x - 56.25);
    rtv.ctx.translate(x + 56.25, y + -53.5);
    rtv.ctx.rotate(angle);
    rtv.ctx.translate(8, 0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.arc(0, 0, 10, 0, 6.283185307179586, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -8.4375, y + 11.1875);
    rtv.ctx.rotate(0);
    if (rtv.meter && rtv.meter.volume) {
      rtv.ctx.scale(1 - rtv.meter.volume * 2, 1 + rtv.meter.volume * 2);
    } else {
      rtv.ctx.scale(1, 1);
    }
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-25.3125, -8.4375);
    rtv.ctx.lineTo(42.1875, -8.4375);
    rtv.ctx.lineTo(8.4375, 25.3125);
    rtv.ctx.lineTo(-25.3125, -8.4375);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 0, y + -36.625);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    let np = 28.125;
    if (rtv.meter && rtv.meter.volume) {
      np -= rtv.meter.volume * 20;
    }
    rtv.ctx.moveTo(0, -28.125);
    rtv.ctx.lineTo(0, np);
    rtv.ctx.lineTo(0 - 15, 28.125 - 15);
    rtv.ctx.moveTo(0, np);
    rtv.ctx.lineTo(0 + 15, 28.125 - 15);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.restore();
  },
  drawDog() {
    rtv.ctx.save();

    const props = parser.evaluate('text_props');
    const x = props.p.x;
    const y = props.p.y;

    rtv.ctx.translate(x, y);
    rtv.ctx.rotate(props.r);
    rtv.ctx.scale(props.w, props.h);
    rtv.ctx.translate(-x, -y);

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -23.25, y + -117.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-48, -32);
    rtv.ctx.lineTo(72, -32);
    rtv.ctx.lineTo(72, 48);
    rtv.ctx.lineTo(-48, 48);
    rtv.ctx.lineTo(-48, -32);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + -51.25, y + -149.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1.4);
    rtv.ctx.arc(0, 0, 20, 0, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.beginPath();
    rtv.ctx.translate(x + 28.75, y + -149.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1.4);
    rtv.ctx.arc(0, 0, 20, 0, 3.141592653589795, false);
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.translate(x + -42.5, y + -109.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.fillStyle = '#000000';
    rtv.ctx.fillText('-', 0, 0);
    rtv.ctx.fillText('.', 22.5, 0);
    rtv.ctx.fillText('-', 45, 0);
    rtv.ctx.restore();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -16.25, y + -94.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, -5);
    rtv.ctx.lineTo(-5, 5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -6.25, y + -94.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-5, -5);
    rtv.ctx.lineTo(5, 5);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -3.75, y + -34.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-37.5, -35);
    rtv.ctx.lineTo(-47.5, 35);
    rtv.ctx.lineTo(52.5, 35);
    rtv.ctx.lineTo(32.5, -35);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -26.25, y + -24.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(5, -25);
    rtv.ctx.lineTo(-5, 25);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 63.75, y + -19.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(-15, 20);
    rtv.ctx.lineTo(15, -20);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + -1.25, y + -24.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, -25);
    rtv.ctx.lineTo(0, 25);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.save();
    rtv.ctx.globalAlpha = 1;
    rtv.ctx.strokeStyle = '#000000';
    rtv.ctx.translate(x + 18.75, y + -24.75);
    rtv.ctx.rotate(0);
    rtv.ctx.scale(1, 1);
    rtv.ctx.beginPath();
    rtv.ctx.moveTo(0, -25);
    rtv.ctx.lineTo(0, 25);
    rtv.ctx.restore();
    rtv.ctx.stroke();

    rtv.ctx.restore();
  },
  dirField(f) { // draws direction field of dy/dx = f(x,y)
    for (let x = -10; x <= 10; x += 2) {
      for (let y = -10; y <= 10; y += 2) {
        const dydx = f(x + 0.0001, y + 0.0001); // to avoid asymptotes at x=0 or y=0
        if (dydx.im) {
          continue;
        }
        let uv = [1, dydx];
        uv = math.matrix(uv);
        uv = math.multiply(uv, 1 / math.norm(uv));
        utils.drawVect(x, y, 0, x + uv._data[0], y + uv._data[1], 0);
      }
    }
  },
  // eslint-disable-next-line max-len
  eulerMeth(f, x0, y0, _n, _h) { // approximate solution to diff eq from initial condition y(x0)=y0, n steps
    const n = _n > 0 ? _n : 10;
    const h = _h > 0 ? _h : 0.1;

    let x = x0;
    let y = y0;

    rtv.ctx.beginPath();

    let p = rtv.cam.graph_to_screen(x, y, 0);
    rtv.ctx.moveTo(p[0], p[1]);

    for (let i = 0; i < n; i++) {
      const dydx = f(x, y);

      if (dydx.im) {
        rtv.ctx.stroke();
        return math.matrix([x, y]);
      }

      x += h;
      y += dydx * h;

      p = rtv.cam.graph_to_screen(x, y, 0);
      rtv.ctx.lineTo(p[0], p[1]);
    }

    rtv.ctx.stroke();
    return math.matrix([x, y]);
  },
  // eslint-disable-next-line max-len
  diffEq(a, b, c, x0, y0, yp0, _n, _dt) { // ay'' + by' + cy = 0 numerically plotted for _n steps and _dt accuracy
    let n = 1000;
    let dt = 0.001;

    if (arguments.length >= 7) {
      n = _n;
    }

    if (arguments.length >= 8) {
      dt = _dt;
    }

    let y = y0;
    let x = x0;
    let yp = yp0;

    let p = rtv.cam.graph_to_screen(x, y, 0);

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(p[0], p[1]);
    for (let i = 0; i < n; i++) {
      const ypp = (-b * yp - c * y) / a;
      yp += ypp * dt;
      y += yp * dt;
      x += 1 * dt;
      p = rtv.cam.graph_to_screen(x, y, 0);
      rtv.ctx.lineTo(p[0], p[1]);
    }
    rtv.ctx.stroke();
  },
  // eslint-disable-next-line max-len
  diffEqF(a, b, c, f, x0, y0, yp0, _n, _dt) { // ay'' + by' + cy = f(x) numerically plotted for _n steps and _dt accuracy
    let n = 1000;
    let dt = 0.001;

    if (arguments.length >= 8) {
      n = _n;
    }

    if (arguments.length >= 9) {
      dt = _dt;
    }

    let y = y0;
    let x = x0;
    let yp = yp0;

    let p = rtv.cam.graph_to_screen(x, y, 0);

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(p[0], p[1]);
    for (let i = 0; i < n; i++) {
      const ypp = (f(x) - b * yp - c * y) / a;
      yp += ypp * dt;
      y += yp * dt;
      x += 1 * dt;
      p = rtv.cam.graph_to_screen(x, y, 0);
      rtv.ctx.lineTo(p[0], p[1]);
    }
    rtv.ctx.stroke();
  },
  // eslint-disable-next-line max-len
  diffEqTri(a, b, c, d, x0, y0, yp0, ypp0, _n, _dt) { // ay''' + by'' + cy' + dy = 0 numerically plotted for _n steps and _dt accuracy
    let n = 1000;
    let dt = 0.001;

    if (arguments.length >= 8) {
      n = _n;
    }

    if (arguments.length >= 9) {
      dt = _dt;
    }

    let y = y0;
    let x = x0;
    let yp = yp0;
    let ypp = ypp0;

    let p = rtv.cam.graph_to_screen(x, y, 0);

    rtv.ctx.beginPath();
    rtv.ctx.moveTo(p[0], p[1]);
    for (let i = 0; i < n; i++) {
      const yppp = (-b * ypp - c * yp - d * y) / a;
      ypp += yppp * dt;
      yp += ypp * dt;
      y += yp * dt;
      x += 1 * dt;
      p = rtv.cam.graph_to_screen(x, y, 0);
      rtv.ctx.lineTo(p[0], p[1]);
    }
    rtv.ctx.stroke();
  },
  factors(n) { // Returns positive factors of positive integer 'n'
    const factors = [];

    // Inserts element 'l' at index 'i' in array 'a'
    const insert = (l, i, a) => a.splice(i, 0, l);

    let i = 1;
    let c;
    let middle = 0;
    do {
      c = n / i; // Corresponding factor (or fraction, if 'i' isn't a factor of 'n') to 'i'

      // Check if 'n' is divisible by 'i'
      if (c % 1 === 0) { // Faster than 'Number.isInteger(c)'
        insert(i, middle, factors);
        if (i !== c) { // Check that 'n' is not a perfect square
          middle++; // Shift 'middle' one position to the right
          insert(c, middle, factors); // Insert 'c' to the right of 'i'
        }
      }

      i++;
    } while (i < c);

    return math.matrix(factors);
  },
  primeFactors(n, repeat = false) { // Returns prime factors of positive integer 'n'
    let dividend = n;
    const primes = [];

    let i = 2; // Initialize 'i' at smallest prime number
    let last; // Last prime factor
    while (dividend > 1) { // Loop until all factors are extracted
      const quotient = dividend / i;
      if (quotient % 1 === 0) {
        // Make sure factor is not already registered when 'repeat' is false
        if (repeat || i !== last) {
          primes.push(i);
        }
        last = i; // Register last prime factor
        dividend = quotient;
      } else { // 'f' is not a prime factor of 'dividend' (anymore)
        i++;
      }
    }

    return math.matrix(primes);
  },
  laplace(f, _ti, _tf, _dt) {
    let ti = 0;
    let tf = 1000;
    let dt = 0.01;

    if (arguments.length >= 2) {
      ti = _ti;
    }

    if (arguments.length >= 3) {
      tf = _tf;
    }

    if (arguments.length >= 4) {
      dt = _dt;
    }

    return (s) => {
      let sum = 0;
      for (rtv.t = ti; rtv.t <= tf; rtv.t += dt) {
        sum += math.exp(-s * rtv.t) * f(rtv.t);
      }
      return sum;
    };
  },
  step(t) {
    if (t > 0) {
      return 1;
    }
    return 0;
  },
  window(t, a, b) {
    return math.step(t - a) - math.step(t - b);
  },
});

window.addEventListener('load', () => {
  rtv.objs = [];

  rtv.c = document.getElementById('viewport');
  rtv.c.style.backgroundColor = CANVAS_BG;

  rtv.ctx = rtv.c.getContext('2d');

  configureCanvas();
  window.addEventListener('resize', configureCanvas);

  // speech synth
  rtv.speech.synth = window.speechSynthesis; // speech synthesis
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    rtv.speech.voices = window.speechSynthesis.getVoices();
  });

  document.getElementById('save').addEventListener('click', () => utils.save(rtv.objs));

  document.getElementById('file').addEventListener('change', (evt) => {
    utils.enterSelect();
    utils.load(evt);
  });

  document.getElementById('load_to_frame').addEventListener('click', () => {
    const text = document.getElementById('selected_objects_text').value;
    const arr = JSON.parse(text);
    rtv.objs = rtv.objs.concat(utils.textArrayToObjs(arr, false));
  });

  rtv.formula_text = document.getElementById('formula_text');
  document.getElementById('load_clear_formula_text').addEventListener('click', () => {
    const t = rtv.formula_text.value;
    for (let i = 0; i < rtv.objs.length; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.change_text === 'function' && obj.is_selected()) {
        obj.change_text(t);
      }
    }
  });
  document.getElementById('load_insert_formula_text').addEventListener('click', () => {
    const t = rtv.formula_text.value;
    rtv.objs.forEach((obj) => {
      if (typeof obj.replace_selected_text === 'function' && obj.is_selected()) {
        obj.change_text(obj.replace_selected_text(t));
      }
    });
  });

  document.getElementById('gen_js').addEventListener('click', () => {
    let js = '';

    rtv.selected_objs.forEach((obj) => {
      if (obj.generate_javascript) {
        const s = obj.generate_javascript();
        js += `${s}\n`;
      }
    });

    document.getElementById('generic').value = js;
  });

  document.getElementById('gen_script').addEventListener('click', () => {
    let script = document.getElementById('generic').value;
    script = script.split('\n');
    script = script.filter((s) => s.length !== 0);

    const t = new Text('', { x: 20, y: rtv.c.clientHeight * 2 - 60 });
    t.properties[rtv.frame].w = 0.6;
    t.properties[rtv.frame].h = 0.6;
    rtv.objs.push(t);

    for (let i = 0; i < script.length; i++) {
      const s = script[i];
      const fr = i + 1;
      if (!t.properties[fr]) {
        t.properties[fr] = utils.copy(t.properties[fr - 1]);
      }

      t.properties[fr].t = s;
    }

    rtv.num_frames = script.length;
    rtv.frames.create_buttons();

    utils.saveState();
  });

  rtv.recordingManager = new RecordingManager(
    rtv.c,
    document.getElementById('record'),
    document.getElementById('pause-resume'),
  );

  document.addEventListener('paste', (event) => {
    const paste = (event.clipboardData || window.clipboardData).getData('text');

    const N = rtv.objs.length;
    for (let i = 0; i < rtv.objs.length; i++) {
      const obj = rtv.objs[i];
      if (obj.type === 'Text') {
        if (obj.is_selected()) {
          obj.paste_text(paste);
        }
      }
    }

    event.preventDefault();
  });

  rtv.transition = new Transition();
  rtv.frame = 1;
  rtv.frames = new Frames(() => ({
    x: rtv.c.width - GRID_SIZE * 2,
    y: GRID_SIZE / 4,
  }));
  rtv.frames.on_click = utils.transitionWithNext;

  rtv.menu = new Menu({ x: GRID_SIZE / 4, y: GRID_SIZE / 2 });
  rtv.cam = new Camera();
  rtv.pen = new Pen();

  window.addEventListener('focus', () => {
    rtv.keys.meta = false;
    rtv.keys.ctrl = false;
  });

  window.addEventListener('keydown', (evt) => {
    const key = evt.key;

    if (key === 'Escape' && rtv.presenting && rtv.tool !== 'camera' && rtv.tool !== 'pen') {
      rtv.presenting = false;
      document.body.style.cursor = '';
      document.body.style.overflow = 'auto'; // Enable and show scrollbar
      return false;
    }

    if (key === 'Escape') {
      utils.enterSelect();
    }

    if (key === 'Tab') {
      rtv.keys.tab = true;
    }

    if (key === 'Meta') {
      rtv.keys.meta = true;
    }

    if (key === 'Shift') {
      rtv.keys.shift = true;
    }

    if (key === 'Control') {
      rtv.keys.ctrl = true;
    }

    if (key === 'Backspace') {
      if (rtv.keys.ctrl) {
        const N = rtv.objs.length;
        for (let i = 0; i < N; i++) {
          const obj = rtv.objs[i];
          if (obj.is_selected()) {
            obj.deleted = true;
          }
        }
      }
    }

    if (key === 'z' && (rtv.keys.meta || rtv.keys.ctrl)) {
      utils.undo();
      return;
    }

    if ((rtv.keys.meta || rtv.keys.ctrl) && key === 'Enter') {
      utils.present();
      return true;
    }

    if (document.getElementById('formula_text') === document.activeElement) {
      return true;
    }

    let captured = false;
    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];

      if (typeof obj.onkeydown === 'function') {
        if (obj.onkeydown(evt)) {
          captured = true;
          evt.preventDefault(); // Prevent default if event has been handled
          if (key === 'ArrowUp' || key === 'ArrowDown') {
            // stops text selection from propagating as you iterate the array
            break;
          }
        }
      }
    }

    if (captured) {
      return false;
    }

    if (rtv.frames.onkeydown(evt)) {
      return false;
    }

    rtv.cam.onkeydown(evt);
    rtv.pen.onkeydown(evt);

    if (key === ' ') {
      return false;
    }

    if (rtv.tool === 'select' && evt.target === document.body) {
      const tools = {
        t: 'text', s: 'shape', c: 'camera', v: 'vector',
      };
      if (key in tools) {
        rtv.tool = tools[key];
      }
    }
  });

  window.addEventListener('keyup', ({ key }) => {
    if (key === 'Tab') {
      rtv.keys.tab = false;
    }

    if (key === 'Meta') {
      rtv.keys.meta = false;
    }

    if (key === 'Shift') {
      rtv.keys.shift = false;
    }

    if (key === 'Control') {
      rtv.keys.ctrl = false;
    }

    utils.saveState();
  });

  ['mousedown', 'touchstart'].forEach((key) => rtv.c.addEventListener(key, (evt) => {
    rtv.mouse.down = true;
    rtv.mouse.start = utils.getMousePos(rtv.c, evt);

    try {
      math.compile('click()').evaluate(parser.scope);
    } catch (e) {

    }

    if (rtv.cam.mouse_down(evt)) {
      return;
    }

    if (rtv.pen.mouse_down(evt)) {
      return;
    }

    if (rtv.presenting) {
      return false;
    }

    let captured = false;
    for (let i = rtv.objs.length - 1; i >= 0; i--) {
      const obj = rtv.objs[i];
      if (typeof obj.mouse_down === 'function') {
        if (obj.mouse_down(evt)) {
          captured = true;
          break;
        }
      }
    }

    if (captured) {
      return false;
    }

    if (rtv.frames.mouse_down()) {
      return;
    }

    // didn't touch an obj, if tool is move start a rect
    let objSelected = false;
    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      if (rtv.objs[i].is_selected()) {
        objSelected = true;
      }
    }

    if (rtv.tool === 'select' && objSelected === false) {
      rtv.selecting = true;
    }
  }));

  ['mousemove', 'touchmove'].forEach((key) => window.addEventListener(key, (evt) => {
    // update mouse
    rtv.mouse.pos = utils.getMousePos(rtv.c, evt);
    rtv.mouse.grid = utils.constrainToGrid(rtv.mouse.pos);
    rtv.mouse.graph = rtv.cam.screen_to_graph(rtv.mouse.pos);

    parser.set('_y', rtv.mouse.graph.x);
    parser.set('_z', rtv.mouse.graph.y);

    if (rtv.pen.mouse_move(evt)) {
      return;
    }

    if (rtv.mouse.down) {
      let captured = false;
      const N = rtv.objs.length;
      for (let i = N - 1; i >= 0; i--) {
        const obj = rtv.objs[i];
        if (!captured && typeof obj.mouse_drag === 'function') {
          captured = obj.mouse_drag(evt);
        }
      }

      if (!captured) {
        rtv.cam.mouse_drag(evt);
      }
    } else {
      const N = rtv.objs.length;
      for (let i = 0; i < N; i++) {
        const obj = rtv.objs[i];
        if (typeof obj.mouse_move === 'function') {
          obj.mouse_move(evt);
        }
      }
    }

    if (rtv.presenting) {
      rtv.mouse.time = MOUSE_DURATION;
    }

    rtv.mouse.last = utils.getMousePos(rtv.c, evt);
    rtv.mouse.gridLast = utils.constrainToGrid(rtv.mouse.pos);
  }));

  ['mouseup', 'touchend'].forEach((key) => rtv.c.addEventListener(key, (evt) => {
    rtv.mouse.down = false;

    if (rtv.presenting) {
      // maybe tap some text
      let captured = false;
      const N = rtv.objs.length;
      for (let i = 0; i < N; i++) {
        const obj = rtv.objs[i];
        if (!captured && typeof obj.mouse_up === 'function') {
          captured = obj.mouse_up(evt);
        }
      }

      return false;
    }

    if (rtv.frames.mouse_up(evt)) {
      return;
    }

    if (rtv.menu.mouse_up(evt)) {
      rtv.new_line = null;
      rtv.selecting = false;

      utils.saveState();
      return;
    }

    if (rtv.pen.mouse_up(evt)) {
      utils.saveState();
      return;
    }

    if (rtv.tool === 'select') {
      let captured = false;
      const N = rtv.objs.length;
      for (let i = N - 1; i >= 0; i--) {
        const obj = rtv.objs[i];
        if (!captured && typeof obj.mouse_up === 'function') {
          captured = obj.mouse_up(evt);
        }
      }
    } else if (rtv.tool === 'text') {
      // add a num obj at mouse pos
      const n = new Text('', rtv.mouse.grid);

      const N = rtv.objs.length;
      for (let i = 0; i < N; i++) {
        const obj = rtv.objs[i];
        if (typeof obj.is_selected === 'function') {
          obj.selected = false;
        }
      }

      n.select();
      rtv.objs.push(n);
    } else if (rtv.tool === 'shape' || rtv.tool === 'vector') {
      // add a num obj at mouse pos
      if (rtv.new_line) {
        // add a point
        rtv.new_line.add_point({ x: rtv.mouse.grid.x, y: rtv.mouse.grid.y });
      } else {
        const l = new Shape([0, 0, 0, 1], [{ x: rtv.mouse.grid.x, y: rtv.mouse.grid.y }]);

        if (rtv.tool === 'vector') {
          l.properties[rtv.frame].v = true;
        } else if (rtv.tool === 'circle') {
          l.properties[rtv.frame].circle = true;
        }

        rtv.objs.push(l);
        rtv.new_line = l;
      }

      return;
    } else if (rtv.tool === 'circle') {
      const newCircle = new Circle([0, 0, 0, 1], rtv.mouse.grid);
      rtv.objs.push(newCircle);
    } else if (rtv.tool === 'network') {
      const n = new Network(rtv.mouse.grid);
      rtv.objs.push(n);
    }

    if (rtv.selecting) {
      rtv.selecting = false;

      const x = rtv.mouse.start.x;
      const y = rtv.mouse.start.y;
      const x2 = rtv.mouse.pos.x;
      const y2 = rtv.mouse.pos.y;

      const xx = Math.min(x, x2);
      const yy = Math.min(y, y2);
      const xx2 = Math.max(x, x2);
      const yy2 = Math.max(y, y2);

      rtv.selected_objs = [];

      for (let i = 0; i < rtv.objs.length; i++) {
        const obj = rtv.objs[i];
        if (typeof obj.in_rect === 'function') {
          obj.in_rect(xx, yy, xx2, yy2);
          if (obj.is_selected()) {
            rtv.selected_objs.push(obj);
          }
        }
      }

      const scopy = utils.copy(rtv.selected_objs);
      for (let i = 0; i < scopy.length; i++) {
        const obj = scopy[i];
        const props = utils.copy(obj.properties[rtv.frame]);
        obj.properties = { 1: props };
      }

      if (scopy.length > 0) {
        // store as text rep
        const string = JSON.stringify(scopy);
        document.getElementById('selected_objects_text').value = string;
      }

      utils.saveState();
      return false;
    }

    utils.saveState();
  }));

  utils.saveState();

  rtv.millis = Date.now();
  let targMillis = rtv.millis + 1; // set below

  function animate() {
    rtv.millis = Date.now();
    if (rtv.millis < targMillis) {
      setTimeout(animate, targMillis - rtv.millis);
      return;
    }

    targMillis = rtv.millis + 1000 / rtv.fps;

    if (rtv.presenting) {
      rtv.fps = 60;
    } else {
      rtv.fps = 30; // save power when editing
    }

    parser.set('_frame', rtv.t);
    parser.set('_millis', rtv.millis);
    const mp = rtv.cam.screen_to_graph({ x: rtv.mouse.pos.x, y: rtv.mouse.pos.y });
    parser.set('_mx', mp.x);
    parser.set('_my', mp.y);

    if (rtv.meter) {
      parser.set('_vol', rtv.meter.volume);
    }

    if (rtv.presenting) {
      rtv.mouse.time -= 1;
    }

    if (!parser.get('_trace')) {
      rtv.ctx.clearRect(0, 0, rtv.c.width, rtv.c.height);
    }

    rtv.cam.update_props();

    utils.drawAxes(rtv.ctx);

    rtv.ctx.font = FONT.ANIM;

    const N = rtv.objs.length;
    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      if (typeof obj.eval === 'function') {
        obj.eval();
      }
    }

    for (let i = 0; i < N; i++) {
      const obj = rtv.objs[i];
      obj.render(rtv.ctx);
    }

    for (let i = rtv.objs.length - 1; i >= 0; i--) {
      const obj = rtv.objs[i];
      if (obj.deleted) {
        rtv.objs.splice(i, 1);
      }
    }

    if (rtv.selecting) {
      // draw a rect
      rtv.ctx.strokeStyle = DARK;
      rtv.ctx.strokeRect(
        rtv.mouse.start.x,
        rtv.mouse.start.y,
        rtv.mouse.pos.x - rtv.mouse.start.x,
        rtv.mouse.pos.y - rtv.mouse.start.y,
      );
    }

    rtv.ctx.font = FONT.MENU;

    if (!rtv.presenting) {
      rtv.frames.render(rtv.ctx);
      rtv.menu.render(rtv.ctx);

      if (rtv.error.timer > 0) {
        rtv.ctx.save();
        rtv.ctx.fillStyle = 'red';
        rtv.ctx.fillText(rtv.error.text, 250, 30);
        rtv.ctx.restore();
        rtv.error.timer -= 1;
      }
    }

    rtv.pen.render();

    utils.drawCursor();

    if (rtv.view_frame) {
      rtv.ctx.save();
      rtv.ctx.strokeStyle = 'black';
      rtv.ctx.beginPath();
      const w = 1928; // +8 pixels for padding
      const h = 1088;
      rtv.ctx.rect(rtv.c.clientWidth - w / 2, rtv.c.clientHeight - h / 2, w, h);
      rtv.ctx.stroke();

      if (!rtv.presenting) {
        rtv.ctx.globalAlpha = 0.1;

        rtv.ctx.beginPath();
        rtv.ctx.moveTo(rtv.c.clientWidth - w / 2, rtv.c.clientHeight);
        rtv.ctx.lineTo(rtv.c.clientWidth + w / 2, rtv.c.clientHeight);
        rtv.ctx.stroke();

        rtv.ctx.beginPath();
        rtv.ctx.moveTo(rtv.c.clientWidth, rtv.c.clientHeight - h / 2);
        rtv.ctx.lineTo(rtv.c.clientWidth, rtv.c.clientHeight + h / 2);
        rtv.ctx.stroke();

        rtv.ctx.globalAlpha = 1;
      }

      rtv.ctx.restore();
    }

    rtv.transition.update();

    rtv.t += 1;

    // Draw background only if recording to speed up 'animate'
    if (rtv.recordingManager.recording !== undefined) {
      utils.drawBackground(rtv.ctx, CANVAS_BG);
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
});
