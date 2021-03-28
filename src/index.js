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
import * as utils from './utils';
import * as toolkit from './toolkit';
import {
  rtv,
  math,
  parser,
  DARK,
  CANVAS_BG,
  FONT,
  GRID_SIZE,
  MOUSE_DURATION,
} from './resources';

toolkit.register();

// http://www.javascriptkit.com/javatutors/requestanimationframe.shtml
window.requestAnimationFrame
    ??= window.mozRequestAnimationFrame
    ?? window.webkitRequestAnimationFrame
    ?? window.msRequestAnimationFrame
    ?? ((f) => setTimeout(f, 1000 / rtv.fps)); // simulate calling code 60

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
