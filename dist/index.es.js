import { defineComponent, ref, onMounted, openBlock, createElementBlock, createBlock, unref, createCommentVNode } from "vue";
const clamp$1 = (number, min = 0, max = 1) => {
  return number > max ? max : number < min ? min : number;
};
const round = (number, digits = 0, base = Math.pow(10, digits)) => {
  return Math.round(base * number) / base;
};
const hsvaToHsla = ({ h, s, v, a }) => {
  const hh = (200 - s) * v / 100;
  return {
    h: round(h),
    s: round(hh > 0 && hh < 200 ? s * v / 100 / (hh <= 100 ? hh : 200 - hh) * 100 : 0),
    l: round(hh / 2),
    a: round(a, 2)
  };
};
const hsvaToHslString = (hsva) => {
  const { h, s, l } = hsvaToHsla(hsva);
  return `hsl(${h}, ${s}%, ${l}%)`;
};
const hsvaToHslaString = (hsva) => {
  const { h, s, l, a } = hsvaToHsla(hsva);
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
};
const hsvaToRgba = ({ h, s, v, a }) => {
  h = h / 360 * 6;
  s = s / 100;
  v = v / 100;
  const hh = Math.floor(h), b = v * (1 - s), c = v * (1 - (h - hh) * s), d = v * (1 - (1 - h + hh) * s), module = hh % 6;
  return {
    r: round([v, c, b, b, d, v][module] * 255),
    g: round([d, v, v, c, b, b][module] * 255),
    b: round([b, b, d, v, v, c][module] * 255),
    a: round(a, 2)
  };
};
const rgbaToHsva = ({ r, g, b, a }) => {
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  const hh = delta ? max === r ? (g - b) / delta : max === g ? 2 + (b - r) / delta : 4 + (r - g) / delta : 0;
  return {
    h: round(60 * (hh < 0 ? hh + 6 : hh)),
    s: round(max ? delta / max * 100 : 0),
    v: round(max / 255 * 100),
    a
  };
};
const rgbaToRgb = ({ r, g, b }) => ({ r, g, b });
const equalColorObjects = (first, second) => {
  if (first === second)
    return true;
  for (const prop in first) {
    if (first[prop] !== second[prop])
      return false;
  }
  return true;
};
const cache = {};
const tpl = (html) => {
  let template = cache[html];
  if (!template) {
    template = document.createElement("template");
    template.innerHTML = html;
    cache[html] = template;
  }
  return template;
};
const fire = (target, type, detail) => {
  target.dispatchEvent(new CustomEvent(type, {
    bubbles: true,
    detail
  }));
};
let hasTouched = false;
const isTouch = (e) => "touches" in e;
const isValid = (event) => {
  if (hasTouched && !isTouch(event))
    return false;
  if (!hasTouched)
    hasTouched = isTouch(event);
  return true;
};
const pointerMove = (target, event) => {
  const pointer = isTouch(event) ? event.touches[0] : event;
  const rect = target.el.getBoundingClientRect();
  fire(target.el, "move", target.getMove({
    x: clamp$1((pointer.pageX - (rect.left + window.pageXOffset)) / rect.width),
    y: clamp$1((pointer.pageY - (rect.top + window.pageYOffset)) / rect.height)
  }));
};
const keyMove = (target, event) => {
  const keyCode = event.keyCode;
  if (keyCode > 40 || target.xy && keyCode < 37 || keyCode < 33)
    return;
  event.preventDefault();
  fire(target.el, "move", target.getMove({
    x: keyCode === 39 ? 0.01 : keyCode === 37 ? -0.01 : keyCode === 34 ? 0.05 : keyCode === 33 ? -0.05 : keyCode === 35 ? 1 : keyCode === 36 ? -1 : 0,
    y: keyCode === 40 ? 0.01 : keyCode === 38 ? -0.01 : 0
  }, true));
};
class Slider {
  constructor(root, part, aria, xy) {
    const template = tpl(`<div role="slider" tabindex="0" part="${part}" ${aria}><div part="${part}-pointer"></div></div>`);
    root.appendChild(template.content.cloneNode(true));
    const el = root.querySelector(`[part=${part}]`);
    el.addEventListener("mousedown", this);
    el.addEventListener("touchstart", this);
    el.addEventListener("keydown", this);
    this.el = el;
    this.xy = xy;
    this.nodes = [el.firstChild, el];
  }
  set dragging(state) {
    const toggleEvent = state ? document.addEventListener : document.removeEventListener;
    toggleEvent(hasTouched ? "touchmove" : "mousemove", this);
    toggleEvent(hasTouched ? "touchend" : "mouseup", this);
  }
  handleEvent(event) {
    switch (event.type) {
      case "mousedown":
      case "touchstart":
        event.preventDefault();
        if (!isValid(event) || !hasTouched && event.button != 0)
          return;
        this.el.focus();
        pointerMove(this, event);
        this.dragging = true;
        break;
      case "mousemove":
      case "touchmove":
        event.preventDefault();
        pointerMove(this, event);
        break;
      case "mouseup":
      case "touchend":
        this.dragging = false;
        break;
      case "keydown":
        keyMove(this, event);
        break;
    }
  }
  style(styles) {
    styles.forEach((style, i) => {
      for (const p in style) {
        this.nodes[i].style.setProperty(p, style[p]);
      }
    });
  }
}
class Hue extends Slider {
  constructor(root) {
    super(root, "hue", 'aria-label="Hue" aria-valuemin="0" aria-valuemax="360"', false);
  }
  update({ h }) {
    this.h = h;
    this.style([
      {
        left: `${h / 360 * 100}%`,
        color: hsvaToHslString({ h, s: 100, v: 100, a: 1 })
      }
    ]);
    this.el.setAttribute("aria-valuenow", `${round(h)}`);
  }
  getMove(offset, key) {
    return { h: key ? clamp$1(this.h + offset.x * 360, 0, 360) : 360 * offset.x };
  }
}
class Saturation extends Slider {
  constructor(root) {
    super(root, "saturation", 'aria-label="Color"', true);
  }
  update(hsva) {
    this.hsva = hsva;
    this.style([
      {
        top: `${100 - hsva.v}%`,
        left: `${hsva.s}%`,
        color: hsvaToHslString(hsva)
      },
      {
        "background-color": hsvaToHslString({ h: hsva.h, s: 100, v: 100, a: 1 })
      }
    ]);
    this.el.setAttribute("aria-valuetext", `Saturation ${round(hsva.s)}%, Brightness ${round(hsva.v)}%`);
  }
  getMove(offset, key) {
    return {
      s: key ? clamp$1(this.hsva.s + offset.x * 100, 0, 100) : offset.x * 100,
      v: key ? clamp$1(this.hsva.v - offset.y * 100, 0, 100) : Math.round(100 - offset.y * 100)
    };
  }
}
var css = `:host{display:flex;flex-direction:column;position:relative;width:200px;height:200px;user-select:none;-webkit-user-select:none;cursor:default}:host([hidden]){display:none!important}[role=slider]{position:relative;touch-action:none;user-select:none;-webkit-user-select:none;outline:0}[role=slider]:last-child{border-radius:0 0 8px 8px}[part$=pointer]{position:absolute;z-index:1;box-sizing:border-box;width:28px;height:28px;transform:translate(-50%,-50%);background-color:#fff;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.2)}[part$=pointer]::after{display:block;content:'';position:absolute;left:0;top:0;right:0;bottom:0;border-radius:inherit;background-color:currentColor}[role=slider]:focus [part$=pointer]{transform:translate(-50%,-50%) scale(1.1)}`;
var hueCss = `[part=hue]{flex:0 0 24px;background:linear-gradient(to right,red 0,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,red 100%)}[part=hue-pointer]{top:50%;z-index:2}`;
var saturationCss = `[part=saturation]{flex-grow:1;border-color:transparent;border-bottom:12px solid #000;border-radius:8px 8px 0 0;background-image:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,rgba(255,255,255,0));box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)}[part=saturation-pointer]{z-index:3}`;
const $isSame = Symbol("same");
const $color = Symbol("color");
const $hsva = Symbol("hsva");
const $change = Symbol("change");
const $update = Symbol("update");
const $parts = Symbol("parts");
const $css = Symbol("css");
const $sliders = Symbol("sliders");
class ColorPicker extends HTMLElement {
  static get observedAttributes() {
    return ["color"];
  }
  get [$css]() {
    return [css, hueCss, saturationCss];
  }
  get [$sliders]() {
    return [Saturation, Hue];
  }
  get color() {
    return this[$color];
  }
  set color(newColor) {
    if (!this[$isSame](newColor)) {
      const newHsva = this.colorModel.toHsva(newColor);
      this[$update](newHsva);
      this[$change](newColor);
    }
  }
  constructor() {
    super();
    const template = tpl(`<style>${this[$css].join("")}</style>`);
    const root = this.attachShadow({ mode: "open" });
    root.appendChild(template.content.cloneNode(true));
    root.addEventListener("move", this);
    this[$parts] = this[$sliders].map((slider) => new slider(root));
  }
  connectedCallback() {
    if (this.hasOwnProperty("color")) {
      const value = this.color;
      delete this["color"];
      this.color = value;
    } else if (!this.color) {
      this.color = this.colorModel.defaultColor;
    }
  }
  attributeChangedCallback(_attr, _oldVal, newVal) {
    const color = this.colorModel.fromAttr(newVal);
    if (!this[$isSame](color)) {
      this.color = color;
    }
  }
  handleEvent(event) {
    const oldHsva = this[$hsva];
    const newHsva = { ...oldHsva, ...event.detail };
    this[$update](newHsva);
    let newColor;
    if (!equalColorObjects(newHsva, oldHsva) && !this[$isSame](newColor = this.colorModel.fromHsva(newHsva))) {
      this[$change](newColor);
    }
  }
  [$isSame](color) {
    return this.color && this.colorModel.equal(color, this.color);
  }
  [$update](hsva) {
    this[$hsva] = hsva;
    this[$parts].forEach((part) => part.update(hsva));
  }
  [$change](value) {
    this[$color] = value;
    fire(this, "color-changed", { value });
  }
}
class Alpha extends Slider {
  constructor(root) {
    super(root, "alpha", 'aria-label="Alpha" aria-valuemin="0" aria-valuemax="1"', false);
  }
  update(hsva) {
    this.hsva = hsva;
    const colorFrom = hsvaToHslaString({ ...hsva, a: 0 });
    const colorTo = hsvaToHslaString({ ...hsva, a: 1 });
    const value = hsva.a * 100;
    this.style([
      {
        left: `${value}%`,
        color: hsvaToHslaString(hsva)
      },
      {
        "--gradient": `linear-gradient(90deg, ${colorFrom}, ${colorTo}`
      }
    ]);
    const v = round(value);
    this.el.setAttribute("aria-valuenow", `${v}`);
    this.el.setAttribute("aria-valuetext", `${v}%`);
  }
  getMove(offset, key) {
    return { a: key ? clamp$1(this.hsva.a + offset.x) : offset.x };
  }
}
var alphaCss = `[part=alpha]{flex:0 0 24px}[part=alpha]::after{display:block;content:'';position:absolute;top:0;left:0;right:0;bottom:0;border-radius:inherit;background-image:var(--gradient);box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)}[part^=alpha]{background-color:#fff;background-image:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill-opacity=".05"><rect x="8" width="8" height="8"/><rect y="8" width="8" height="8"/></svg>')}[part=alpha-pointer]{top:50%}`;
class AlphaColorPicker extends ColorPicker {
  get [$css]() {
    return [...super[$css], alphaCss];
  }
  get [$sliders]() {
    return [...super[$sliders], Alpha];
  }
}
const colorModel$1 = {
  defaultColor: { r: 0, g: 0, b: 0, a: 1 },
  toHsva: rgbaToHsva,
  fromHsva: hsvaToRgba,
  equal: equalColorObjects,
  fromAttr: (color) => JSON.parse(color)
};
class RgbaBase extends AlphaColorPicker {
  get colorModel() {
    return colorModel$1;
  }
}
class RgbaColorPicker extends RgbaBase {
}
customElements.define("rgba-color-picker", RgbaColorPicker);
const colorModel = {
  defaultColor: { r: 0, g: 0, b: 0 },
  toHsva: ({ r, g, b }) => rgbaToHsva({ r, g, b, a: 1 }),
  fromHsva: (hsva) => rgbaToRgb(hsvaToRgba(hsva)),
  equal: equalColorObjects,
  fromAttr: (color) => JSON.parse(color)
};
class RgbBase extends ColorPicker {
  get colorModel() {
    return colorModel;
  }
}
class RgbColorPicker extends RgbBase {
}
customElements.define("rgb-color-picker", RgbColorPicker);
var colorString = { exports: {} };
var colorName = {
  "aliceblue": [240, 248, 255],
  "antiquewhite": [250, 235, 215],
  "aqua": [0, 255, 255],
  "aquamarine": [127, 255, 212],
  "azure": [240, 255, 255],
  "beige": [245, 245, 220],
  "bisque": [255, 228, 196],
  "black": [0, 0, 0],
  "blanchedalmond": [255, 235, 205],
  "blue": [0, 0, 255],
  "blueviolet": [138, 43, 226],
  "brown": [165, 42, 42],
  "burlywood": [222, 184, 135],
  "cadetblue": [95, 158, 160],
  "chartreuse": [127, 255, 0],
  "chocolate": [210, 105, 30],
  "coral": [255, 127, 80],
  "cornflowerblue": [100, 149, 237],
  "cornsilk": [255, 248, 220],
  "crimson": [220, 20, 60],
  "cyan": [0, 255, 255],
  "darkblue": [0, 0, 139],
  "darkcyan": [0, 139, 139],
  "darkgoldenrod": [184, 134, 11],
  "darkgray": [169, 169, 169],
  "darkgreen": [0, 100, 0],
  "darkgrey": [169, 169, 169],
  "darkkhaki": [189, 183, 107],
  "darkmagenta": [139, 0, 139],
  "darkolivegreen": [85, 107, 47],
  "darkorange": [255, 140, 0],
  "darkorchid": [153, 50, 204],
  "darkred": [139, 0, 0],
  "darksalmon": [233, 150, 122],
  "darkseagreen": [143, 188, 143],
  "darkslateblue": [72, 61, 139],
  "darkslategray": [47, 79, 79],
  "darkslategrey": [47, 79, 79],
  "darkturquoise": [0, 206, 209],
  "darkviolet": [148, 0, 211],
  "deeppink": [255, 20, 147],
  "deepskyblue": [0, 191, 255],
  "dimgray": [105, 105, 105],
  "dimgrey": [105, 105, 105],
  "dodgerblue": [30, 144, 255],
  "firebrick": [178, 34, 34],
  "floralwhite": [255, 250, 240],
  "forestgreen": [34, 139, 34],
  "fuchsia": [255, 0, 255],
  "gainsboro": [220, 220, 220],
  "ghostwhite": [248, 248, 255],
  "gold": [255, 215, 0],
  "goldenrod": [218, 165, 32],
  "gray": [128, 128, 128],
  "green": [0, 128, 0],
  "greenyellow": [173, 255, 47],
  "grey": [128, 128, 128],
  "honeydew": [240, 255, 240],
  "hotpink": [255, 105, 180],
  "indianred": [205, 92, 92],
  "indigo": [75, 0, 130],
  "ivory": [255, 255, 240],
  "khaki": [240, 230, 140],
  "lavender": [230, 230, 250],
  "lavenderblush": [255, 240, 245],
  "lawngreen": [124, 252, 0],
  "lemonchiffon": [255, 250, 205],
  "lightblue": [173, 216, 230],
  "lightcoral": [240, 128, 128],
  "lightcyan": [224, 255, 255],
  "lightgoldenrodyellow": [250, 250, 210],
  "lightgray": [211, 211, 211],
  "lightgreen": [144, 238, 144],
  "lightgrey": [211, 211, 211],
  "lightpink": [255, 182, 193],
  "lightsalmon": [255, 160, 122],
  "lightseagreen": [32, 178, 170],
  "lightskyblue": [135, 206, 250],
  "lightslategray": [119, 136, 153],
  "lightslategrey": [119, 136, 153],
  "lightsteelblue": [176, 196, 222],
  "lightyellow": [255, 255, 224],
  "lime": [0, 255, 0],
  "limegreen": [50, 205, 50],
  "linen": [250, 240, 230],
  "magenta": [255, 0, 255],
  "maroon": [128, 0, 0],
  "mediumaquamarine": [102, 205, 170],
  "mediumblue": [0, 0, 205],
  "mediumorchid": [186, 85, 211],
  "mediumpurple": [147, 112, 219],
  "mediumseagreen": [60, 179, 113],
  "mediumslateblue": [123, 104, 238],
  "mediumspringgreen": [0, 250, 154],
  "mediumturquoise": [72, 209, 204],
  "mediumvioletred": [199, 21, 133],
  "midnightblue": [25, 25, 112],
  "mintcream": [245, 255, 250],
  "mistyrose": [255, 228, 225],
  "moccasin": [255, 228, 181],
  "navajowhite": [255, 222, 173],
  "navy": [0, 0, 128],
  "oldlace": [253, 245, 230],
  "olive": [128, 128, 0],
  "olivedrab": [107, 142, 35],
  "orange": [255, 165, 0],
  "orangered": [255, 69, 0],
  "orchid": [218, 112, 214],
  "palegoldenrod": [238, 232, 170],
  "palegreen": [152, 251, 152],
  "paleturquoise": [175, 238, 238],
  "palevioletred": [219, 112, 147],
  "papayawhip": [255, 239, 213],
  "peachpuff": [255, 218, 185],
  "peru": [205, 133, 63],
  "pink": [255, 192, 203],
  "plum": [221, 160, 221],
  "powderblue": [176, 224, 230],
  "purple": [128, 0, 128],
  "rebeccapurple": [102, 51, 153],
  "red": [255, 0, 0],
  "rosybrown": [188, 143, 143],
  "royalblue": [65, 105, 225],
  "saddlebrown": [139, 69, 19],
  "salmon": [250, 128, 114],
  "sandybrown": [244, 164, 96],
  "seagreen": [46, 139, 87],
  "seashell": [255, 245, 238],
  "sienna": [160, 82, 45],
  "silver": [192, 192, 192],
  "skyblue": [135, 206, 235],
  "slateblue": [106, 90, 205],
  "slategray": [112, 128, 144],
  "slategrey": [112, 128, 144],
  "snow": [255, 250, 250],
  "springgreen": [0, 255, 127],
  "steelblue": [70, 130, 180],
  "tan": [210, 180, 140],
  "teal": [0, 128, 128],
  "thistle": [216, 191, 216],
  "tomato": [255, 99, 71],
  "turquoise": [64, 224, 208],
  "violet": [238, 130, 238],
  "wheat": [245, 222, 179],
  "white": [255, 255, 255],
  "whitesmoke": [245, 245, 245],
  "yellow": [255, 255, 0],
  "yellowgreen": [154, 205, 50]
};
var simpleSwizzle = { exports: {} };
var isArrayish$1 = function isArrayish(obj) {
  if (!obj || typeof obj === "string") {
    return false;
  }
  return obj instanceof Array || Array.isArray(obj) || obj.length >= 0 && (obj.splice instanceof Function || Object.getOwnPropertyDescriptor(obj, obj.length - 1) && obj.constructor.name !== "String");
};
var isArrayish2 = isArrayish$1;
var concat = Array.prototype.concat;
var slice = Array.prototype.slice;
var swizzle$1 = simpleSwizzle.exports = function swizzle(args) {
  var results = [];
  for (var i = 0, len = args.length; i < len; i++) {
    var arg = args[i];
    if (isArrayish2(arg)) {
      results = concat.call(results, slice.call(arg));
    } else {
      results.push(arg);
    }
  }
  return results;
};
swizzle$1.wrap = function(fn) {
  return function() {
    return fn(swizzle$1(arguments));
  };
};
var colorNames = colorName;
var swizzle2 = simpleSwizzle.exports;
var hasOwnProperty = Object.hasOwnProperty;
var reverseNames = /* @__PURE__ */ Object.create(null);
for (var name in colorNames) {
  if (hasOwnProperty.call(colorNames, name)) {
    reverseNames[colorNames[name]] = name;
  }
}
var cs = colorString.exports = {
  to: {},
  get: {}
};
cs.get = function(string) {
  var prefix = string.substring(0, 3).toLowerCase();
  var val;
  var model;
  switch (prefix) {
    case "hsl":
      val = cs.get.hsl(string);
      model = "hsl";
      break;
    case "hwb":
      val = cs.get.hwb(string);
      model = "hwb";
      break;
    default:
      val = cs.get.rgb(string);
      model = "rgb";
      break;
  }
  if (!val) {
    return null;
  }
  return { model, value: val };
};
cs.get.rgb = function(string) {
  if (!string) {
    return null;
  }
  var abbr = /^#([a-f0-9]{3,4})$/i;
  var hex = /^#([a-f0-9]{6})([a-f0-9]{2})?$/i;
  var rgba = /^rgba?\(\s*([+-]?\d+)(?=[\s,])\s*(?:,\s*)?([+-]?\d+)(?=[\s,])\s*(?:,\s*)?([+-]?\d+)\s*(?:[,|\/]\s*([+-]?[\d\.]+)(%?)\s*)?\)$/;
  var per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,?\s*([+-]?[\d\.]+)\%\s*,?\s*([+-]?[\d\.]+)\%\s*(?:[,|\/]\s*([+-]?[\d\.]+)(%?)\s*)?\)$/;
  var keyword = /^(\w+)$/;
  var rgb = [0, 0, 0, 1];
  var match;
  var i;
  var hexAlpha;
  if (match = string.match(hex)) {
    hexAlpha = match[2];
    match = match[1];
    for (i = 0; i < 3; i++) {
      var i2 = i * 2;
      rgb[i] = parseInt(match.slice(i2, i2 + 2), 16);
    }
    if (hexAlpha) {
      rgb[3] = parseInt(hexAlpha, 16) / 255;
    }
  } else if (match = string.match(abbr)) {
    match = match[1];
    hexAlpha = match[3];
    for (i = 0; i < 3; i++) {
      rgb[i] = parseInt(match[i] + match[i], 16);
    }
    if (hexAlpha) {
      rgb[3] = parseInt(hexAlpha + hexAlpha, 16) / 255;
    }
  } else if (match = string.match(rgba)) {
    for (i = 0; i < 3; i++) {
      rgb[i] = parseInt(match[i + 1], 0);
    }
    if (match[4]) {
      if (match[5]) {
        rgb[3] = parseFloat(match[4]) * 0.01;
      } else {
        rgb[3] = parseFloat(match[4]);
      }
    }
  } else if (match = string.match(per)) {
    for (i = 0; i < 3; i++) {
      rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
    }
    if (match[4]) {
      if (match[5]) {
        rgb[3] = parseFloat(match[4]) * 0.01;
      } else {
        rgb[3] = parseFloat(match[4]);
      }
    }
  } else if (match = string.match(keyword)) {
    if (match[1] === "transparent") {
      return [0, 0, 0, 0];
    }
    if (!hasOwnProperty.call(colorNames, match[1])) {
      return null;
    }
    rgb = colorNames[match[1]];
    rgb[3] = 1;
    return rgb;
  } else {
    return null;
  }
  for (i = 0; i < 3; i++) {
    rgb[i] = clamp(rgb[i], 0, 255);
  }
  rgb[3] = clamp(rgb[3], 0, 1);
  return rgb;
};
cs.get.hsl = function(string) {
  if (!string) {
    return null;
  }
  var hsl = /^hsla?\(\s*([+-]?(?:\d{0,3}\.)?\d+)(?:deg)?\s*,?\s*([+-]?[\d\.]+)%\s*,?\s*([+-]?[\d\.]+)%\s*(?:[,|\/]\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:[eE][+-]?\d+)?)\s*)?\)$/;
  var match = string.match(hsl);
  if (match) {
    var alpha = parseFloat(match[4]);
    var h = (parseFloat(match[1]) % 360 + 360) % 360;
    var s = clamp(parseFloat(match[2]), 0, 100);
    var l = clamp(parseFloat(match[3]), 0, 100);
    var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
    return [h, s, l, a];
  }
  return null;
};
cs.get.hwb = function(string) {
  if (!string) {
    return null;
  }
  var hwb = /^hwb\(\s*([+-]?\d{0,3}(?:\.\d+)?)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:[eE][+-]?\d+)?)\s*)?\)$/;
  var match = string.match(hwb);
  if (match) {
    var alpha = parseFloat(match[4]);
    var h = (parseFloat(match[1]) % 360 + 360) % 360;
    var w = clamp(parseFloat(match[2]), 0, 100);
    var b = clamp(parseFloat(match[3]), 0, 100);
    var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
    return [h, w, b, a];
  }
  return null;
};
cs.to.hex = function() {
  var rgba = swizzle2(arguments);
  return "#" + hexDouble(rgba[0]) + hexDouble(rgba[1]) + hexDouble(rgba[2]) + (rgba[3] < 1 ? hexDouble(Math.round(rgba[3] * 255)) : "");
};
cs.to.rgb = function() {
  var rgba = swizzle2(arguments);
  return rgba.length < 4 || rgba[3] === 1 ? "rgb(" + Math.round(rgba[0]) + ", " + Math.round(rgba[1]) + ", " + Math.round(rgba[2]) + ")" : "rgba(" + Math.round(rgba[0]) + ", " + Math.round(rgba[1]) + ", " + Math.round(rgba[2]) + ", " + rgba[3] + ")";
};
cs.to.rgb.percent = function() {
  var rgba = swizzle2(arguments);
  var r = Math.round(rgba[0] / 255 * 100);
  var g = Math.round(rgba[1] / 255 * 100);
  var b = Math.round(rgba[2] / 255 * 100);
  return rgba.length < 4 || rgba[3] === 1 ? "rgb(" + r + "%, " + g + "%, " + b + "%)" : "rgba(" + r + "%, " + g + "%, " + b + "%, " + rgba[3] + ")";
};
cs.to.hsl = function() {
  var hsla = swizzle2(arguments);
  return hsla.length < 4 || hsla[3] === 1 ? "hsl(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%)" : "hsla(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%, " + hsla[3] + ")";
};
cs.to.hwb = function() {
  var hwba = swizzle2(arguments);
  var a = "";
  if (hwba.length >= 4 && hwba[3] !== 1) {
    a = ", " + hwba[3];
  }
  return "hwb(" + hwba[0] + ", " + hwba[1] + "%, " + hwba[2] + "%" + a + ")";
};
cs.to.keyword = function(rgb) {
  return reverseNames[rgb.slice(0, 3)];
};
function clamp(num, min, max) {
  return Math.min(Math.max(min, num), max);
}
function hexDouble(num) {
  var str = Math.round(num).toString(16).toUpperCase();
  return str.length < 2 ? "0" + str : str;
}
var MyComponent_vue_vue_type_style_index_0_lang = "";
const _hoisted_1 = { class: "wrapper-container" };
const _sfc_main = defineComponent({
  __name: "MyComponent",
  props: {
    value: {},
    opacity: { type: Boolean }
  },
  emits: ["change"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const rgbaColorPicker = ref(null);
    const rgbColorPicker = ref(null);
    const currentColor = ref(props.value);
    function emitChange() {
      emits("change", currentColor.value);
    }
    function colorObj2StrRgba(c) {
      return `rgba(${c.r},${c.g},${c.b},${c.a})`;
    }
    function colorObj2StrRgb(c) {
      return `rgb(${c.r},${c.g},${c.b})`;
    }
    function colorStr2Obj(c) {
      const result = colorString.exports.get.rgb(c);
      const [r, g, b, a] = result || [0, 0, 0, 1];
      return { r, g, b, a };
    }
    onMounted(() => {
      if (rgbaColorPicker.value !== null) {
        rgbaColorPicker.value.color = colorStr2Obj(currentColor.value);
        rgbaColorPicker.value.addEventListener("color-changed", (event) => {
          currentColor.value = colorObj2StrRgba(event.detail.value);
          emitChange();
        });
      }
      if (rgbColorPicker.value != null) {
        rgbColorPicker.value.color = colorStr2Obj(currentColor.value);
        rgbColorPicker.value.addEventListener("color-changed", (event) => {
          currentColor.value = colorObj2StrRgb(event.detail.value);
          emitChange();
        });
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _ctx.opacity ? (openBlock(), createBlock(unref(rgbaColorPicker), {
          key: 0,
          ref_key: "rgbaColorPicker",
          ref: rgbaColorPicker,
          class: "color-picker-panel-item"
        }, null, 512)) : createCommentVNode("", true),
        !_ctx.opacity ? (openBlock(), createBlock(unref(rgbColorPicker), {
          key: 1,
          ref_key: "rgbColorPicker",
          ref: rgbColorPicker,
          class: "color-picker-panel-item"
        }, null, 512)) : createCommentVNode("", true)
      ]);
    };
  }
});
const MyComponent = _sfc_main;
export { MyComponent };
