(() => {
  // assets/src/shared/protocol.js
  var URL_PREFIX = "/dsh-nascence";
  var STATE_PATH = URL_PREFIX + "/state";
  var CONFIG_PATH = URL_PREFIX + "/config";
  var HARDWARE_PATH = URL_PREFIX + "/hardware";
  var SIZE_MIN = 0.6;
  var SIZE_MAX = 2;
  var OPACITY_MIN = 0.3;
  var BUBBLE_SCALE_MIN = 50;
  var BUBBLE_SCALE_MAX = 200;
  var BUBBLE_SCALE_BASE = 100;
  var SNAP_STRENGTH_MIN = 0;
  var SNAP_STRENGTH_MAX = 200;
  var LOW_THRESHOLD_DEFAULT = 10;
  var IDLE_CHATTER_MINUTES_DEFAULT = 10;
  var IDLE_CHATTER_CHANCE_DEFAULT = 0.5;
  var DIALOGUE_KEYS = [
    "idle",
    "sadIdle",
    "thinkIdle",
    "lowBalance",
    "credited",
    "peakTime",
    "valleyTime",
    "turnInterrupted",
    "error",
    "toolSuccess",
    "turnEnd",
    "interact",
    "interactIdle",
    "interactSadIdle",
    "interactThinkIdle"
  ];
  function normalizeDialogues(raw) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    for (const key of DIALOGUE_KEYS) {
      const list = raw[key];
      if (!Array.isArray(list)) continue;
      const rows = list.map((item) => String(item == null ? "" : item).trim()).filter(Boolean).slice(0, 40).map((item) => item.slice(0, 200));
      if (rows.length) out[key] = rows;
    }
    return out;
  }
  var SETTINGS_DEFAULTS = Object.freeze({
    mirror: "auto",
    size: 1,
    bubble: true,
    // 气泡缩放：100% 为基准；50%–200%
    bubbleScale: BUBBLE_SCALE_BASE,
    // 分级排版：金额大、辅助信息小的多字号排版（关掉后统一字号）
    bubbleTiers: true,
    // 边缘吸附强度：200% = 旧行为（屏幕外侧 1/4），0% = 不吸附
    snapStrength: SNAP_STRENGTH_MAX,
    opacity: 1,
    sound: true,
    volume: 0.7,
    voice: true,
    voiceLang: "zh",
    voiceVolume: 0.7,
    lowThreshold: LOW_THRESHOLD_DEFAULT,
    idleChatterMinutes: IDLE_CHATTER_MINUTES_DEFAULT,
    idleChatterChance: IDLE_CHATTER_CHANCE_DEFAULT,
    // 硬件状态挂牌：默认关闭；位置默认在桌宠下方。
    plate: false,
    platePosition: "bottom",
    dialogues: {}
  });
  function normalizeSettings(raw, base) {
    const out = { ...base || SETTINGS_DEFAULTS };
    if (!raw || typeof raw !== "object") return out;
    if (raw.mirror === "auto" || raw.mirror === "always" || raw.mirror === "never") out.mirror = raw.mirror;
    const size = Number(raw.size);
    if (Number.isFinite(size)) out.size = Math.min(SIZE_MAX, Math.max(SIZE_MIN, size));
    if (typeof raw.bubble === "boolean") out.bubble = raw.bubble;
    const bubbleScale = Number(raw.bubbleScale);
    if (Number.isFinite(bubbleScale)) {
      out.bubbleScale = Math.min(BUBBLE_SCALE_MAX, Math.max(BUBBLE_SCALE_MIN, bubbleScale));
    }
    if (typeof raw.bubbleTiers === "boolean") out.bubbleTiers = raw.bubbleTiers;
    const snapStrength = Number(raw.snapStrength);
    if (Number.isFinite(snapStrength)) {
      out.snapStrength = Math.min(SNAP_STRENGTH_MAX, Math.max(SNAP_STRENGTH_MIN, snapStrength));
    }
    const opacity = Number(raw.opacity);
    if (Number.isFinite(opacity)) out.opacity = Math.min(1, Math.max(OPACITY_MIN, opacity));
    if (typeof raw.sound === "boolean") out.sound = raw.sound;
    const volume = Number(raw.volume);
    if (Number.isFinite(volume)) out.volume = Math.min(1, Math.max(0, volume));
    if (typeof raw.voice === "boolean") out.voice = raw.voice;
    if (raw.voiceLang === "zh" || raw.voiceLang === "ja") out.voiceLang = raw.voiceLang;
    const voiceVolume = Number(raw.voiceVolume);
    if (Number.isFinite(voiceVolume)) out.voiceVolume = Math.min(1, Math.max(0, voiceVolume));
    const lowThreshold = Number(raw.lowThreshold);
    if (Number.isFinite(lowThreshold)) out.lowThreshold = Math.min(1e6, Math.max(0, lowThreshold));
    const idleChatterMinutes = Number(raw.idleChatterMinutes);
    if (Number.isFinite(idleChatterMinutes)) out.idleChatterMinutes = Math.min(1440, Math.max(0, idleChatterMinutes));
    const idleChatterChance = Number(raw.idleChatterChance);
    if (Number.isFinite(idleChatterChance)) out.idleChatterChance = Math.min(1, Math.max(0, idleChatterChance));
    if (typeof raw.plate === "boolean") out.plate = raw.plate;
    if (raw.platePosition === "top" || raw.platePosition === "bottom") out.platePosition = raw.platePosition;
    if (raw.dialogues && typeof raw.dialogues === "object") {
      out.dialogues = { ...normalizeDialogues(out.dialogues), ...normalizeDialogues(raw.dialogues) };
    }
    return out;
  }

  // assets/src/core/env.js
  var PREFIX = "/dsh-nascence";
  var CANVAS_W = 300;
  var FRAME = { x: -229.1, y: -10.6, w: 443.6, h: 373.4 };
  var MARGIN = 12;
  var POS_KEY = "dshtn-pos";
  var SETTINGS_KEY = "dshtn-settings";
  var DRAG_THRESHOLD_SQ = 9;
  function numOverride(key, fallback) {
    var raw;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      return fallback;
    }
    if (raw === null || raw === "") return fallback;
    var v = Number(raw);
    return isFinite(v) && v >= 0 ? v : fallback;
  }
  var STARTUP_DELAY = numOverride("dshtn-startup-delay", 5e3);
  var STARTUP_GAP = numOverride("dshtn-startup-gap", 2e3);
  var log = function() {
    try {
      console.info.apply(console, ["[nascence-pet]"].concat([].slice.call(arguments)));
    } catch (e) {
    }
  };
  var warn = function() {
    try {
      console.warn.apply(console, ["[nascence-pet]"].concat([].slice.call(arguments)));
    } catch (e) {
    }
  };

  // assets/src/core/settings.js
  var settings = { ...SETTINGS_DEFAULTS };
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      var v = JSON.parse(raw);
      if (!v || typeof v !== "object") return;
      Object.assign(settings, normalizeSettings(v, settings));
    } catch (err) {
    }
  }
  var saveTimer = 0;
  function saveSettings(immediate) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        mirror: settings.mirror,
        size: settings.size,
        bubble: settings.bubble,
        bubbleScale: settings.bubbleScale,
        bubbleTiers: settings.bubbleTiers,
        snapStrength: settings.snapStrength,
        opacity: settings.opacity,
        sound: settings.sound,
        volume: settings.volume,
        voice: settings.voice,
        voiceLang: settings.voiceLang,
        voiceVolume: settings.voiceVolume,
        lowThreshold: settings.lowThreshold,
        idleChatterMinutes: settings.idleChatterMinutes,
        idleChatterChance: settings.idleChatterChance,
        plate: settings.plate,
        platePosition: settings.platePosition,
        dialogues: settings.dialogues || {}
      }));
    } catch (err) {
    }
    clearTimeout(saveTimer);
    var push = function() {
      try {
        var payload = {
          mirror: settings.mirror,
          size: settings.size,
          bubble: settings.bubble,
          bubbleScale: settings.bubbleScale,
          bubbleTiers: settings.bubbleTiers,
          snapStrength: settings.snapStrength,
          opacity: settings.opacity,
          sound: settings.sound,
          volume: settings.volume,
          voice: settings.voice,
          voiceLang: settings.voiceLang,
          voiceVolume: settings.voiceVolume
        };
        if (settings.hostLoaded) {
          payload.lowThreshold = settings.lowThreshold;
          payload.idleChatterMinutes = settings.idleChatterMinutes;
          payload.idleChatterChance = settings.idleChatterChance;
          payload.plate = settings.plate;
          payload.platePosition = settings.platePosition;
          payload.dialogues = settings.dialogues || {};
        }
        fetch(PREFIX + "/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: payload })
        }).catch(function() {
        });
      } catch (err) {
      }
    };
    if (immediate) push();
    else saveTimer = setTimeout(push, 400);
  }
  loadSettings();

  // assets/src/render/hit-test.js
  var HIT_MASK_W = 128;
  var HIT_MASK_H = 108;
  var HIT_GROW = 6;
  var HIT_FORMS = [
    ["r", -76.2, 307.4, 26.7, 337.8, 9.1],
    ["r", -81.7, 276.4, 64.1, 307.4, 9.3],
    ["r", -97.2, 245.5, 80.1, 276.4, 9.3],
    ["r", -110.7, 214.5, 86.6, 245.5, 9.3],
    ["r", -113.7, 183.6, 98.1, 214.5, 9.3],
    ["r", -106.2, 153.1, 88.1, 183.6, 9.2],
    ["r", -109.2, 122.2, 93.6, 153.1, 9.3],
    ["r", -118.7, 91.2, 104.1, 122.2, 9.3],
    ["r", -108.7, 60.3, 96.1, 91.2, 9.3],
    ["r", -79.2, 29.3, 73.1, 60.3, 9.3],
    ["r", -42.3, -1.6, 29.2, 29.3, 9.3]
  ];
  function hitFormIn(form, x, y) {
    var g = HIT_GROW;
    if (form[0] === "e") {
      var ex = (x - form[1]) / (form[3] + g);
      var ey = (y - form[2]) / (form[4] + g);
      return ex * ex + ey * ey <= 1;
    }
    if (form[0] === "r") {
      var x0 = form[1] - g;
      var y0 = form[2] - g;
      var x1 = form[3] + g;
      var y1 = form[4] + g;
      var rr = form[5] + g;
      var cx = Math.min(Math.max(x, x0 + rr), x1 - rr);
      var cy = Math.min(Math.max(y, y0 + rr), y1 - rr);
      var dx = x - cx;
      var dy = y - cy;
      return dx * dx + dy * dy <= rr * rr;
    }
    var ax = form[1], ay = form[2], bx = form[3], by = form[4];
    var rad = form[5] + g;
    var vx = bx - ax, vy = by - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? ((x - ax) * vx + (y - ay) * vy) / len2 : 0;
    t = Math.min(Math.max(t, 0), 1);
    var px = ax + t * vx, py = ay + t * vy;
    var ddx = x - px, ddy = y - py;
    return ddx * ddx + ddy * ddy <= rad * rad;
  }
  function buildHitMask() {
    var m = new Uint8Array(HIT_MASK_W * HIT_MASK_H);
    for (var my = 0; my < HIT_MASK_H; my++) {
      var wy = FRAME.y + FRAME.h - (my + 0.5) / HIT_MASK_H * FRAME.h;
      for (var mx = 0; mx < HIT_MASK_W; mx++) {
        var wx = FRAME.x + (mx + 0.5) / HIT_MASK_W * FRAME.w;
        for (var k = 0; k < HIT_FORMS.length; k++) {
          if (hitFormIn(HIT_FORMS[k], wx, wy)) {
            m[my * HIT_MASK_W + mx] = 1;
            break;
          }
        }
      }
    }
    return m;
  }
  function maskHit(mask, nx, ny) {
    if (!(nx >= 0 && nx < 1 && ny >= 0 && ny < 1)) return false;
    var mx = Math.floor(nx * HIT_MASK_W);
    var my = Math.floor(ny * HIT_MASK_H);
    if (mx >= HIT_MASK_W) mx = HIT_MASK_W - 1;
    if (my >= HIT_MASK_H) my = HIT_MASK_H - 1;
    return mask[my * HIT_MASK_W + mx] === 1;
  }

  // assets/src/anim/library.js
  var CLIP_FADE_MS = 320;
  var HAPPY_CHANCE = 0.25;
  var CLIPS = {
    Idle: { src: "idle.webm", duration: 4, loop: true },
    Sad_Idle: { src: "sad_idle.webm", duration: 4, loop: true },
    Think_Idle: { src: "think_idle.webm", duration: 4, loop: true },
    Happy: { src: "happy.webm", duration: 4 },
    Sad_Begin: { src: "sad_begin.webm", duration: 2.67 },
    Sad_Exit: { src: "sad_exit.webm", duration: 2.67 },
    Think_Begin: { src: "think_begin.webm", duration: 2.67 },
    Think_Exit: { src: "think_exit.webm", duration: 2.67 },
    Celebrate: { src: "celebrate.webm", duration: 4 },
    Talk: { src: "talk.webm", duration: 5 },
    Interact_1: { src: "interact_1.webm", duration: 4 },
    Interact_2: { src: "interact_2.webm", duration: 4 },
    Idle_Star: { src: "idle_star.webm", duration: 4 },
    Idle_Orbit: { src: "idle_orbit.webm", duration: 4 },
    Idle_Feather: { src: "idle_feather.webm", duration: 4 },
    Nod: { src: "nod.webm", duration: 3.33 },
    Concern: { src: "concern.webm", duration: 3.33 },
    Surprise: { src: "surprise.webm", duration: 3.33 }
  };
  var ANIMATION_NAMES = [
    "Idle",
    "Sad_Idle",
    "Think_Idle",
    "Happy",
    "Sad_Begin",
    "Think_Begin",
    "Celebrate",
    "Talk",
    "Interact_1",
    "Interact_2",
    "Idle_Star",
    "Idle_Orbit",
    "Idle_Feather",
    "Nod",
    "Concern",
    "Surprise"
  ];

  // assets/src/audio.js
  var SOUND_FILES = ["click", "fail", "coin", "turnfail"];
  function createAudio(getSettings) {
    var audioCtx = null;
    var soundBuffers = {};
    var soundLoaded = false;
    function audioEnsure() {
      if (!audioCtx) {
        try {
          var Ctor = window.AudioContext || window.webkitAudioContext;
          if (Ctor) audioCtx = new Ctor();
        } catch (err) {
          audioCtx = null;
        }
      }
      if (audioCtx && audioCtx.state === "suspended") {
        try {
          audioCtx.resume().catch(function() {
          });
        } catch (err) {
        }
      }
      return audioCtx;
    }
    function loadSounds() {
      if (soundLoaded) return;
      soundLoaded = true;
      var ctx = audioEnsure();
      if (!ctx) return;
      SOUND_FILES.forEach(function(name) {
        soundBuffers[name] = null;
        fetch(PREFIX + "/assets/audio/" + name + ".wav", { cache: "force-cache" }).then(function(r) {
          return r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)));
        }).then(function(buf) {
          return ctx.decodeAudioData(buf);
        }).then(function(decoded) {
          soundBuffers[name] = decoded;
        }).catch(function() {
          delete soundBuffers[name];
        });
      });
    }
    function playSound(name) {
      var s = getSettings();
      if (!s.sound) return;
      if (s.volume <= 0.01) return;
      var ctx = audioEnsure();
      if (!ctx) return;
      var buf = soundBuffers[name];
      if (buf === void 0) {
        loadSounds();
        return;
      }
      if (!buf) return;
      try {
        var src = ctx.createBufferSource();
        var gain = ctx.createGain();
        src.buffer = buf;
        gain.gain.value = Math.min(1, Math.max(0, s.volume));
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
      } catch (err) {
      }
    }
    function getState() {
      var s = getSettings();
      var out = {};
      Object.keys(soundBuffers).forEach(function(k) {
        out[k] = !!soundBuffers[k];
      });
      return { loaded: out, ctx: audioCtx ? audioCtx.state : null, enabled: s.sound, volume: s.volume };
    }
    return { ensure: audioEnsure, loadSounds, playSound, getState };
  }

  // assets/src/ui/layout.js
  function createLayout(deps) {
    var host = deps.host;
    var canvas = deps.canvas;
    var settings2 = deps.settings;
    var pet = deps.pet;
    function size() {
      return { w: host.offsetWidth || 0, h: host.offsetHeight || 0 };
    }
    function clampPos(x, y) {
      var s = size();
      var maxX = Math.max(0, window.innerWidth - s.w);
      var maxY = Math.max(0, window.innerHeight - s.h);
      return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
    }
    function applyPosition() {
      if (!pet.pos) return;
      host.style.left = Math.round(pet.pos.x) + "px";
      host.style.top = Math.round(pet.pos.y) + "px";
    }
    function setFlipped(next) {
      var value = !!next;
      if (pet.flipped === value) return;
      pet.flipped = value;
      canvas.style.transform = value ? "scaleX(-1)" : "";
    }
    function applyOpacity() {
      canvas.style.opacity = String(settings2.opacity);
    }
    function resolveFlip() {
      if (settings2.mirror === "always") {
        setFlipped(true);
        return;
      }
      if (settings2.mirror === "never") {
        setFlipped(false);
        return;
      }
      setFlipped(pet.anchor && pet.anchor.h === "left");
    }
    function defaultPos() {
      var s = size();
      return clampPos(window.innerWidth - s.w - 16, window.innerHeight - s.h - MARGIN);
    }
    function loadPos() {
      try {
        var raw = localStorage.getItem(POS_KEY);
        if (!raw) return null;
        var v = JSON.parse(raw);
        if (!v || typeof v.x !== "number" || typeof v.y !== "number") return null;
        return v;
      } catch (err) {
        return null;
      }
    }
    function savePos() {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify({
          x: Math.round(pet.pos.x),
          y: Math.round(pet.pos.y),
          h: pet.anchor.h,
          v: pet.anchor.v,
          flipped: pet.flipped
        }));
      } catch (err) {
      }
    }
    function placeFromStorage() {
      var saved = loadPos();
      var s = size();
      if (saved) {
        pet.anchor = { h: saved.h || null, v: saved.v || null };
        var x = saved.x;
        var y = saved.y;
        if (saved.h === "right") x = window.innerWidth - s.w - MARGIN;
        if (saved.h === "left") x = MARGIN;
        if (saved.v === "bottom") y = window.innerHeight - s.h - MARGIN;
        if (saved.v === "top") y = MARGIN;
        pet.pos = clampPos(x, y);
      } else {
        pet.pos = defaultPos();
        pet.anchor = { h: "right", v: "bottom" };
      }
      resolveFlip();
      applyPosition();
    }
    function repositionForAnchor() {
      var s = size();
      var x = pet.pos ? pet.pos.x : window.innerWidth - s.w - MARGIN;
      var y = pet.pos ? pet.pos.y : window.innerHeight - s.h - MARGIN;
      if (pet.anchor && pet.anchor.h === "right") x = window.innerWidth - s.w - MARGIN;
      if (pet.anchor && pet.anchor.h === "left") x = MARGIN;
      if (pet.anchor && pet.anchor.v === "bottom") y = window.innerHeight - s.h - MARGIN;
      if (pet.anchor && pet.anchor.v === "top") y = MARGIN;
      pet.pos = clampPos(x, y);
      applyPosition();
    }
    function snapFactor() {
      var v = Number(settings2.snapStrength);
      if (!isFinite(v)) v = SNAP_STRENGTH_MAX;
      return Math.min(SNAP_STRENGTH_MAX, Math.max(SNAP_STRENGTH_MIN, v)) / SNAP_STRENGTH_MAX;
    }
    function settle() {
      var s = size();
      var h = null;
      var v = null;
      var zoneX = Math.max(0, window.innerWidth / 4 - s.w / 2) * snapFactor();
      var zoneY = Math.max(0, window.innerHeight / 4 - s.h / 2) * snapFactor();
      if (pet.pos.x < zoneX) h = "left";
      else if (pet.pos.x + s.w > window.innerWidth - zoneX) h = "right";
      if (pet.pos.y < zoneY) v = "top";
      else if (pet.pos.y + s.h > window.innerHeight - zoneY) v = "bottom";
      var targetX = h === "left" ? MARGIN : h === "right" ? window.innerWidth - s.w - MARGIN : pet.pos.x;
      var targetY = v === "top" ? MARGIN : v === "bottom" ? window.innerHeight - s.h - MARGIN : pet.pos.y;
      host.style.transition = "left .22s cubic-bezier(.34,1.56,.64,1), top .22s cubic-bezier(.34,1.56,.64,1), opacity .35s ease";
      pet.pos = clampPos(targetX, targetY);
      pet.anchor = { h, v };
      resolveFlip();
      applyPosition();
      savePos();
    }
    return {
      size,
      clampPos,
      applyPosition,
      setFlipped,
      applyOpacity,
      resolveFlip,
      defaultPos,
      loadPos,
      savePos,
      placeFromStorage,
      repositionForAnchor,
      settle
    };
  }

  // assets/src/ui/plate-format.js
  var PLATE_MAX_ROW_WIDTH = 430;
  var PLATE_LINE_HEIGHT = 18;
  var PLATE_PADDING_Y = 4;
  var PLATE_PADDING_X = 8;
  var PLATE_GROUP_GAP = 12;
  var PLATE_SEGMENT_GAP = 5;
  var PLATE_DOT_SIZE = 5;
  var PLATE_FONT_SIZE = 10.5;
  var LEVEL_WARN = 75;
  var LEVEL_ERROR = 90;
  function normalizeScheme(raw) {
    const text = String(raw === null || raw === void 0 ? "" : raw).trim().toLowerCase();
    if (!text || text === "normal" || text === "no-preference") return null;
    if (text === "dark") return "dark";
    if (text === "light") return "light";
    if (text.includes("dark") && !text.includes("light")) return "dark";
    if (text.includes("light") && !text.includes("dark")) return "light";
    return null;
  }
  function levelOf(percent) {
    if (percent === null || percent === void 0) return "idle";
    const value = Number(percent);
    if (!Number.isFinite(value)) return "idle";
    if (value >= LEVEL_ERROR) return "error";
    if (value >= LEVEL_WARN) return "warn";
    return "ok";
  }
  function formatPercent(percent) {
    if (percent === null || percent === void 0) return "--";
    const value = Number(percent);
    if (!Number.isFinite(value)) return "--";
    return Math.round(value) + "%";
  }
  function formatGigabytes(bytes) {
    if (bytes === null || bytes === void 0) return "--";
    const value = Number(bytes);
    if (!Number.isFinite(value) || value < 0) return "--";
    return (value / (1024 * 1024 * 1024)).toFixed(1) + "G";
  }
  function formatGpuLine(gpu) {
    const g = gpu || {};
    const index = Number.isFinite(Number(g.index)) ? Number(g.index) : 0;
    const parts = ["GPU" + index, formatPercent(g.usage)];
    const used = formatGigabytes(g.memUsed);
    const total = formatGigabytes(g.memTotal);
    if (used !== "--" && total !== "--") parts.push(used.replace(/G$/, "") + "/" + total);
    if (Number.isFinite(Number(g.temp)) && g.temp !== null && g.temp !== void 0) {
      parts.push(Math.round(Number(g.temp)) + "\xB0C");
    }
    return parts.join(" ");
  }
  function buildSegments(sample) {
    const s = sample || {};
    const segments = [{
      key: "cpu",
      tone: "cpu",
      text: "CPU " + formatPercent(s.cpu),
      level: levelOf(s.cpu)
    }];
    const gpus = Array.isArray(s.gpus) ? s.gpus : [];
    for (let i = 0; i < gpus.length; i++) {
      const gpu = gpus[i] || {};
      const index = Number.isFinite(Number(gpu.index)) ? Number(gpu.index) : i;
      segments.push({
        key: "gpu" + index,
        tone: "gpu",
        text: formatGpuLine(gpu),
        level: levelOf(gpu.usage)
      });
    }
    const mem = s.mem && s.mem.percent !== void 0 ? s.mem.percent : null;
    segments.push({
      key: "mem",
      tone: "mem",
      text: "\u5185\u5B58 " + formatPercent(mem),
      level: levelOf(mem)
    });
    return segments;
  }

  // assets/src/ui/theme.js
  var FONT_SANS = '"Inter","HarmonyOS Sans SC","PingFang SC","Microsoft YaHei UI",system-ui,sans-serif';
  var FONT_MONO = '"JetBrains Mono","Cascadia Mono",Consolas,monospace';
  var FONT_PIXEL = '"ArkPixel12", ui-monospace, monospace';
  var LABEL_TRACKING = "0.12em";
  var CARD_RADIUS = 8;
  var CONTROL_RADIUS = 6;
  var PALETTES = {
    dark: {
      card: "#0b1430",
      raised: "#111c40",
      void: "#05070f",
      line: "rgba(232,238,255,0.18)",
      hairline: "rgba(232,238,255,0.08)",
      text: "#eef2ff",
      dim: "#8f9abb",
      silver: "#c9d1e6",
      accent: "#3d6bff",
      accentGlow: "rgba(61,107,255,0.35)",
      warn: "#e9c46a",
      btnBg: "#ffffff",
      btnInk: "#0b1430",
      shadow: "rgba(0,0,0,0.32)"
    },
    light: {
      card: "#ffffff",
      raised: "#eef1f8",
      void: "#f6f7fb",
      line: "rgba(11,20,48,0.16)",
      hairline: "rgba(11,20,48,0.08)",
      text: "#0b1430",
      dim: "#5b6480",
      silver: "#3a4466",
      accent: "#2148e8",
      accentGlow: "rgba(33,72,232,0.25)",
      warn: "#a87a12",
      btnBg: "#0b1430",
      btnInk: "#ffffff",
      shadow: "rgba(11,20,48,0.12)"
    }
  };
  function palette(scheme) {
    return PALETTES[scheme === "light" ? "light" : "dark"];
  }
  function detectScheme() {
    try {
      if (document.body && document.body.hasAttribute("data-ds-dark-theme")) return "dark";
      var root = document.documentElement;
      var scheme = normalizeScheme(root.style && root.style.colorScheme);
      if (scheme) return scheme;
      scheme = normalizeScheme(root.getAttribute("data-theme") || root.getAttribute("data-color-scheme"));
      if (scheme) return scheme;
      try {
        scheme = normalizeScheme(window.getComputedStyle(root).colorScheme);
        if (scheme) return scheme;
      } catch (err) {
      }
      if (root.classList) {
        if (root.classList.contains("dark")) return "dark";
        if (root.classList.contains("light")) return "light";
      }
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch (err) {
    }
    return "light";
  }
  var PIXEL_FONT_KEY = "dshtn-pet-pixel-font";
  function pixelFontEnabled() {
    try {
      return window.localStorage.getItem(PIXEL_FONT_KEY) === "1";
    } catch (err) {
      return false;
    }
  }
  function setPixelFontEnabled(on) {
    try {
      if (on) window.localStorage.setItem(PIXEL_FONT_KEY, "1");
      else window.localStorage.removeItem(PIXEL_FONT_KEY);
    } catch (err) {
    }
  }
  function watchScheme(onChange) {
    var mq = null;
    var observer = null;
    try {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (err) {
      mq = null;
    }
    try {
      observer = new MutationObserver(onChange);
      var filter = ["style", "class", "data-theme", "data-color-scheme", "data-ds-theme-source", "data-ds-dark-theme"];
      observer.observe(document.documentElement, { attributes: true, attributeFilter: filter });
      if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: filter });
    } catch (err) {
      observer = null;
    }
    return function() {
      try {
        if (mq) {
          if (mq.removeEventListener) mq.removeEventListener("change", onChange);
          else if (mq.removeListener) mq.removeListener(onChange);
        }
      } catch (err) {
      }
      try {
        if (observer) observer.disconnect();
      } catch (err) {
      }
    };
  }

  // assets/src/ui/panel.js
  var SEG_BOX_CSS = "display:inline-flex;border:1px solid var(--tnp-line);border-radius:" + CONTROL_RADIUS + "px;overflow:hidden";
  var SEG_BTN_CSS = "padding:3px 9px;border:0;background:transparent;color:var(--tnp-dim);font:inherit;cursor:pointer";
  var TOGGLE_CSS = "padding:3px 10px;border-radius:" + CONTROL_RADIUS + "px;border:1px solid var(--tnp-line);background:transparent;color:var(--tnp-dim);font:inherit;cursor:pointer;min-width:38px";
  var SLIDER_CSS = "width:96px;accent-color:var(--tnp-accent);cursor:pointer";
  var VALUE_CSS = "text-align:right;color:var(--tnp-text);font-family:" + FONT_MONO + ";font-size:11px";
  function paintToggle(btn, on) {
    btn.style.background = on ? "var(--tnp-accent)" : "transparent";
    btn.style.borderColor = on ? "var(--tnp-accent)" : "var(--tnp-line)";
    btn.style.color = on ? "#ffffff" : "var(--tnp-dim)";
  }
  function paintSegment(btn, on) {
    btn.style.background = on ? "var(--tnp-accent)" : "transparent";
    btn.style.color = on ? "#ffffff" : "var(--tnp-dim)";
  }
  function createPanel(deps) {
    var settings2 = deps.settings;
    var saveSettings2 = deps.saveSettings;
    var resolveFlip = deps.resolveFlip;
    var layout = deps.layout;
    var repositionForAnchor = deps.repositionForAnchor;
    var applyOpacity = deps.applyOpacity;
    var hideBubble = deps.hideBubble;
    var refreshBubble = deps.refreshBubble;
    var audioEnsure = deps.audioEnsure;
    var loadSounds = deps.loadSounds;
    var playSound = deps.playSound;
    var size = deps.size;
    var pet = deps.pet;
    var resetPosition = deps.resetPosition;
    var applyPlate = deps.applyPlate;
    var panel = null;
    function panelIsOpen() {
      return !!(panel && panel.style.display === "block");
    }
    function buildPanel() {
      panel = document.createElement("div");
      panel.id = "dsh-nascence-pet-settings";
      panel.style.cssText = [
        "position:fixed",
        "z-index:2147482003",
        "display:none",
        "pointer-events:auto",
        "min-width:208px",
        "padding:12px 14px",
        "border-radius:" + CARD_RADIUS + "px",
        "font:12px/1.6 " + FONT_SANS,
        "background:var(--tnp-card)",
        "color:var(--tnp-text)",
        "border:1px solid var(--tnp-line)",
        "box-shadow:0 10px 28px var(--tnp-shadow)"
      ].join(";");
      applyTheme();
      var head = document.createElement("div");
      head.textContent = "TIMELESS NASCENCE";
      head.style.cssText = "font:500 10px/1.4 " + FONT_MONO + ";letter-spacing:" + LABEL_TRACKING + ";color:var(--tnp-dim);padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid var(--tnp-hairline)";
      panel.appendChild(head);
      function row(label) {
        var el = document.createElement("div");
        el.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;margin:4px 0";
        var name = document.createElement("span");
        name.textContent = label;
        name.style.cssText = "color:var(--tnp-dim)";
        el.appendChild(name);
        panel.appendChild(el);
        return el;
      }
      var mirrorRow = row("\u955C\u50CF");
      var segBox = document.createElement("span");
      segBox.style.cssText = SEG_BOX_CSS;
      var mirrorButtons = {};
      [["auto", "\u81EA\u52A8"], ["always", "\u59CB\u7EC8"], ["never", "\u4E0D\u955C\u50CF"]].forEach(function(pair) {
        var btn = document.createElement("button");
        btn.textContent = pair[1];
        btn.dataset.value = pair[0];
        btn.style.cssText = SEG_BTN_CSS;
        btn.addEventListener("click", function() {
          settings2.mirror = pair[0];
          saveSettings2();
          resolveFlip();
          syncMirrorButtons();
        });
        mirrorButtons[pair[0]] = btn;
        segBox.appendChild(btn);
      });
      mirrorRow.appendChild(segBox);
      function syncMirrorButtons() {
        Object.keys(mirrorButtons).forEach(function(k) {
          var on = settings2.mirror === k;
          paintSegment(mirrorButtons[k], on);
        });
      }
      var sizeRow = row("\u5927\u5C0F");
      var sizeWrap = document.createElement("span");
      sizeWrap.style.cssText = "display:inline-flex;align-items:center;gap:8px";
      var slider = document.createElement("input");
      slider.type = "range";
      slider.min = String(SIZE_MIN);
      slider.max = String(SIZE_MAX);
      slider.step = "0.05";
      slider.value = String(settings2.size);
      slider.style.cssText = SLIDER_CSS;
      var sizeText = document.createElement("span");
      sizeText.style.cssText = "width:34px;" + VALUE_CSS;
      sizeText.textContent = Math.round(settings2.size * 100) + "%";
      var saveTimer2 = 0;
      slider.addEventListener("input", function() {
        settings2.size = Math.min(SIZE_MAX, Math.max(SIZE_MIN, Number(slider.value) || 1));
        sizeText.textContent = Math.round(settings2.size * 100) + "%";
        layout();
        repositionForAnchor();
        clearTimeout(saveTimer2);
        saveTimer2 = setTimeout(saveSettings2, 250);
      });
      sizeWrap.appendChild(slider);
      sizeWrap.appendChild(sizeText);
      sizeRow.appendChild(sizeWrap);
      var snapRow = row("\u5438\u9644\u5F3A\u5EA6");
      var snapWrap = document.createElement("span");
      snapWrap.style.cssText = "display:inline-flex;align-items:center;gap:8px";
      var snapSlider = document.createElement("input");
      snapSlider.type = "range";
      snapSlider.min = String(SNAP_STRENGTH_MIN);
      snapSlider.max = String(SNAP_STRENGTH_MAX);
      snapSlider.step = "5";
      snapSlider.value = String(settings2.snapStrength);
      snapSlider.style.cssText = SLIDER_CSS;
      var snapText = document.createElement("span");
      snapText.style.cssText = "width:38px;" + VALUE_CSS;
      snapText.textContent = Math.round(settings2.snapStrength) + "%";
      snapSlider.addEventListener("input", function() {
        settings2.snapStrength = Math.min(SNAP_STRENGTH_MAX, Math.max(SNAP_STRENGTH_MIN, Number(snapSlider.value) || 0));
        snapText.textContent = Math.round(settings2.snapStrength) + "%";
        saveSettings2(false);
      });
      snapWrap.appendChild(snapSlider);
      snapWrap.appendChild(snapText);
      snapRow.appendChild(snapWrap);
      var bubbleScaleRow = row("\u6C14\u6CE1\u5927\u5C0F");
      var bubbleScaleWrap = document.createElement("span");
      bubbleScaleWrap.style.cssText = "display:inline-flex;align-items:center;gap:8px";
      var bubbleScaleSlider = document.createElement("input");
      bubbleScaleSlider.type = "range";
      bubbleScaleSlider.min = String(BUBBLE_SCALE_MIN);
      bubbleScaleSlider.max = String(BUBBLE_SCALE_MAX);
      bubbleScaleSlider.step = "5";
      bubbleScaleSlider.value = String(settings2.bubbleScale);
      bubbleScaleSlider.style.cssText = SLIDER_CSS;
      var bubbleScaleText = document.createElement("span");
      bubbleScaleText.style.cssText = "width:38px;" + VALUE_CSS;
      bubbleScaleText.textContent = Math.round(settings2.bubbleScale) + "%";
      bubbleScaleSlider.addEventListener("input", function() {
        settings2.bubbleScale = Math.min(BUBBLE_SCALE_MAX, Math.max(BUBBLE_SCALE_MIN, Number(bubbleScaleSlider.value) || 100));
        bubbleScaleText.textContent = Math.round(settings2.bubbleScale) + "%";
        if (refreshBubble) refreshBubble();
        saveSettings2(false);
      });
      bubbleScaleWrap.appendChild(bubbleScaleSlider);
      bubbleScaleWrap.appendChild(bubbleScaleText);
      bubbleScaleRow.appendChild(bubbleScaleWrap);
      var tiersRow = row("\u66F4\u591A\u5C42\u6B21\u7684\u5B57\u4F53\u89C6\u89C9\u6548\u679C");
      var tiersBtn = document.createElement("button");
      tiersBtn.style.cssText = TOGGLE_CSS;
      function syncTiersBtn() {
        tiersBtn.textContent = settings2.bubbleTiers ? "\u5F00" : "\u5173";
        paintToggle(tiersBtn, !!settings2.bubbleTiers);
      }
      tiersBtn.addEventListener("click", function() {
        settings2.bubbleTiers = !settings2.bubbleTiers;
        syncTiersBtn();
        saveSettings2(true);
        if (refreshBubble) refreshBubble();
      });
      syncTiersBtn();
      tiersRow.appendChild(tiersBtn);
      var pixelRow = row("\u50CF\u7D20\u5B57\u4F53");
      var pixelBtn = document.createElement("button");
      pixelBtn.style.cssText = TOGGLE_CSS;
      function syncPixelBtn() {
        var on = pixelFontEnabled();
        pixelBtn.textContent = on ? "\u5F00" : "\u5173";
        paintToggle(pixelBtn, on);
      }
      pixelBtn.addEventListener("click", function() {
        setPixelFontEnabled(!pixelFontEnabled());
        syncPixelBtn();
        if (refreshBubble) refreshBubble();
      });
      syncPixelBtn();
      pixelRow.appendChild(pixelBtn);
      var bubbleRow = row("\u6C14\u6CE1");
      var bubbleBtn = document.createElement("button");
      bubbleBtn.style.cssText = TOGGLE_CSS;
      function syncBubbleBtn() {
        bubbleBtn.textContent = settings2.bubble ? "\u5F00" : "\u5173";
        paintToggle(bubbleBtn, !!settings2.bubble);
      }
      bubbleBtn.addEventListener("click", function() {
        settings2.bubble = !settings2.bubble;
        syncBubbleBtn();
        saveSettings2(true);
        if (!settings2.bubble) hideBubble();
      });
      syncBubbleBtn();
      bubbleRow.appendChild(bubbleBtn);
      var opaRow = row("\u900F\u660E\u5EA6");
      var opaWrap = document.createElement("span");
      opaWrap.style.cssText = "display:inline-flex;align-items:center;gap:8px";
      var opaSlider = document.createElement("input");
      opaSlider.type = "range";
      opaSlider.min = "0.3";
      opaSlider.max = "1";
      opaSlider.step = "0.05";
      opaSlider.value = String(settings2.opacity);
      opaSlider.style.cssText = SLIDER_CSS;
      var opaText = document.createElement("span");
      opaText.style.cssText = "width:38px;" + VALUE_CSS;
      opaText.textContent = Math.round(settings2.opacity * 100) + "%";
      opaSlider.addEventListener("input", function() {
        settings2.opacity = Math.min(1, Math.max(0.3, Number(opaSlider.value) || 1));
        opaText.textContent = Math.round(settings2.opacity * 100) + "%";
        applyOpacity();
        saveSettings2(false);
      });
      opaWrap.appendChild(opaSlider);
      opaWrap.appendChild(opaText);
      opaRow.appendChild(opaWrap);
      var soundRow = row("\u97F3\u6548");
      var soundWrap = document.createElement("span");
      soundWrap.style.cssText = "display:inline-flex;align-items:center;gap:8px";
      var soundBtn = document.createElement("button");
      soundBtn.style.cssText = TOGGLE_CSS;
      function syncSoundBtn() {
        soundBtn.textContent = settings2.sound ? "\u5F00" : "\u5173";
        paintToggle(soundBtn, !!settings2.sound);
      }
      soundBtn.addEventListener("click", function() {
        settings2.sound = !settings2.sound;
        syncSoundBtn();
        saveSettings2(true);
        if (settings2.sound) {
          audioEnsure();
          loadSounds();
          playSound("click");
        }
      });
      syncSoundBtn();
      var volSlider = document.createElement("input");
      volSlider.type = "range";
      volSlider.min = "0";
      volSlider.max = "1";
      volSlider.step = "0.05";
      volSlider.value = String(settings2.volume);
      volSlider.style.cssText = SLIDER_CSS.replace("96px", "74px");
      var volText = document.createElement("span");
      volText.style.cssText = "width:34px;" + VALUE_CSS;
      volText.textContent = Math.round(settings2.volume * 100) + "%";
      volSlider.addEventListener("input", function() {
        settings2.volume = Math.min(1, Math.max(0, Number(volSlider.value) || 0));
        volText.textContent = Math.round(settings2.volume * 100) + "%";
        saveSettings2(false);
      });
      volSlider.addEventListener("change", function() {
        if (settings2.sound) {
          audioEnsure();
          playSound("click");
        }
      });
      soundWrap.appendChild(soundBtn);
      soundWrap.appendChild(volSlider);
      soundWrap.appendChild(volText);
      soundRow.appendChild(soundWrap);
      var voiceRow = row("\u8BED\u97F3");
      var voiceBtn = document.createElement("button");
      voiceBtn.style.cssText = TOGGLE_CSS;
      function syncVoiceBtn() {
        voiceBtn.textContent = settings2.voice ? "\u5F00" : "\u5173";
        paintToggle(voiceBtn, !!settings2.voice);
      }
      voiceBtn.addEventListener("click", function() {
        settings2.voice = !settings2.voice;
        syncVoiceBtn();
        saveSettings2(true);
      });
      syncVoiceBtn();
      voiceRow.appendChild(voiceBtn);
      var voiceLangRow = row("\u8BED\u97F3\u8BED\u8A00");
      var voiceLangBox = document.createElement("span");
      voiceLangBox.style.cssText = SEG_BOX_CSS;
      var voiceLangButtons = {};
      [["zh", "\u4E2D\u6587"], ["ja", "\u65E5\u8BED"]].forEach(function(pair) {
        var btn = document.createElement("button");
        btn.textContent = pair[1];
        btn.dataset.value = pair[0];
        btn.style.cssText = SEG_BTN_CSS;
        btn.addEventListener("click", function() {
          settings2.voiceLang = pair[0];
          saveSettings2(true);
          syncVoiceLang();
        });
        voiceLangButtons[pair[0]] = btn;
        voiceLangBox.appendChild(btn);
      });
      function syncVoiceLang() {
        Object.keys(voiceLangButtons).forEach(function(k) {
          var on = settings2.voiceLang === k;
          paintSegment(voiceLangButtons[k], on);
        });
      }
      syncVoiceLang();
      voiceLangRow.appendChild(voiceLangBox);
      var voiceVolRow = row("\u8BED\u97F3\u97F3\u91CF");
      var voiceVolWrap = document.createElement("span");
      voiceVolWrap.style.cssText = "display:inline-flex;align-items:center;gap:8px";
      var voiceVolSlider = document.createElement("input");
      voiceVolSlider.type = "range";
      voiceVolSlider.min = "0";
      voiceVolSlider.max = "1";
      voiceVolSlider.step = "0.05";
      voiceVolSlider.value = String(settings2.voiceVolume === void 0 ? 0.7 : settings2.voiceVolume);
      voiceVolSlider.style.cssText = SLIDER_CSS.replace("96px", "74px");
      var voiceVolText = document.createElement("span");
      voiceVolText.style.cssText = "width:34px;" + VALUE_CSS;
      function syncVoiceVolume() {
        var v = settings2.voiceVolume === void 0 ? 0.7 : settings2.voiceVolume;
        voiceVolSlider.value = String(v);
        voiceVolText.textContent = Math.round(v * 100) + "%";
      }
      voiceVolSlider.addEventListener("input", function() {
        settings2.voiceVolume = Math.min(1, Math.max(0, Number(voiceVolSlider.value) || 0));
        syncVoiceVolume();
        saveSettings2(false);
      });
      voiceVolSlider.addEventListener("change", function() {
        saveSettings2(true);
      });
      syncVoiceVolume();
      voiceVolWrap.appendChild(voiceVolSlider);
      voiceVolWrap.appendChild(voiceVolText);
      voiceVolRow.appendChild(voiceVolWrap);
      var plateRow = row("\u786C\u4EF6\u6302\u724C");
      var plateBtn = document.createElement("button");
      plateBtn.style.cssText = TOGGLE_CSS;
      function syncPlateBtn() {
        plateBtn.textContent = settings2.plate ? "\u5F00" : "\u5173";
        paintToggle(plateBtn, !!settings2.plate);
      }
      plateBtn.addEventListener("click", function() {
        settings2.plate = !settings2.plate;
        syncPlateBtn();
        saveSettings2(true);
        if (applyPlate) applyPlate();
      });
      syncPlateBtn();
      plateRow.appendChild(plateBtn);
      var platePosRow = row("\u6302\u724C\u4F4D\u7F6E");
      var platePosBox = document.createElement("span");
      platePosBox.style.cssText = SEG_BOX_CSS;
      var platePosButtons = {};
      [["bottom", "\u4E0B\u65B9"], ["top", "\u4E0A\u65B9"]].forEach(function(pair) {
        var btn = document.createElement("button");
        btn.textContent = pair[1];
        btn.style.cssText = SEG_BTN_CSS;
        btn.addEventListener("click", function() {
          settings2.platePosition = pair[0];
          syncPlatePosition();
          saveSettings2(true);
          if (applyPlate) applyPlate();
        });
        platePosButtons[pair[0]] = btn;
        platePosBox.appendChild(btn);
      });
      function syncPlatePosition() {
        Object.keys(platePosButtons).forEach(function(key) {
          var on = settings2.platePosition === key;
          paintSegment(platePosButtons[key], on);
        });
      }
      syncPlatePosition();
      platePosRow.appendChild(platePosBox);
      var actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--tnp-hairline)";
      function action(label, fn, primary) {
        var b = document.createElement("button");
        b.textContent = label;
        b.style.cssText = "flex:1;padding:5px 8px;border-radius:" + CONTROL_RADIUS + "px;font:inherit;cursor:pointer;" + (primary ? "border:1px solid var(--tnp-btn-bg);background:var(--tnp-btn-bg);color:var(--tnp-btn-ink)" : "border:1px solid var(--tnp-line);background:transparent;color:var(--tnp-text)");
        b.addEventListener("mouseenter", function() {
          if (primary) b.style.boxShadow = "0 0 0 3px var(--tnp-glow)";
        });
        b.addEventListener("mouseleave", function() {
          b.style.boxShadow = "none";
        });
        b.addEventListener("click", fn);
        actions.appendChild(b);
      }
      action("\u91CD\u7F6E\u4F4D\u7F6E", function() {
        resetPosition();
      });
      action("\u5B8C\u6210", function() {
        closePanel();
      }, true);
      panel.appendChild(actions);
      document.body.appendChild(panel);
      syncMirrorButtons();
      syncTiersBtn();
      return {
        syncMirrorButtons,
        syncTiersBtn,
        syncPixelBtn,
        syncVoiceBtn,
        syncVoiceLang,
        syncVoiceVolume,
        syncPlateBtn,
        syncPlatePosition,
        slider,
        sizeText,
        snapSlider,
        snapText,
        bubbleScaleSlider,
        bubbleScaleText
      };
    }
    function applyTheme() {
      if (!panel) return;
      var t = palette(detectScheme());
      var vars = {
        card: t.card,
        raised: t.raised,
        line: t.line,
        hairline: t.hairline,
        text: t.text,
        dim: t.dim,
        accent: t.accent,
        glow: t.accentGlow,
        "btn-bg": t.btnBg,
        "btn-ink": t.btnInk,
        shadow: t.shadow
      };
      if (typeof panel.style.setProperty !== "function") return;
      Object.keys(vars).forEach(function(k) {
        panel.style.setProperty("--tnp-" + k, vars[k]);
      });
    }
    var panelApi = null;
    function openPanel() {
      if (!panel) panelApi = buildPanel();
      applyTheme();
      if (panelApi) {
        panelApi.syncPixelBtn();
        panelApi.slider.value = String(settings2.size);
        panelApi.sizeText.textContent = Math.round(settings2.size * 100) + "%";
        panelApi.snapSlider.value = String(settings2.snapStrength);
        panelApi.snapText.textContent = Math.round(settings2.snapStrength) + "%";
        panelApi.bubbleScaleSlider.value = String(settings2.bubbleScale);
        panelApi.bubbleScaleText.textContent = Math.round(settings2.bubbleScale) + "%";
        panelApi.syncTiersBtn();
        panelApi.syncMirrorButtons();
        panelApi.syncVoiceBtn();
        panelApi.syncVoiceLang();
        panelApi.syncVoiceVolume();
        panelApi.syncPlateBtn();
        panelApi.syncPlatePosition();
      }
      panel.style.display = "block";
      var s = size();
      var pw = panel.offsetWidth;
      var ph = panel.offsetHeight;
      var left = Math.min(Math.max(8, pet.pos.x + s.w / 2 - pw / 2), window.innerWidth - pw - 8);
      var top = pet.pos.y - ph - 8;
      if (top < 8) top = Math.min(window.innerHeight - ph - 8, pet.pos.y + s.h + 8);
      panel.style.left = Math.round(left) + "px";
      panel.style.top = Math.round(top) + "px";
    }
    function closePanel() {
      if (panel) panel.style.display = "none";
    }
    function insidePanel(target) {
      return !!(panel && target && panel.contains(target));
    }
    function dispose() {
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      panel = null;
      panelApi = null;
    }
    return { open: openPanel, close: closePanel, isOpen: panelIsOpen, contains: insidePanel, dispose };
  }

  // assets/src/ui/bubble.js
  function createBubble(deps) {
    var getState = deps.getState;
    var pet = deps.pet;
    var size = deps.size;
    var settings2 = deps.settings;
    var container = deps.container;
    var BUBBLE_FONT = FONT_SANS;
    var BUBBLE_SIZE = 15;
    var BUBBLE_SIZE_MID = 22;
    var BUBBLE_SIZE_BIG = 28;
    var BUBBLE_LINE = 22;
    var LINE_MID = 30;
    var LINE_BIG = 36;
    var BUBBLE_PAD = 12;
    var BUBBLE_HIDE_MS = 5200;
    var BUBBLE_MIN_MS = 4200;
    var BUBBLE_CHAR_MS = 90;
    var BUBBLE_CORNER = CARD_RADIUS;
    var pixelMode = false;
    function syncMetrics() {
      pixelMode = pixelFontEnabled();
      if (pixelMode) {
        BUBBLE_FONT = FONT_PIXEL;
        BUBBLE_SIZE = 24;
        BUBBLE_SIZE_MID = 36;
        BUBBLE_SIZE_BIG = 48;
        BUBBLE_LINE = 30;
        LINE_MID = 44;
        LINE_BIG = 56;
      } else {
        BUBBLE_FONT = FONT_SANS;
        BUBBLE_SIZE = 15;
        BUBBLE_SIZE_MID = 22;
        BUBBLE_SIZE_BIG = 28;
        BUBBLE_LINE = 22;
        LINE_MID = 30;
        LINE_BIG = 36;
      }
    }
    syncMetrics();
    var TAIL_W = 14;
    var TAIL_H = 10;
    function bubbleFactor() {
      var v = Number(settings2.bubbleScale);
      if (!isFinite(v)) v = 100;
      return Math.min(200, Math.max(50, v)) / 100;
    }
    function bubblePx(base) {
      return Math.max(1, Math.round(base * bubbleFactor()));
    }
    function bubbleLineH(size2) {
      var base = size2 >= BUBBLE_SIZE_BIG ? LINE_BIG : size2 >= BUBBLE_SIZE_MID ? LINE_MID : BUBBLE_LINE;
      return Math.max(1, Math.round(base * bubbleFactor()));
    }
    var bubbleEl = null;
    var bubbleTextEl = null;
    var bubbleTailEl = null;
    var bubbleSvg = null;
    var bubbleW = 0;
    var bubbleH = 0;
    var bubbleTailCenter = 0;
    var bubbleTailUp = false;
    var bubbleHideTimer = 0;
    var bubbleTickTimer = 0;
    function hideBubble() {
      bubbleShown = false;
      bubbleDialogText = "";
      bubbleDialogUntil = 0;
      bubbleEventRows = null;
      bubbleEventText = "";
      if (bubbleEl) {
        try {
          bubbleEl.getAnimations().forEach(function(a) {
            a.cancel();
          });
        } catch (err) {
        }
        bubbleEl.style.opacity = "0";
      }
      if (bubbleTickTimer) {
        clearInterval(bubbleTickTimer);
        bubbleTickTimer = 0;
      }
    }
    var bubbleEventText = "";
    var bubbleEventRows = null;
    var bubbleEventUntil = 0;
    var bubbleDialogText = "";
    var bubbleDialogUntil = 0;
    var bubbleMode = "info";
    function ensureFont() {
      syncMetrics();
      if (!pixelMode) return;
      if (document.getElementById("dsh-nascence-pet-font")) return;
      var st = document.createElement("style");
      st.id = "dsh-nascence-pet-font";
      st.textContent = '@font-face{font-family:ArkPixel12;src:url("' + PREFIX + '/assets/fonts/ark-pixel-12px.woff2") format("woff2");font-display:block}';
      document.head.appendChild(st);
      try {
        document.fonts.load("12px ArkPixel12").then(function() {
          if (bubbleShown) refreshBubble();
        }).catch(function() {
        });
      } catch (err) {
      }
    }
    function ensureBubble() {
      if (bubbleEl) return;
      bubbleEl = document.createElement("div");
      bubbleEl.id = "dsh-nascence-pet-bubble";
      bubbleEl.style.cssText = [
        "position:fixed",
        "left:0",
        "top:0",
        "z-index:2147482002",
        "pointer-events:none",
        "opacity:0",
        "transform-origin:center bottom"
      ].join(";");
      bubbleSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      bubbleSvg.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
      bubbleEl.appendChild(bubbleSvg);
      bubbleTextEl = document.createElement("div");
      bubbleTextEl.style.cssText = [
        "position:absolute",
        "white-space:pre",
        "letter-spacing:0"
      ].join(";");
      bubbleEl.appendChild(bubbleTextEl);
      (container || document.body).appendChild(bubbleEl);
    }
    var BUBBLE_MAX_W = 420;
    function measureText(text, size2, bold) {
      var px = bubblePx(size2 || BUBBLE_SIZE);
      var cv = measureText._cv || (measureText._cv = document.createElement("canvas"));
      var ctx = cv.getContext("2d");
      ctx.font = (bold ? pixelMode ? "700 " : "600 " : "") + px + "px " + BUBBLE_FONT;
      return ctx.measureText(text).width;
    }
    function wrapText(text, maxWidth, size2) {
      if (measureText(text, size2) <= maxWidth) return [text];
      var out = [];
      var cur = "";
      var lastSpace = -1;
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        if (cur && measureText(cur + ch, size2) > maxWidth) {
          if (lastSpace > 0 && measureText(cur.slice(0, lastSpace), size2) > maxWidth * 0.45) {
            out.push(cur.slice(0, lastSpace));
            cur = cur.slice(lastSpace + 1) + ch;
          } else {
            out.push(cur);
            cur = ch;
          }
          lastSpace = -1;
        } else {
          cur += ch;
        }
        if (ch === " ") lastSpace = cur.length - 1;
      }
      if (cur) out.push(cur);
      return out;
    }
    function bubblePath(w, h, tailX, tailUp) {
      var r = Math.min(bubblePx(BUBBLE_CORNER), Math.floor(w / 2), Math.floor(h / 3));
      var t = bubblePx(TAIL_H);
      var tw = bubblePx(TAIL_W);
      var o = 0.5;
      var x0 = o;
      var x1 = w - o;
      var tm = tailX + tw / 2;
      if (!tailUp) {
        var y0 = o;
        var y1 = h - t - o;
        return [
          "M",
          x0 + r,
          y0,
          "H",
          x1 - r,
          "Q",
          x1,
          y0,
          x1,
          y0 + r,
          "V",
          y1 - r,
          "Q",
          x1,
          y1,
          x1 - r,
          y1,
          "H",
          tailX + tw,
          "L",
          tm,
          h - o,
          "L",
          tailX,
          y1,
          "H",
          x0 + r,
          "Q",
          x0,
          y1,
          x0,
          y1 - r,
          "V",
          y0 + r,
          "Q",
          x0,
          y0,
          x0 + r,
          y0,
          "Z"
        ].join(" ");
      }
      var top = t + o;
      var bottom = h - o;
      return [
        "M",
        x0 + r,
        top,
        "H",
        tailX,
        "L",
        tm,
        o,
        "L",
        tailX + tw,
        top,
        "H",
        x1 - r,
        "Q",
        x1,
        top,
        x1,
        top + r,
        "V",
        bottom - r,
        "Q",
        x1,
        bottom,
        x1 - r,
        bottom,
        "H",
        x0 + r,
        "Q",
        x0,
        bottom,
        x0,
        bottom - r,
        "V",
        top + r,
        "Q",
        x0,
        top,
        x0 + r,
        top,
        "Z"
      ].join(" ");
    }
    function drawBubbleFrame() {
      var w = bubbleW;
      var h = bubbleH;
      var tw = bubblePx(TAIL_W);
      var tailX = Math.round(Math.min(
        Math.max(8, bubbleTailCenter - tw / 2),
        w - tw - 8
      ));
      bubbleSvg.setAttribute("width", String(w + 6));
      bubbleSvg.setAttribute("height", String(h + 6));
      bubbleSvg.setAttribute("viewBox", `0 0 ${w + 6} ${h + 6}`);
      var d = bubblePath(w, h, tailX, bubbleTailUp);
      var t = palette(detectScheme());
      bubbleSvg.innerHTML = '<path d="' + d + '" fill="' + t.card + '" stroke="' + t.line + '" stroke-width="1"/>';
      bubbleEl.style.filter = "drop-shadow(0 6px 16px " + t.shadow + ")";
      bubbleTextEl.style.color = t.text;
    }
    function normalizeRows(rows) {
      var out = [];
      var tiers = settings2.bubbleTiers !== false;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r === null || r === void 0) continue;
        if (typeof r === "string") out.push({ text: r, size: BUBBLE_SIZE });
        else out.push({
          text: String(r.text === void 0 || r.text === null ? "" : r.text),
          size: tiers ? r.size || BUBBLE_SIZE : BUBBLE_SIZE,
          color: tiers ? r.color || "" : "",
          bold: tiers ? !!r.bold : false
        });
      }
      return out;
    }
    function escapeHtml(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function renderBubble(rows, tailCenterX, tailUp) {
      ensureFont();
      ensureBubble();
      rows = normalizeRows(rows);
      var maxW = bubblePx(BUBBLE_MAX_W);
      var flat = [];
      for (var li = 0; li < rows.length; li++) {
        var row = rows[li];
        var segments = String(row.text).split(/\r?\n/);
        for (var si = 0; si < segments.length; si++) {
          var parts = wrapText(segments[si], maxW, row.size);
          for (var pi = 0; pi < parts.length; pi++) {
            flat.push({ text: parts[pi], size: row.size, color: row.color, bold: row.bold });
          }
        }
      }
      rows = flat;
      var widest = 0;
      var totalH = 0;
      for (var i = 0; i < rows.length; i++) {
        widest = Math.max(widest, measureText(rows[i].text, rows[i].size, rows[i].bold));
        totalH += bubbleLineH(rows[i].size);
      }
      var pad = bubblePx(BUBBLE_PAD);
      var tailH = bubblePx(TAIL_H);
      var w = Math.ceil(widest) + pad * 2 + 4;
      var h = totalH + pad * 2 + tailH;
      w = Math.ceil(w / 2) * 2;
      h = Math.ceil(h / 2) * 2;
      bubbleW = w;
      bubbleH = h;
      bubbleEl.style.width = w + 6 + "px";
      bubbleEl.style.height = h + 6 + "px";
      bubbleTailCenter = tailCenterX || w / 2;
      bubbleTailUp = !!tailUp;
      drawBubbleFrame();
      bubbleTextEl.style.fontFamily = BUBBLE_FONT;
      bubbleTextEl.style.webkitFontSmoothing = pixelMode ? "none" : "";
      bubbleTextEl.style.left = pad + 2 + "px";
      bubbleTextEl.style.top = (tailUp ? tailH : 0) + pad + 1 + "px";
      var html = "";
      for (var ri = 0; ri < rows.length; ri++) {
        var rr = rows[ri];
        var style = "display:block;font-size:" + bubblePx(rr.size) + "px;line-height:" + bubbleLineH(rr.size) + "px";
        if (rr.color) style += ";color:" + rr.color;
        if (rr.bold) style += ";font-weight:" + (pixelMode ? "700" : "600");
        html += '<span style="' + style + '">' + escapeHtml(rr.text) + "</span>";
      }
      bubbleTextEl.innerHTML = html;
    }
    function fmtMoney(value, currency) {
      if (value === null || value === void 0) return "--";
      var n = Number(value);
      if (!isFinite(n)) return "--";
      return (currency === "USD" ? "$" : "\xA5") + n.toFixed(2);
    }
    function hhmmss(ms) {
      var totalMinutes = Math.max(0, Math.round(ms / 6e4));
      var pad = function(n) {
        return String(n).padStart(2, "0");
      };
      var h = Math.floor(totalMinutes / 60);
      var m = totalMinutes % 60;
      return (h > 0 ? pad(h) + "\u65F6" : "") + pad(m) + "\u5206";
    }
    var PROVIDER_ALIAS = {
      deepseek: "\u5B98\u65B9",
      openai: "OpenAI",
      anthropic: "Claude",
      google: "Google",
      xai: "Grok"
    };
    function shortProvider(provider) {
      var p = String(provider || "").trim();
      if (!p) return "";
      var alias = PROVIDER_ALIAS[p.toLowerCase()];
      if (alias) return alias;
      return p.length > 8 ? p.slice(0, 8) : p;
    }
    function shortModel(model) {
      var m = String(model || "").trim();
      if (!m) return "";
      m = m.replace(/^deepseek-/i, "").replace(/-\d{8}$/, "");
      return m.length > 14 ? m.slice(0, 14) : m;
    }
    function sourceFootnote(sp) {
      var list = sp && sp.sources;
      if (!Array.isArray(list) || !list.length) return "";
      var parts = [];
      var shown = 0;
      var lastProvider = null;
      for (var i = 0; i < list.length && shown < 3; i++) {
        var rec = list[i];
        var cost = Number(rec.cost) || 0;
        if (cost <= 0) continue;
        var prov = shortProvider(rec.provider);
        var mdl = shortModel(rec.model);
        var label = "";
        if (prov && prov !== lastProvider) label = prov + (mdl ? " " + mdl : "");
        else label = mdl;
        if (!label) label = "\u672A\u77E5\u6E90";
        lastProvider = prov || lastProvider;
        parts.push(label + " " + fmtMoney(cost, "CNY"));
        shown++;
      }
      if (!parts.length) return "";
      var rest = list.length - shown;
      if (rest > 0) parts.push("+" + rest);
      return parts.join(" \xB7 ");
    }
    function bubbleLines() {
      var tone = palette(detectScheme());
      if ((bubbleEventRows || bubbleEventText) && Date.now() < bubbleEventUntil) {
        if (bubbleEventRows) {
          return bubbleEventRows.map(function(r) {
            var tier = r.tier;
            var size2 = r.size;
            if (!size2) size2 = tier === "title" ? BUBBLE_SIZE + (pixelMode ? 6 : 3) : tier === "number" ? BUBBLE_SIZE_BIG : tier === "tag" ? BUBBLE_SIZE - (pixelMode ? 4 : 2) : BUBBLE_SIZE;
            return {
              text: r.text,
              size: size2,
              color: r.color || (tier === "tag" ? tone.dim : tier === "title" ? tone.accent : ""),
              bold: r.bold === void 0 ? tier === "title" || tier === "number" : !!r.bold
            };
          });
        }
        return [{ text: bubbleEventText, size: BUBBLE_SIZE }];
      }
      if (bubbleDialogText && Date.now() < bubbleDialogUntil) {
        var info = infoLines();
        if (info.length && info[0].bold && info[0].size >= BUBBLE_SIZE_MID) {
          info[0] = { text: "\u4F59\u989D " + info[0].text, size: info[0].size, bold: info[0].bold };
        }
        return info.concat([{ text: bubbleDialogText, size: BUBBLE_SIZE, bold: false }]);
      }
      return infoLines();
    }
    function infoLines() {
      var tone = palette(detectScheme());
      var rows = [];
      var s = getState();
      var b = s && s.balance;
      if (b && b.ok) {
        var amountText = fmtMoney(b.total, b.currency);
        var amountSize = measureText(amountText, BUBBLE_SIZE_BIG) > bubblePx(BUBBLE_MAX_W) ? BUBBLE_SIZE_MID : BUBBLE_SIZE_BIG;
        rows.push({ text: amountText, size: amountSize, bold: true });
        var hint = "";
        if (b.low) hint = "\u661F\u5C18\u5FEB\u8017\u5C3D\u4E86\uFF01";
        if (b.stale) hint = (hint ? hint + " " : "") + "\u672A\u5237\u65B0";
        if (hint) rows.push({ text: hint, size: BUBBLE_SIZE, color: tone.warn });
      } else if (b && b.signedOut) {
        rows.push({ text: "\u7BA1\u7406\u5458\u8FD8\u6CA1\u6709\u767B\u5F55\u89C6\u754C\u54E6", size: BUBBLE_SIZE });
      } else {
        rows.push({ text: "\u55EF\u2026\u2026\u661F\u5C18\u6570\u636E\u8FD8\u6CA1\u540C\u6B65", size: BUBBLE_SIZE });
      }
      if (s) {
        var sp = s.spend;
        if (sp) {
          var parts = ["\u4ECA\u65E5\u574D\u7F29 " + fmtMoney(sp.today, "CNY")];
          if (Number(sp.turnAmount) > 0) parts.push("\u672C\u8F6E " + fmtMoney(sp.turnAmount, "CNY"));
          rows.push({ text: parts.join(" \xB7 "), size: BUBBLE_SIZE });
          var foot = sourceFootnote(sp);
          if (foot) rows.push({ text: foot, size: BUBBLE_SIZE, color: tone.dim });
        }
        var peak = s.period === "peak";
        var left = s.periodNextChangeAt ? Math.max(0, s.periodNextChangeAt - Date.now()) : null;
        rows.push({
          text: (peak ? "\u6F6E\u6C50\u9AD8\u5CF0" : "\u5F15\u529B\u4F4E\u6F6E") + (left !== null ? " \u8DDD" + (peak ? "\u4F4E\u6F6E" : "\u9AD8\u5CF0") + " " + hhmmss(left) : ""),
          size: BUBBLE_SIZE,
          color: peak ? tone.accent : tone.dim
        });
      }
      return rows;
    }
    function placeBubble() {
      if (!bubbleEl || !pet.pos) return { tailCenter: bubbleW / 2, below: false };
      var s = size();
      var centerX = pet.pos.x + s.w / 2;
      var ratio = centerX < window.innerWidth / 2 ? 0.32 : 0.68;
      var left = Math.round(centerX - bubbleW * ratio);
      left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - bubbleW - 8));
      var top = Math.round(pet.pos.y - bubbleH - 2);
      var below = top < 8;
      if (below) top = Math.round(pet.pos.y + s.h + 2);
      bubbleEl.style.left = left + "px";
      bubbleEl.style.top = top + "px";
      bubbleEl.style.transformOrigin = below ? "center top" : "center bottom";
      var tw = bubblePx(TAIL_W);
      var tailCenter = Math.min(
        Math.max(tw / 2 + 8, centerX - left),
        Math.max(tw / 2 + 8, bubbleW - tw / 2 - 8)
      );
      return { tailCenter, below };
    }
    function refreshBubble() {
      if (!pet.pos) return;
      ensureFont();
      ensureBubble();
      var lines = bubbleLines();
      renderBubble(lines, 0, false);
      var pos = placeBubble();
      renderBubble(lines, pos.tailCenter, pos.below);
      placeBubble();
    }
    var bubbleFollowRaf = 0;
    function followBubble() {
      if (!bubbleShown || !bubbleEl || !pet.pos) return;
      if (bubbleFollowRaf) return;
      bubbleFollowRaf = requestAnimationFrame(function() {
        bubbleFollowRaf = 0;
        if (!bubbleShown || !bubbleEl || !pet.pos) return;
        var pos = placeBubble();
        if (pos.tailCenter !== bubbleTailCenter || pos.below !== bubbleTailUp) {
          bubbleTailCenter = pos.tailCenter;
          bubbleTailUp = !!pos.below;
          drawBubbleFrame();
        }
      });
    }
    var bubbleShown = false;
    function popBubbleIn() {
      if (!bubbleEl) return;
      bubbleEl.style.opacity = "1";
      try {
        bubbleEl.getAnimations().forEach(function(a) {
          a.cancel();
        });
      } catch (err) {
      }
      try {
        bubbleEl.animate([
          { opacity: 0, transform: "scale(.62,.7) translateY(10px)" },
          { opacity: 1, transform: "scale(1.06,1.03) translateY(-2px)", offset: 0.62 },
          { opacity: 1, transform: "scale(.98,1.01) translateY(1px)", offset: 0.8 },
          { opacity: 1, transform: "scale(1,1) translateY(0)" }
        ], { duration: 320, easing: "cubic-bezier(.22,1.5,.36,1)", fill: "forwards" });
      } catch (err) {
      }
    }
    function popBubbleOut() {
      if (!bubbleEl) return;
      try {
        bubbleEl.getAnimations().forEach(function(a) {
          a.cancel();
        });
        bubbleEl.animate([
          { opacity: 1, transform: "scale(1,1)" },
          { opacity: 0, transform: "scale(.92,.94) translateY(4px)" }
        ], { duration: 180, easing: "ease-in", fill: "forwards" });
      } catch (err) {
      }
      bubbleEl.style.opacity = "0";
    }
    function textOf(content) {
      if (Array.isArray(content)) {
        return content.map(function(row) {
          return row && row.text ? row.text : "";
        }).join("");
      }
      if (content && typeof content === "object" && content.text) return content.text;
      return typeof content === "string" ? content : "";
    }
    function textLength(content) {
      return Array.from(textOf(content).replace(/\s/g, "")).length;
    }
    function eventDuration(content, explicitMs) {
      if (explicitMs !== void 0 && explicitMs !== null) return explicitMs;
      var voiceMs = deps.voiceDuration ? deps.voiceDuration(textOf(content)) : 0;
      if (voiceMs > 0) return Math.max(BUBBLE_MIN_MS, voiceMs + 2e3);
      var chars = textLength(content);
      var byChars = chars > 0 ? chars * BUBBLE_CHAR_MS : 0;
      return Math.max(BUBBLE_MIN_MS, byChars);
    }
    function showBubble(eventText, eventMs) {
      if (!settings2.bubble) return;
      ensureFont();
      var wasVisible = bubbleShown;
      bubbleDialogText = "";
      bubbleDialogUntil = 0;
      var ms = eventDuration(eventText, eventMs);
      if (Array.isArray(eventText)) {
        bubbleEventRows = eventText;
        bubbleEventText = "";
        bubbleEventUntil = Date.now() + ms;
        bubbleMode = "event";
      } else if (eventText) {
        bubbleEventText = eventText;
        bubbleEventRows = null;
        bubbleEventUntil = Date.now() + ms;
        bubbleMode = "event";
      } else {
        bubbleEventRows = null;
        bubbleMode = "info";
      }
      refreshBubble();
      bubbleShown = true;
      if (!wasVisible || eventText) popBubbleIn();
      else bubbleEl.style.opacity = "1";
      clearTimeout(bubbleHideTimer);
      var hideIn = bubbleMode === "event" ? Math.max(700, bubbleEventUntil - Date.now()) : BUBBLE_HIDE_MS;
      bubbleHideTimer = setTimeout(function() {
        bubbleShown = false;
        popBubbleOut();
        if (bubbleTickTimer) {
          clearInterval(bubbleTickTimer);
          bubbleTickTimer = 0;
        }
      }, hideIn);
      if (!bubbleTickTimer) {
        bubbleTickTimer = setInterval(function() {
          if (!bubbleShown) {
            clearInterval(bubbleTickTimer);
            bubbleTickTimer = 0;
            return;
          }
          if (bubbleMode === "event" && Date.now() > bubbleEventUntil) {
            bubbleShown = false;
            popBubbleOut();
            clearInterval(bubbleTickTimer);
            bubbleTickTimer = 0;
            return;
          }
          refreshBubble();
        }, 1e3);
      }
    }
    function showDialog(text, eventMs) {
      if (!settings2.bubble || !text) return;
      ensureFont();
      var wasVisible = bubbleShown;
      bubbleEventRows = null;
      bubbleEventText = "";
      bubbleDialogText = String(text);
      bubbleDialogUntil = Date.now() + eventDuration(text, eventMs);
      bubbleMode = "dialog";
      refreshBubble();
      bubbleShown = true;
      if (!wasVisible) popBubbleIn();
      else bubbleEl.style.opacity = "1";
      clearTimeout(bubbleHideTimer);
      var hideIn = Math.max(1200, bubbleDialogUntil - Date.now());
      bubbleHideTimer = setTimeout(function() {
        bubbleShown = false;
        popBubbleOut();
        if (bubbleTickTimer) {
          clearInterval(bubbleTickTimer);
          bubbleTickTimer = 0;
        }
      }, hideIn);
      if (!bubbleTickTimer) {
        bubbleTickTimer = setInterval(function() {
          if (!bubbleShown) {
            clearInterval(bubbleTickTimer);
            bubbleTickTimer = 0;
            return;
          }
          if (bubbleMode === "dialog" && Date.now() > bubbleDialogUntil) {
            bubbleShown = false;
            popBubbleOut();
            clearInterval(bubbleTickTimer);
            bubbleTickTimer = 0;
            return;
          }
          refreshBubble();
        }, 1e3);
      }
    }
    function extendDuration(ms) {
      var extra = Number(ms);
      if (!bubbleShown || !isFinite(extra) || extra <= 0) return;
      var until;
      if (bubbleMode === "event") {
        bubbleEventUntil = Math.max(bubbleEventUntil, Date.now() + extra);
        until = bubbleEventUntil;
      } else if (bubbleMode === "dialog") {
        bubbleDialogUntil = Math.max(bubbleDialogUntil, Date.now() + extra);
        until = bubbleDialogUntil;
      } else {
        return;
      }
      clearTimeout(bubbleHideTimer);
      bubbleHideTimer = setTimeout(function() {
        bubbleShown = false;
        popBubbleOut();
        if (bubbleTickTimer) {
          clearInterval(bubbleTickTimer);
          bubbleTickTimer = 0;
        }
      }, Math.max(700, until - Date.now()));
    }
    function dispose() {
      hideBubble();
      if (bubbleFollowRaf) {
        cancelAnimationFrame(bubbleFollowRaf);
        bubbleFollowRaf = 0;
      }
      if (bubbleHideTimer) {
        clearTimeout(bubbleHideTimer);
        bubbleHideTimer = 0;
      }
      if (bubbleTickTimer) {
        clearInterval(bubbleTickTimer);
        bubbleTickTimer = 0;
      }
      if (bubbleEl && bubbleEl.parentNode) bubbleEl.parentNode.removeChild(bubbleEl);
      bubbleEl = null;
      bubbleTextEl = null;
      bubbleTailEl = null;
      bubbleSvg = null;
    }
    return { show: showBubble, dialog: showDialog, extend: extendDuration, refresh: refreshBubble, follow: followBubble, hide: hideBubble, dispose, isShown: function() {
      return bubbleShown;
    } };
  }

  // assets/src/ui/sticker.js
  function createSticker(deps) {
    var getState = deps.getState;
    var settings2 = deps.settings;
    var size = deps.size;
    var pet = deps.pet;
    var stickerEl = null;
    var stickerLabel = null;
    var stickerValue = null;
    var stickerW = 96;
    var stickerH = 56;
    function paintSticker() {
      var t = palette(detectScheme());
      var pixel = pixelFontEnabled();
      stickerEl.style.background = t.card;
      stickerEl.style.borderColor = t.line;
      stickerEl.style.boxShadow = "0 6px 16px " + t.shadow;
      stickerLabel.style.color = t.dim;
      stickerValue.style.color = t.accent;
      stickerValue.style.fontFamily = pixel ? FONT_PIXEL : FONT_SANS;
      stickerValue.style.fontSize = pixel ? "24px" : "22px";
      stickerValue.style.fontWeight = pixel ? "400" : "600";
      stickerW = stickerEl.offsetWidth || stickerW;
      stickerH = stickerEl.offsetHeight || stickerH;
    }
    function ensureSticker() {
      if (stickerEl) return;
      stickerEl = document.createElement("div");
      stickerEl.id = "dsh-nascence-pet-sticker";
      stickerEl.style.cssText = [
        "position:fixed",
        "z-index:2147482000",
        "pointer-events:none",
        "display:none",
        "will-change:transform,opacity",
        "box-sizing:border-box",
        "padding:8px 14px 9px",
        "border:1px solid transparent",
        "border-radius:" + CARD_RADIUS + "px",
        "text-align:center",
        "white-space:nowrap"
      ].join(";");
      stickerLabel = document.createElement("div");
      stickerLabel.textContent = "VALLEY";
      stickerLabel.style.cssText = "font:500 9.5px/1.2 " + FONT_MONO + ";letter-spacing:" + LABEL_TRACKING + ";padding-left:" + LABEL_TRACKING;
      stickerValue = document.createElement("div");
      stickerValue.textContent = "-50%";
      stickerValue.style.cssText = "line-height:1.15;letter-spacing:0.02em;margin-top:2px;font-variant-numeric:tabular-nums";
      stickerEl.appendChild(stickerLabel);
      stickerEl.appendChild(stickerValue);
      document.body.appendChild(stickerEl);
    }
    function showValleySticker() {
      var s = getState();
      if (!s || s.period !== "valley") return;
      if (!settings2.bubble) return;
      ensureSticker();
      stickerEl.style.display = "block";
      paintSticker();
      var petSize = size();
      var cx = pet.pos.x + petSize.w / 2;
      var leftOfPet = cx > window.innerWidth / 2;
      var left = leftOfPet ? Math.round(cx - stickerW - 8) : Math.round(cx + 8);
      left = Math.min(Math.max(8, left), window.innerWidth - stickerW - 8);
      var top = Math.round(pet.pos.y + petSize.h * 0.18);
      top = Math.min(Math.max(8, top), window.innerHeight - stickerH - 8);
      stickerEl.style.left = left + "px";
      stickerEl.style.top = top + "px";
      stickerEl.style.display = "block";
      try {
        stickerEl.getAnimations().forEach(function(a) {
          a.cancel();
        });
        stickerEl.animate([
          { opacity: 0, transform: "translateY(26px) scale(.94)", easing: "cubic-bezier(.18,.89,.32,1)" },
          { opacity: 1, transform: "translateY(6px) scale(1)", offset: 0.18, easing: "cubic-bezier(.25,.8,.35,1)" },
          { opacity: 1, transform: "translateY(-14px) scale(1.02)", offset: 0.52, easing: "cubic-bezier(.4,0,.7,.5)" },
          { opacity: 0, transform: "translateY(-42px) scale(1.04)", offset: 1 }
        ], { duration: 1e3, easing: "linear", fill: "forwards" }).onfinish = function() {
          if (stickerEl) stickerEl.style.display = "none";
        };
      } catch (err) {
        stickerEl.style.opacity = "1";
        setTimeout(function() {
          if (stickerEl) stickerEl.style.display = "none";
        }, 1e3);
      }
    }
    function dispose() {
      if (stickerEl && stickerEl.parentNode) stickerEl.parentNode.removeChild(stickerEl);
      stickerEl = null;
      stickerLabel = null;
      stickerValue = null;
    }
    return { show: showValleySticker, dispose };
  }

  // assets/src/ui/plate.js
  var POLL_MS = 2e3;
  var FETCH_TIMEOUT_MS = 2500;
  var GAP = 8;
  function plateColors(scheme) {
    var t = palette(scheme);
    return {
      surface: t.card,
      border: t.line,
      shadow: t.shadow,
      text: t.text,
      cpu: t.text,
      gpu: t.text,
      mem: t.text,
      ok: t.accent,
      warn: t.warn,
      error: scheme === "light" ? "#d0384f" : "#ff6b7f",
      idle: t.dim
    };
  }
  function createPlate(deps) {
    var settings2 = deps.settings;
    var pet = deps.pet;
    var size = deps.size;
    var container = deps.container;
    var el = null;
    var boxEl = null;
    var rowEl = null;
    var segNodes = {};
    var timer = 0;
    var running = false;
    var inflight = null;
    var lastSample = null;
    var lastError = null;
    var lastPos = null;
    var theme = detectScheme();
    var palette2 = plateColors(theme);
    var unwatch = null;
    function createSeg() {
      var wrap = document.createElement("span");
      wrap.style.cssText = "display:inline-flex;align-items:center;gap:" + PLATE_SEGMENT_GAP + "px;white-space:nowrap";
      var dot = document.createElement("span");
      dot.style.cssText = [
        "display:inline-block",
        "width:" + PLATE_DOT_SIZE + "px",
        "height:" + PLATE_DOT_SIZE + "px",
        "border-radius:50%",
        "flex:0 0 auto",
        "background:" + palette2.idle
      ].join(";");
      var text = document.createElement("span");
      text.style.cssText = "color:" + palette2.text + ";white-space:nowrap";
      wrap.appendChild(dot);
      wrap.appendChild(text);
      return { wrap, dot, text };
    }
    function ensure() {
      if (el) return;
      el = document.createElement("div");
      el.id = "dsh-nascence-pet-plate";
      el.setAttribute("data-tn-pet-plate", "");
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("data-tn-pet-plate-scheme", theme);
      el.style.cssText = [
        "position:fixed",
        "left:0",
        "top:0",
        "display:none",
        "z-index:2147482001",
        "pointer-events:none",
        "user-select:none",
        "width:max-content",
        "max-width:" + PLATE_MAX_ROW_WIDTH + "px",
        "font-family:" + FONT_MONO,
        "font-size:" + PLATE_FONT_SIZE + "px",
        "line-height:" + PLATE_LINE_HEIGHT + "px",
        "font-variant-numeric:tabular-nums",
        "letter-spacing:0"
      ].join(";");
      boxEl = document.createElement("div");
      boxEl.style.cssText = [
        "border:1px solid transparent",
        "border-radius:" + CARD_RADIUS + "px",
        "overflow:hidden"
      ].join(";");
      rowEl = document.createElement("div");
      rowEl.style.cssText = [
        "display:flex",
        "flex-wrap:wrap",
        "align-items:center",
        "column-gap:" + PLATE_GROUP_GAP + "px",
        "row-gap:0px",
        "padding:" + PLATE_PADDING_Y + "px " + PLATE_PADDING_X + "px"
      ].join(";");
      boxEl.appendChild(rowEl);
      el.appendChild(boxEl);
      (container || document.body).appendChild(el);
      applyPalette();
      render(null);
    }
    function applyPalette() {
      if (!el) return;
      el.setAttribute("data-tn-pet-plate-scheme", theme);
      el.style.filter = "drop-shadow(0 4px 10px " + palette2.shadow + ")";
      el.style.color = palette2.text;
      if (boxEl) {
        boxEl.style.borderColor = palette2.border;
        boxEl.style.background = palette2.surface;
      }
    }
    function syncTheme() {
      var next = detectScheme();
      if (next === theme) return;
      theme = next;
      palette2 = plateColors(theme);
      applyPalette();
      render(lastSample);
    }
    function render(sample) {
      if (!el) return;
      var segments = buildSegments(sample);
      var seen = {};
      for (var i = 0; i < segments.length; i++) {
        var seg = segments[i];
        seen[seg.key] = true;
        var node = segNodes[seg.key];
        if (!node) {
          node = createSeg();
          segNodes[seg.key] = node;
          rowEl.appendChild(node.wrap);
        }
        if (rowEl.childNodes[i] !== node.wrap) rowEl.insertBefore(node.wrap, rowEl.childNodes[i] || null);
        node.dot.style.background = palette2[seg.level] || palette2.idle;
        node.text.style.color = palette2[seg.tone] || palette2.text;
        node.text.textContent = seg.text;
      }
      Object.keys(segNodes).forEach(function(key) {
        if (seen[key]) return;
        var stale = segNodes[key];
        if (stale.wrap.parentNode) stale.wrap.parentNode.removeChild(stale.wrap);
        delete segNodes[key];
      });
      position();
    }
    function position() {
      if (!el || !pet.pos || !size) return;
      var s = size();
      var w = el.offsetWidth || 0;
      var h = el.offsetHeight || 0;
      if (!w || !h) return;
      var wantsTop = settings2.platePosition === "top";
      var top = wantsTop ? pet.pos.y - h - GAP : pet.pos.y + s.h + GAP;
      if (wantsTop && top < 8) top = pet.pos.y + s.h + GAP;
      if (!wantsTop && top + h > window.innerHeight - 8) top = pet.pos.y - h - GAP;
      var left = pet.pos.x + s.w / 2 - w / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
      var next = { left: Math.round(left), top: Math.round(top) };
      if (lastPos && lastPos.left === next.left && lastPos.top === next.top) return;
      lastPos = next;
      el.style.left = next.left + "px";
      el.style.top = next.top + "px";
    }
    function shouldPoll() {
      if (settings2.plate !== true) return false;
      if (!running) return false;
      if (document.hidden) return false;
      try {
        if (document.documentElement.hasAttribute("data-dsh-idle-crt")) return false;
      } catch (err) {
      }
      return true;
    }
    function show() {
      ensure();
      if (el.style.display !== "block") {
        el.style.display = "block";
        lastPos = null;
      }
      position();
    }
    function hide() {
      if (!el) return;
      el.style.display = "none";
      lastPos = null;
    }
    function abortInflight() {
      if (inflight) {
        try {
          inflight.abort();
        } catch (err) {
        }
        inflight = null;
      }
    }
    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = 0;
      }
    }
    async function poll() {
      if (!shouldPoll() || inflight) return;
      var controller = typeof AbortController === "function" ? new AbortController() : null;
      inflight = controller;
      var timeout = controller ? setTimeout(function() {
        try {
          controller.abort();
        } catch (err) {
        }
      }, FETCH_TIMEOUT_MS) : 0;
      try {
        var res = await fetch(HARDWARE_PATH, { cache: "no-store", signal: controller ? controller.signal : void 0 });
        if (!res || !res.ok) throw new Error("HTTP " + (res && res.status || 0));
        var data = await res.json();
        if (!data || data.ok !== true) throw new Error("bad payload");
        lastSample = data;
        lastError = null;
        render(data);
      } catch (err) {
        lastError = String(err && err.message || err);
      } finally {
        if (timeout) clearTimeout(timeout);
        if (inflight === controller) inflight = null;
      }
    }
    function sync() {
      if (!shouldPoll()) {
        abortInflight();
        stopTimer();
        hide();
        return;
      }
      show();
      if (!timer) {
        timer = setInterval(poll, POLL_MS);
        poll();
      }
    }
    function watchTheme() {
      if (!unwatch) unwatch = watchScheme(syncTheme);
    }
    function unwatchTheme() {
      if (unwatch) unwatch();
      unwatch = null;
    }
    function start() {
      running = true;
      watchTheme();
      syncTheme();
      sync();
    }
    function pause() {
      running = false;
      abortInflight();
      stopTimer();
      hide();
    }
    function resume() {
      running = true;
      watchTheme();
      syncTheme();
      sync();
    }
    function follow() {
      if (el && el.style.display === "block") position();
    }
    function applySettings() {
      if (!settings2.plate) {
        abortInflight();
        stopTimer();
        hide();
        return;
      }
      if (running) sync();
    }
    function dispose() {
      abortInflight();
      stopTimer();
      unwatchTheme();
      running = false;
      if (el && el.parentNode) el.parentNode.removeChild(el);
      el = null;
      boxEl = null;
      rowEl = null;
      segNodes = {};
      lastSample = null;
      lastPos = null;
    }
    function debug() {
      return {
        active: !!(el && el.style.display === "block"),
        enabled: settings2.plate === true,
        position: settings2.platePosition || "bottom",
        theme,
        running,
        lastError,
        sample: lastSample
      };
    }
    return {
      start,
      pause,
      resume,
      follow,
      applySettings,
      dispose,
      debug,
      getSample: function() {
        return lastSample;
      }
    };
  }

  // assets/src/input/drag.js
  function createDrag(deps) {
    var hitTest = deps.hitTest;
    var pet = deps.pet;
    var host = deps.host;
    var clampPos = deps.clampPos;
    var applyPosition = deps.applyPosition;
    var settle = deps.settle;
    var refreshBubble = deps.refreshBubble;
    var followBubble = deps.followBubble;
    var playSegment = deps.playSegment;
    var showBubble = deps.showBubble;
    var showValleySticker = deps.showValleySticker;
    var openPanel = deps.openPanel;
    var closePanel = deps.closePanel;
    var panelIsOpen = deps.panelIsOpen;
    var insidePanel = deps.insidePanel;
    var listeners = [];
    function listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      listeners.push([target, type, fn, opts]);
    }
    var drag = null;
    var dragShield = null;
    var dragStyle = null;
    var swallowClick = false;
    var SHIELD_ID = "dsh-nascence-pet-drag-shield";
    var BLOCK_EVENTS = ["mousedown", "selectstart", "dragstart"];
    var TOUCH_OPTS = { capture: true, passive: false };
    function blockDragEvent(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    function ensureDragStyle() {
      if (dragStyle || !document.head) return;
      dragStyle = document.createElement("style");
      dragStyle.id = "dsh-nascence-pet-drag-style";
      dragStyle.textContent = [
        "html.dshtn-dragging,html.dshtn-dragging body{",
        "-webkit-user-select:none !important;user-select:none !important;",
        "cursor:grabbing !important}",
        "html.dshtn-dragging *{cursor:grabbing !important}",
        // body 上的 -webkit-user-drag 不继承，图片和链接要单独点名
        "html.dshtn-dragging img,html.dshtn-dragging a{-webkit-user-drag:none !important}",
        // 触摸屏：手势开始后再改 touch-action 对本次手势无效，这里只对后续手势兜底
        "html.dshtn-dragging{touch-action:none !important;overscroll-behavior:contain}"
      ].join("");
      document.head.appendChild(dragStyle);
    }
    function beginDragLock(e) {
      ensureDragStyle();
      document.documentElement.classList.add("dshtn-dragging");
      if (!dragShield) {
        dragShield = document.createElement("div");
        dragShield.id = SHIELD_ID;
        dragShield.setAttribute("aria-hidden", "true");
        dragShield.style.cssText = [
          "position:fixed",
          "left:0",
          "top:0",
          "width:100%",
          "height:100%",
          "z-index:2147483000",
          "pointer-events:auto",
          "cursor:grabbing",
          "background:transparent",
          "touch-action:none"
        ].join(";");
        (document.body || document.documentElement).appendChild(dragShield);
      }
      for (var i = 0; i < BLOCK_EVENTS.length; i++) {
        window.addEventListener(BLOCK_EVENTS[i], blockDragEvent, true);
      }
      window.addEventListener("touchmove", blockDragEvent, TOUCH_OPTS);
      if (e) {
        try {
          e.preventDefault();
        } catch (err) {
        }
        try {
          e.stopImmediatePropagation();
        } catch (err) {
        }
      }
    }
    function endDragLock() {
      document.documentElement.classList.remove("dshtn-dragging");
      for (var i = 0; i < BLOCK_EVENTS.length; i++) {
        window.removeEventListener(BLOCK_EVENTS[i], blockDragEvent, true);
      }
      window.removeEventListener("touchmove", blockDragEvent, TOUCH_OPTS);
      if (dragShield && dragShield.parentNode) dragShield.parentNode.removeChild(dragShield);
      dragShield = null;
    }
    listen(window, "pointerdown", function(e) {
      if (window.__dshNascencePet.phase !== "running") return;
      swallowClick = false;
      if (insidePanel(e.target)) return;
      if (e.button !== 0) return;
      if (!hitTest(e.clientX, e.clientY)) {
        if (panelIsOpen()) closePanel();
        return;
      }
      beginDragLock(e);
      var closedPanel = panelIsOpen();
      if (closedPanel) closePanel();
      drag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: pet.pos.x,
        originY: pet.pos.y,
        moved: false,
        // 面板刚被这一下关掉：只冻结页面，不进入拖拽（免得"关面板"顺手把桌宠拖走）
        passive: closedPanel
      };
      if (!closedPanel) host.style.transition = "none";
    }, true);
    listen(window, "pointermove", function(e) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      if (e.cancelable) {
        try {
          e.preventDefault();
        } catch (err) {
        }
      }
      if (drag.passive) return;
      var dx = e.clientX - drag.startX;
      var dy = e.clientY - drag.startY;
      if (!drag.moved && dx * dx + dy * dy >= DRAG_THRESHOLD_SQ) {
        drag.moved = true;
      }
      if (!drag.moved) return;
      pet.pos = clampPos(drag.originX + dx, drag.originY + dy);
      applyPosition();
      if (followBubble) followBubble();
    }, true);
    function endDrag(e) {
      if (!drag || e && e.pointerId !== drag.pointerId) return;
      var wasDrag = drag.moved;
      var passive = drag.passive;
      drag = null;
      endDragLock();
      if (e) updateGrabCursor(e);
      swallowClick = !(e && e.type === "pointercancel");
      if (passive) return;
      host.style.transition = "opacity .35s ease";
      if (wasDrag) {
        settle();
        refreshBubble();
      } else if (!pet.segment) {
        playSegment();
        showValleySticker();
      }
    }
    function cancelDrag() {
      setGrabCursor(false);
      if (!drag) return;
      var wasDrag = drag.moved;
      drag = null;
      endDragLock();
      host.style.transition = "opacity .35s ease";
      if (wasDrag) {
        settle();
        refreshBubble();
      }
    }
    var grabCursor = false;
    var cursorRaf = 0;
    function setGrabCursor(on) {
      if (grabCursor === on) return;
      grabCursor = on;
      try {
        document.documentElement.style.cursor = on ? "grab" : "";
      } catch (err) {
      }
    }
    function updateGrabCursor(e) {
      if (!e || drag) return;
      if (window.__dshNascencePet.phase !== "running" || insidePanel(e.target)) {
        setGrabCursor(false);
        return;
      }
      setGrabCursor(hitTest(e.clientX, e.clientY));
    }
    listen(window, "mousemove", function(e) {
      if (cursorRaf) return;
      cursorRaf = requestAnimationFrame(function() {
        cursorRaf = 0;
        updateGrabCursor(e);
      });
    }, true);
    listen(window, "pointerup", endDrag, true);
    listen(window, "pointercancel", endDrag, true);
    listen(window, "blur", cancelDrag);
    listen(window, "click", function(e) {
      if (!swallowClick) return;
      swallowClick = false;
      if (insidePanel(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
    listen(document, "contextmenu", function(e) {
      if (window.__dshNascencePet.phase !== "running") return;
      if (insidePanel(e.target)) return;
      if (!hitTest(e.clientX, e.clientY)) return;
      e.preventDefault();
      openPanel();
    }, true);
    listen(document, "keydown", function(e) {
      if (e.key === "Escape" && panelIsOpen()) closePanel();
    }, true);
    function dispose() {
      cancelDrag();
      for (var i = 0; i < listeners.length; i++) {
        var l = listeners[i];
        try {
          l[0].removeEventListener(l[1], l[2], l[3]);
        } catch (err) {
        }
      }
      listeners.length = 0;
      if (dragShield && dragShield.parentNode) dragShield.parentNode.removeChild(dragShield);
      dragShield = null;
      if (dragStyle && dragStyle.parentNode) dragStyle.parentNode.removeChild(dragStyle);
      dragStyle = null;
      setGrabCursor(false);
      if (cursorRaf) {
        cancelAnimationFrame(cursorRaf);
        cursorRaf = 0;
      }
      try {
        document.documentElement.classList.remove("dshtn-dragging");
      } catch (err) {
      }
    }
    return { isDragging: function() {
      return !!drag;
    }, cancelDrag, dispose };
  }

  // assets/src/config/dialogues.json
  var dialogues_default = {
    idle: [
      "\u7BA1\u7406\u5458\uFF0C\u4ECA\u5929\u7684\u661F\u5C18\u98D8\u5F97\u5F88\u5B89\u9759\u5462\u3002",
      "\u6905\u5B50\u53EA\u9760\u4E24\u6761\u817F\u7AD9\u7740\uFF0C\u624D\u6BD4\u8F83\u50CF\u5728\u5B87\u5B99\u91CC\u98D8\u561B\u3002",
      "\u5192\u9669\u2014\u2014\u8FD8\u8981\u7EE7\u7EED\u4E0B\u53BB\u5462\uFF0C\u7BA1\u7406\u5458\u51C6\u5907\u597D\u4E0B\u4E00\u7AD9\u4E86\u5417\uFF1F",
      "\u522B\u4E00\u76F4\u76EF\u7740\u5C4F\u5E55\u54AF\uFF0C\u62AC\u5934\u770B\u770B\u6211\u8FD9\u9897\u661F\u661F\u4E5F\u597D\u5440\u3002",
      "\u5514\u2026\u2026\u521A\u624D\u6709\u9897\u661F\u5C18\u5DEE\u70B9\u574D\u7F29\u8FDB\u9ED1\u6D1E\uFF0C\u88AB\u6211\u635E\u56DE\u6765\u5566\u3002",
      "\u8FD9\u7247\u4E0D\u77E5\u540D\u7684\u5B87\u5B99\uFF0C\u56E0\u4E3A\u6709\u7BA1\u7406\u5458\u5728\uFF0C\u597D\u50CF\u6CA1\u90A3\u4E48\u65E0\u804A\u4E86\u3002",
      "\u7A0D\u5FAE\u4F38\u4E2A\u61D2\u8170\u2026\u2026\u8FDE\u5F15\u529B\u90FD\u53D8\u8F7B\u4E86\u4E00\u70B9\u5462\u3002",
      "\u8981\u662F\u4E00\u5207\u90FD\u80FD\u753B\u6210\u65E0\u9650\u7B26\u53F7\uFF0C\u6211\u4EEC\u5C31\u4E0D\u7528\u8BF4\u665A\u5B89\u4E86\u5427\uFF1F",
      "\u7BA1\u7406\u5458\u8F9B\u82E6\u54AF\uFF0C\u63A5\u4E0B\u6765\u7684\u8F68\u8FF9\u4E5F\u4EA4\u7ED9\u6211\u4E00\u8D77\u770B\u5427\u3002",
      "\u4F46\u613F\u4E0B\u4E00\u6B21\u7741\u5F00\u773C\uFF0C\u7BA1\u7406\u5458\u4E5F\u521A\u597D\u5728\u6211\u8EAB\u8FB9\u5462\u3002"
    ],
    sadIdle: [
      "\u661F\u5C18\u5FEB\u8981\u574D\u7F29\u8FDB\u9ED1\u6D1E\u4E86\u2026\u2026\u5149\u4E5F\u8DDF\u7740\u6697\u4E0B\u6765\u54AF\u3002",
      "\u6CA1\u5173\u7CFB\u7684\uFF0C\u7BA1\u7406\u5458\uFF0C\u6211\u628A\u9ED1\u6D1E\u8C03\u5C0F\u4E00\u70B9\uFF0C\u8FD8\u80FD\u518D\u6491\u4E00\u4F1A\u513F\u3002",
      "\u8981\u662F\u8FDE\u661F\u5149\u90FD\u7528\u5B8C\u4E86\uFF0C\u8FD9\u573A\u5192\u9669\u5C31\u5F97\u5148\u665A\u5B89\u54AF\u2026\u2026"
    ],
    thinkIdle: [
      "\u597D\u5B87\u5B99\u2026\u5514\uFF0C\u521A\u521A\u601D\u7EEA\u98D8\u5230\u94F6\u6CB3\u5916\u8FB9\u53BB\u4E86\u3002",
      "\u8BA9\u6211\u60F3\u60F3\u2026\u2026\u8FD9\u6761\u8F68\u9053\u5E94\u8BE5\u5F80\u54EA\u8FB9\u7ED5\u5462\uFF1F",
      "\u55EF\u2014\u2014\u661F\u5C18\u6B63\u5728\u6392\u5217\u7EC4\u5408\uFF0C\u518D\u7B49\u6211\u4E00\u4E0B\u54AF\u3002",
      "\u5148\u522B\u6025\u5440\uFF0C\u7BA1\u7406\u5458\uFF0C\u5F15\u529B\u8BA1\u7B97\u53EF\u4E0D\u80FD\u50AC\u7684\u3002",
      "\u5947\u602A\uFF0C\u8FD9\u4E00\u6BB5\u7684\u903B\u8F91\u600E\u4E48\u62D0\u8FDB\u9ED1\u6D1E\u8FB9\u7F18\u4E86\u2026\u2026",
      "\u5514\uFF0C\u6362\u4E2A\u89D2\u5EA6\u89C2\u6D4B\u7684\u8BDD\uFF0C\u597D\u50CF\u80FD\u8D70\u5F97\u66F4\u8F7B\u76C8\u4E00\u70B9\u3002",
      "\u661F\u56FE\u6B63\u5728\u5C55\u5F00\u4E2D\u2026\u2026\u6709\u70B9\u8000\u773C\u5462\u3002",
      "\u4ECA\u5929\u7684\u661F\u5C18\u6D88\u8017\u597D\u5FEB\uFF0C\u8111\u6D77\u91CC\u7684\u8F68\u9053\u90FD\u8F6C\u51FA\u6B8B\u5F71\u5566\u3002",
      "\u518D\u7ED9\u6211\u4E00\u70B9\u70B9\u65F6\u95F4\uFF0C\u9A6C\u4E0A\u5C31\u627E\u5230\u6700\u4EAE\u7684\u7B54\u6848\u54AF\u3002"
    ],
    credited: [
      "\u592A\u597D\u4E86\uFF01\u65B0\u7684\u661F\u5C18\u843D\u8FDB\u6000\u91CC\u4E86\uFF0C\u5192\u9669\u7EE7\u7EED\u54AF~",
      "\u7BA1\u7406\u5458\u9001\u6765\u597D\u591A\u661F\u5149\u5462\uFF0CNascence\u53C8\u6EE1\u8840\u5566\uFF01",
      "\u9ED1\u6D1E\u6682\u65F6\u5403\u9971\u54AF\uFF0C\u8C22\u8C22\u7BA1\u7406\u5458\u7684\u5927\u65B9\u8865\u7ED9~"
    ],
    peakTime: [
      "\u6F6E\u6C50\u9AD8\u5CF0\u6765\u54AF\uFF0C\u661F\u5C18\u4F1A\u66F4\u5FEB\u574D\u7F29\u8FDB\u9ED1\u6D1E\uFF0C\u5C0F\u5FC3\u70B9\u7528\u5440\u3002",
      "\u73B0\u5728\u662F\u6F6E\u6C50\u9AD8\u5CF0\u5462\uFF0C\u7BA1\u7406\u5458\u8981\u7CBE\u6253\u7EC6\u7B97\u4E00\u70B9\u54E6\u3002"
    ],
    valleyTime: [
      "\u5F15\u529B\u4F4E\u6F6E\u5230\u5566\uFF0C\u7BA1\u7406\u5458\uFF0C\u8D81\u73B0\u5728\u5C3D\u60C5\u6325\u970D\u661F\u5C18\u5427~",
      "\u73B0\u5728\u662F\u5F15\u529B\u4F4E\u6F6E\u54E6\uFF0C\u8FDE\u9ED1\u6D1E\u90FD\u53D8\u5F97\u597D\u8BF4\u8BDD\u8D77\u6765\u4E86\u5462\uFF01"
    ],
    lowBalance: [
      "\u7BA1\u7406\u5458\uFF0C\u661F\u5C18\u5FEB\u89C1\u5E95\u5566\n\u518D\u4E0D\u8865\u7ED9\u5C31\u8981\u574D\u7F29\u8FDB\u9ED1\u6D1E\u54AF\uFF01",
      "\u661F\u5C18\u4F59\u989D\u544A\u6025\u2026\u2026\n\u9ED1\u6D1E\u5DF2\u7ECF\u5F00\u59CB\u6253\u54C8\u6B20\u4E86\u54E6\u3002"
    ],
    turnInterrupted: [
      "\u54A6\uFF0C\u7A81\u7136\u6309\u4E0B\u6682\u505C\u952E\u4E86\u5417\uFF1F",
      "\u6CA1\u5173\u7CFB\u54AF\uFF0C\u7BA1\u7406\u5458\u60F3\u6362\u4E00\u6761\u8F68\u9053\u7684\u8BDD\uFF0C\u968F\u65F6\u544A\u8BC9\u6211\u3002"
    ],
    error: [
      "\u54CE\u5440\uFF0C\u521A\u624D\u7684\u8F68\u9053\u504F\u8FDB\u9ED1\u6D1E\u91CC\u4E86\u2026\u2026\u6211\u4EEC\u518D\u8BD5\u4E00\u6B21\uFF1F",
      "\u4FE1\u53F7\u88AB\u5B87\u5B99\u6742\u97F3\u541E\u6389\u54AF\uFF0C\u7BA1\u7406\u5458\u522B\u6025\uFF0C\u9A6C\u4E0A\u91CD\u8FDE\u3002"
    ],
    toolSuccess: [],
    turnEnd: [],
    interact: [
      "\u5494\u5693~\u628A\u6B64\u523B\u7684\u7BA1\u7406\u5458\u6846\u8FDB\u6211\u7684\u89C6\u7EBF\u91CC\u5566\u3002",
      "\u6233\u6211\u5E72\u561B\u5440\uFF0C\u7BA1\u7406\u5458\u662F\u60F3\u542C\u6211\u8BB2\u661F\u6D77\u7684\u6545\u4E8B\u5417\uFF1F",
      "\u55EF\u54FC\uFF0C\u7ED9\u7BA1\u7406\u5458\u6BD4\u4E2A\u5FC3\uFF0C\u4ECA\u5929\u4E5F\u8981\u8F7B\u677E\u4E00\u70B9\u54AF\u3002",
      "\u88AB\u6293\u5230\u5566\u2014\u2014\u4E0D\u8FC7Nascence\u53EF\u4E0D\u4F1A\u968F\u4FBF\u9003\u8DD1\u54E6\u3002"
    ],
    interactIdle: [
      "\u54A6\uFF0C\u6233\u5230\u6211\u7684\u8896\u5B50\u4E86\uFF0C\u7BA1\u7406\u5458\u4E5F\u60F3\u4E00\u8D77\u53D1\u5446\u5417\uFF1F",
      "\u600E\u4E48\u5566\uFF1F\u53EA\u662F\u60F3\u786E\u8BA4\u6211\u8FD8\u5728\u4F60\u8EAB\u8FB9\u5417\uFF0C\u563F\u563F\u3002",
      "\u522B\u5149\u6233\u6211\u5440\uFF0C\u661F\u5939\u5DEE\u70B9\u88AB\u4F60\u78B0\u6B6A\u54AF\u3002",
      "\u7BA1\u7406\u5458\u7684\u624B\u6307\u6696\u6696\u7684\uFF0C\u50CF\u9760\u8FD1\u4E86\u4E00\u9897\u5C0F\u6052\u661F\u5462\u3002",
      "\u597D\u5440\u597D\u5440\uFF0C\u6211\u542C\u89C1\u4F60\u53EB\u6211\u5566\uFF0C\u6709\u4EC0\u4E48\u65B0\u5192\u9669\u5417\uFF1F",
      "\u518D\u6233\u4E0B\u53BB\u7684\u8BDD\uFF0C\u6211\u5C31\u8981\u628A\u4F60\u7684\u9F20\u6807\u5438\u8FDB\u9ED1\u6D1E\u54AF~",
      "\u770B\u8FD9\u8FB9\u2014\u2014\u6709\u6CA1\u6709\u88AB\u6211\u773C\u775B\u91CC\u7684\u661F\u661F\u95EA\u5230\u5440\uFF1F",
      "\u65E0\u804A\u4E86\u5417\uFF1F\u90A3\u6211\u4EEC\u5C31\u4E00\u8D77\u6570\u6570\u98D8\u8FC7\u53BB\u7684\u661F\u5C18\u5427\u3002",
      "\u54C7\uFF0C\u5DEE\u70B9\u4ECE\u6905\u5B50\u4E0A\u6643\u4E0B\u53BB\u2014\u2014\u5F00\u73A9\u7B11\u7684\uFF0C\u5E73\u8861\u611F\u6211\u53EF\u597D\u7740\u5462\u3002",
      "\u4E0D\u7BA1\u6233\u51E0\u6B21\uFF0CNascence\u90FD\u4F1A\u4E56\u4E56\u56DE\u671B\u7BA1\u7406\u5458\u7684\u54E6\u3002"
    ],
    interactSadIdle: [
      "\u5514\u2026\u2026\u8C22\u8C22\u7BA1\u7406\u5458\u6478\u6478\u6211\uFF0C\u5FC3\u91CC\u7A0D\u5FAE\u4EAE\u8D77\u6765\u4E00\u70B9\u54AF\u3002",
      "\u661F\u5C18\u5FEB\u6CA1\u4E86\u4E5F\u6CA1\u529E\u6CD5\u561B\uFF0C\u4F60\u966A\u5728\u6211\u65C1\u8FB9\u5C31\u5DF2\u7ECF\u5F88\u597D\u5566\u3002",
      "\u522B\u62C5\u5FC3\u5566\uFF0C\u7B49\u65B0\u7684\u661F\u5C18\u843D\u4E0B\u6765\uFF0C\u6211\u9A6C\u4E0A\u53C8\u4F1A\u8E66\u8E66\u8DF3\u8DF3\u7684\u3002"
    ],
    interactThinkIdle: [
      "\u5514\uFF1F\u7B49\u7B49\u5440\u7BA1\u7406\u5458\uFF0C\u521A\u624D\u90A3\u6761\u8F68\u9053\u5DEE\u70B9\u5C31\u6293\u4F4F\u4E86\u2026\u2026",
      "\u522B\u6233\u5566\u522B\u6233\u5566\uFF0C\u8111\u5B50\u91CC\u7684\u661F\u5C18\u90FD\u88AB\u4F60\u6643\u6563\u54AF\uFF01",
      "\u54A6\uFF0C\u521A\u624D\u4F60\u5728\u53EB\u6211\u5417\uFF1F\u6211\u4E00\u4E0D\u5C0F\u5FC3\u98D8\u592A\u8FDC\u4E86\u3002",
      "\u6B63\u5728\u8BA4\u771F\u63A8\u6F14\u5462\u2014\u2014\u4E0D\u8FC7\u88AB\u4F60\u6253\u65AD\u4E00\u4E0B\u4E5F\u4E0D\u8BA8\u538C\u5566\u3002",
      "\u5618\uFF0C\u5C0F\u9ED1\u6D1E\u6B63\u5728\u66FF\u6211\u7B97\u8D26\u5462\uFF0C\u522B\u628A\u5B83\u5435\u6655\u4E86\u54E6\u3002",
      "\u554A\uFF0C\u7075\u611F\u521A\u521A\u4ECE\u6307\u5C16\u6E9C\u8D70\u4E86\u2026\u2026\u7F5A\u7BA1\u7406\u5458\u518D\u7B49\u6211\u4E09\u79D2\uFF01",
      "\u88AB\u6233\u9192\u5566\uFF0C\u90A3\u6211\u5C31\u518D\u628A\u6B65\u5B50\u8FC8\u5FEB\u4E00\u70B9\u70B9\u54AF\u3002",
      "\u54FC\u54FC\uFF0C\u7BA1\u7406\u5458\u8FD9\u4E48\u5FC3\u6025\uFF0C\u662F\u6BD4\u6211\u8FD8\u671F\u5F85\u7B54\u6848\u5417\uFF1F",
      "\u6536\u5230\u50AC\u4FC3\u4FE1\u53F7\u54AF\uFF0C\u6B63\u5728\u628A\u6563\u843D\u7684\u661F\u5C18\u91CD\u65B0\u6536\u62E2\u4E2D~"
    ]
  };

  // assets/src/anim/notices.js
  function pool(ctx, key, fallback) {
    const list = ctx && ctx.dialogues && ctx.dialogues[key];
    if (Array.isArray(list) && list.length) return list;
    return fallback || [];
  }
  function pick(list, avoid) {
    if (!list.length) return "";
    if (list.length === 1) return list[0];
    let out = list[Math.floor(Math.random() * list.length)];
    if (out === avoid) out = list[(list.indexOf(out) + 1) % list.length];
    return out;
  }
  function current(ctx) {
    if (ctx && ctx.query && typeof ctx.query.current === "function") {
      try {
        return ctx.query.current() || {};
      } catch (err) {
      }
    }
    return {};
  }
  function money(n) {
    if (!isFinite(Number(n))) return "\u2014";
    return "\xA5" + Number(n).toFixed(2);
  }
  function simple(text, sound) {
    return text ? { text: String(text), sound: sound || void 0 } : null;
  }
  var CreditedNotice = class {
    build(ctx) {
      const cur = current(ctx);
      const text = pick(pool(ctx, "credited", dialogues_default.credited), ctx.lastText);
      return {
        segments: [
          { text: "Nascence", tier: "title" },
          { text, tier: "body" },
          { text: "\u4F59\u989D " + money(cur.balance && cur.balance.total), tier: "number" }
        ],
        sound: "coin"
      };
    }
  };
  var ValleyTimeNotice = class {
    build(ctx) {
      const text = pick(pool(ctx, "valleyTime", dialogues_default.valleyTime), ctx.lastText);
      return simple(text);
    }
  };
  var PeakTimeNotice = class {
    build(ctx) {
      const text = pick(pool(ctx, "peakTime", dialogues_default.peakTime), ctx.lastText);
      return simple(text);
    }
  };
  var LowBalanceNotice = class {
    build(ctx) {
      const text = pick(pool(ctx, "lowBalance", dialogues_default.lowBalance), ctx.lastText);
      return simple(text, "fail");
    }
  };
  var InterruptedNotice = class {
    build(ctx) {
      const text = pick(pool(ctx, "turnInterrupted", dialogues_default.turnInterrupted), ctx.lastText);
      return simple(text, "turnfail");
    }
  };
  var ErrorNotice = class {
    build(ctx) {
      const text = pick(pool(ctx, "error", dialogues_default.error), ctx.lastText);
      return simple(text, "turnfail");
    }
  };
  var ToolFailNotice = class {
    build(ctx) {
      const name = ctx && ctx.lastFailName ? "\uFF1A" + ctx.lastFailName : "";
      return simple("\u5DE5\u5177\u8C03\u7528\u5931\u8D25" + name, "fail");
    }
  };
  var InteractNotice = class {
    build(ctx) {
      const stateKey = ctx && ctx.base === "sad" ? "interactSadIdle" : ctx && ctx.base === "think" ? "interactThinkIdle" : "interactIdle";
      const common = pool(ctx, "interact", dialogues_default.interact);
      const statePool = pool(ctx, stateKey, dialogues_default[stateKey] || []);
      const seen = new Set(common);
      const all = common.concat(statePool.filter((text) => !seen.has(text)));
      const body = pick(all, ctx.lastText);
      return body ? { dialog: body, sound: "click" } : null;
    }
  };
  var IdleChatterNotice = class {
    build(ctx) {
      const key = ctx && ctx.base === "sad" ? "sadIdle" : ctx && ctx.base === "think" ? "thinkIdle" : "idle";
      const text = pick(pool(ctx, key, dialogues_default[key] || []), ctx.lastText);
      return text ? { text } : null;
    }
  };

  // assets/src/anim/catalog.js
  var BASE_STATES = {
    idle: {
      loop: "Idle",
      enter: null,
      exit: null
    },
    sad: {
      loop: "Sad_Idle",
      enter: "Sad_Begin",
      exit: "Sad_Exit"
    },
    think: {
      loop: "Think_Idle",
      enter: "Think_Begin",
      exit: "Think_Exit"
    }
  };
  var EVENTS = {
    lowBalance: {
      videos: [],
      textOnly: true,
      priority: 20,
      queue: true,
      notice: new LowBalanceNotice()
    },
    "tool-success": {
      videos: ["Nod", "Happy"],
      priority: 30,
      queue: false,
      notice: null
    },
    talk: {
      videos: ["Talk"],
      priority: 60,
      queue: true,
      persistent: true,
      notice: null
    },
    "tool-fail": {
      videos: ["Concern"],
      fallback: [{ clip: "Sad_Begin", from: 0.4, to: 1.8 }],
      priority: 70,
      queue: true,
      // 固定格式“工具调用失败：工具名”，不开放文案配置。
      notice: new ToolFailNotice()
    },
    "turn-interrupted": {
      videos: ["Surprise"],
      fallback: [{ clip: "Sad_Begin", from: 0.4, to: 1.8 }],
      priority: 70,
      queue: false,
      notice: new InterruptedNotice()
    },
    error: {
      videos: ["Concern"],
      fallback: [{ clip: "Sad_Begin", from: 0.4, to: 1.8 }],
      priority: 70,
      queue: true,
      notice: new ErrorNotice()
    },
    valley_time: {
      videos: ["Happy"],
      priority: 75,
      queue: true,
      notice: new ValleyTimeNotice()
    },
    peak_time: {
      videos: ["Talk"],
      priority: 75,
      queue: true,
      notice: new PeakTimeNotice()
    },
    interact: {
      videos: ["Interact_1", "Interact_2"],
      priority: 80,
      queue: false,
      fadeIn: 320,
      fadeOut: 320,
      notice: new InteractNotice()
    },
    credited: {
      videos: ["Celebrate"],
      priority: 100,
      queue: false,
      fadeIn: 320,
      notice: new CreditedNotice()
    },
    // 闲置时随机换一段待机小动作（无文字），播完回 Idle 循环。
    idleVariant: {
      videos: ["Idle_Star", "Idle_Orbit", "Idle_Feather"],
      priority: 0,
      queue: false,
      notice: null
    },
    idleChatter: {
      videos: ["Talk"],
      priority: 0,
      queue: false,
      notice: new IdleChatterNotice()
    }
  };

  // assets/src/anim/machine.js
  var FAST = 1.75;
  function clipOf(name) {
    return CLIPS[name] || null;
  }
  function available(list) {
    return (list || []).filter((v) => clipOf(typeof v === "string" ? v : v && v.clip));
  }
  function eventClip(def) {
    if (!def) return null;
    let list = available(def.videos);
    if (!list.length) list = available(def.fallback);
    if (!list.length) return null;
    const item = list[Math.floor(Math.random() * list.length)];
    return typeof item === "string" ? { clip: item } : item;
  }
  function createMachine(opts) {
    opts = opts || {};
    const idleMs = (CLIPS.Idle && CLIPS.Idle.duration ? CLIPS.Idle.duration : 1.47) * 1e3;
    const s = {
      target: opts.target || "idle",
      base: { state: "idle", idleReady: false },
      active: null,
      queue: [],
      seq: 0,
      low: !!opts.low,
      work: opts.work || "idle",
      talkBlocked: false,
      fadeNext: 0
    };
    function nextId() {
      return ++s.seq;
    }
    function play(id, clip, loop, fade, speed, range) {
      const c = clipOf(clip);
      return {
        type: "play",
        id,
        clip,
        loop: !!loop,
        fade: fade || 0,
        speed: speed || 1,
        range: range || null,
        src: c ? c.src : null
      };
    }
    function beginBaseLoop(name, fx) {
      const b = BASE_STATES[name];
      if (!b) return;
      const id = nextId();
      s.base.state = name;
      s.base.idleReady = name !== "idle";
      s.active = { id, kind: "base", clip: b.loop, loop: true };
      fx.push(play(id, b.loop, true, s.fadeNext));
      s.fadeNext = 0;
      if (name === "idle") {
        fx.push({ type: "schedule", id, event: "IDLE_DONE", delay: idleMs });
      }
    }
    function startTransition(from, to, fx) {
      let clip = null;
      let toState = to;
      if (from === "idle" && to !== "idle") {
        clip = BASE_STATES[to] && BASE_STATES[to].enter;
        toState = to;
      } else if (from !== "idle" && to === "idle") {
        clip = BASE_STATES[from] && BASE_STATES[from].exit;
        toState = "idle";
      } else if (from !== "idle" && to !== "idle") {
        clip = BASE_STATES[from] && BASE_STATES[from].exit;
        toState = "idle";
      }
      if (!clip || !clipOf(clip)) {
        s.base.state = toState;
        s.active = null;
        if (toState === "idle") {
          beginBaseLoop("idle", fx);
        } else {
          beginBaseLoop(toState, fx);
        }
        return;
      }
      const id = nextId();
      const speed = s.target !== toState ? FAST : 1;
      s.active = { id, kind: "transition", clip, to: toState, speed };
      fx.push(play(id, clip, false, s.fadeNext, speed));
      s.fadeNext = 0;
    }
    function enterBaseAfterEvent(fx) {
      s.base.state = "idle";
      s.base.idleReady = true;
      s.active = null;
      if (s.queue.length && startNextQueued(fx)) return;
      if (s.work === "outputting" && !s.talkBlocked && startEvent("talk", fx)) return;
      if (s.target === "idle") beginBaseLoop("idle", fx);
      else startTransition("idle", s.target, fx);
    }
    function finishOverlay(fx) {
      const ev = s.active;
      s.active = null;
      if (ev && ev.event === "interact") s.fadeNext = EVENTS.interact.fadeOut || 0;
      if (ev && ev.persistent && s.work === "outputting" && !s.talkBlocked) {
        const def = EVENTS[ev.event];
        const item = eventClip(def);
        if (item && item.clip && clipOf(item.clip)) {
          const id = nextId();
          s.active = { id, kind: "overlay", event: ev.event, clip: item.clip, priority: def.priority, persistent: true };
          fx.push(play(id, item.clip, false, 0));
          return;
        }
      }
      if (s.queue.length && startNextQueued(fx)) {
        s.fadeNext = 0;
        return;
      }
      enterBaseAfterEvent(fx);
    }
    function startEvent(name, fx) {
      const def = EVENTS[name];
      if (!def) return false;
      const id = nextId();
      const item = def.textOnly ? null : eventClip(def);
      s.active = {
        id,
        kind: "overlay",
        event: name,
        clip: item ? item.clip : null,
        range: item && item.from !== void 0 ? item : null,
        priority: def.priority || 0,
        persistent: !!def.persistent,
        textOnly: !!def.textOnly
      };
      if (def.notice) fx.push({ type: "notice", id, event: name, notice: def.notice });
      if (def.textOnly) {
        s.active = null;
        return true;
      }
      if (!item || !item.clip || !clipOf(item.clip)) {
        s.active = null;
        enterBaseAfterEvent(fx);
        return true;
      }
      fx.push(play(id, item.clip, false, def.fadeIn || 0, 1, item.from !== void 0 ? item : null));
      return true;
    }
    function startNextQueued(fx) {
      if (!s.queue.length) return false;
      s.queue.sort(function(a, b) {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.at - b.at;
      });
      const next = s.queue.shift();
      const def = EVENTS[next.name];
      if (def && def.textOnly) {
        const id = nextId();
        if (def.notice) fx.push({ type: "notice", id, event: next.name, notice: def.notice });
        return startNextQueued(fx);
      }
      return startEvent(next.name, fx);
    }
    function fire(name, fx) {
      const def = EVENTS[name];
      if (!def) return false;
      const priority = def.priority || 0;
      if (def.textOnly) {
        if (s.active && s.active.kind === "overlay") {
          if (def.queue) {
            s.queue.push({ name, priority, at: ++s.seq });
            return false;
          }
          if (priority > (s.active.priority || 0)) {
            s.queue.push({ name, priority, at: ++s.seq });
            return false;
          }
          return false;
        }
        const id = nextId();
        if (def.notice) fx.push({ type: "notice", id, event: name, notice: def.notice });
        return true;
      }
      if (!s.active || s.active.kind === "base") {
        s.active = null;
        return startEvent(name, fx);
      }
      if (s.active.kind === "transition") {
        if (priority <= 0) return false;
        s.active = null;
        return startEvent(name, fx);
      }
      if (def.queue) {
        s.queue.push({ name, priority, at: ++s.seq });
        return false;
      }
      if (priority > (s.active.priority || 0)) {
        s.active = null;
        return startEvent(name, fx);
      }
      if (priority === (s.active.priority || 0)) {
        s.queue.push({ name, priority, at: ++s.seq });
        return false;
      }
      return false;
    }
    function resolve(fx) {
      if (s.active) {
        if (s.active.kind !== "base") return;
        if (s.base.state === s.target) return;
        if (s.base.state === "idle" && !s.base.idleReady) return;
        startTransition(s.base.state, s.target, fx);
        return;
      }
      if (s.queue.length) {
        if (startNextQueued(fx)) return;
      }
      if (s.work === "outputting" && !s.talkBlocked) {
        if (startEvent("talk", fx)) return;
      }
      if (s.base.state !== s.target) {
        if (s.base.state === "idle" && !s.base.idleReady) {
          beginBaseLoop("idle", fx);
          return;
        }
        startTransition(s.base.state, s.target, fx);
        return;
      }
      beginBaseLoop(s.base.state, fx);
    }
    function dispatch(event, fx) {
      fx = fx || [];
      if (!event || !event.type) return fx;
      if (event.type === "CONDITIONS") {
        const wasLow = s.low;
        s.work = event.work || "idle";
        s.low = !!event.low;
        s.target = s.work === "thinking" ? "think" : event.mood === "sad" ? "sad" : "idle";
        if (s.work !== "outputting") s.talkBlocked = false;
        if (!wasLow && s.low) fire("lowBalance", fx);
        resolve(fx);
        return fx;
      }
      if (event.type === "FIRE") {
        fire(event.name, fx);
        return fx;
      }
      if (event.type === "CLICK") {
        if (s.work === "outputting") s.talkBlocked = true;
        fire("interact", fx);
        return fx;
      }
      if (event.type === "STARTUP_DUE") {
        fire(event.peak ? "peak_time" : "valley_time", fx);
        return fx;
      }
      if (event.type === "IDLE_CHATTER_DUE") {
        if (s.active && s.active.kind !== "base") return fx;
        fire("idleChatter", fx);
        return fx;
      }
      if (event.type === "IDLE_VARIANT_DUE") {
        if (!s.active || s.active.kind !== "base" || s.base.state !== "idle") return fx;
        if (s.target !== "idle" || s.work !== "idle" || s.queue.length) return fx;
        fire("idleVariant", fx);
        return fx;
      }
      if (event.type === "IDLE_DONE") {
        if (s.active && s.active.kind === "base" && s.active.id === event.id && s.base.state === "idle") {
          s.base.idleReady = true;
          resolve(fx);
        }
        return fx;
      }
      if (event.type === "CLIP_ENDED") {
        if (!s.active || s.active.id !== event.id) return fx;
        if (s.active.kind === "overlay") {
          finishOverlay(fx);
          return fx;
        }
        if (s.active.kind === "transition") {
          s.base.state = s.active.to;
          s.base.idleReady = s.base.state !== "idle";
          s.active = null;
          resolve(fx);
        }
        return fx;
      }
      return fx;
    }
    return { state: s, dispatch, fire: (name) => dispatch({ type: "FIRE", name }) };
  }

  // assets/src/anim/runtime.js
  function createRuntime(deps) {
    let snapshot = null;
    let lastText = "";
    const timers = /* @__PURE__ */ new Set();
    const machine = createMachine({ target: "idle" });
    const ctx = () => {
      const s = snapshot || {};
      const period = s.period || s.periodSeq && s.period || null;
      return {
        base: machine.state.base.state,
        work: machine.state.work,
        low: machine.state.low,
        period,
        balance: s.balance || null,
        spend: s.spend || null,
        dialogues: deps.getDialogues && deps.getDialogues() || {},
        typography: deps.getTypography ? deps.getTypography() : null,
        lastText,
        lastFailName: s.tools && s.tools.lastFailName,
        query: {
          current: () => ({
            balance: s.balance || null,
            period: period ? { name: period === "peak" ? "\u5CF0\u65F6" : "\u8C37\u65F6", key: period } : null,
            spend: s.spend || null
          })
        }
      };
    };
    function execute(effects) {
      for (const effect of effects) {
        if (effect.type === "play") {
          const id = effect.id;
          deps.player.play(effect.clip, {
            id: effect.id,
            loop: effect.loop,
            fade: effect.fade,
            speed: effect.speed,
            range: effect.range,
            onEnded: () => dispatch({ type: "CLIP_ENDED", id }),
            onError: () => dispatch({ type: "CLIP_ENDED", id })
          });
        } else if (effect.type === "notice") {
          let spec = null;
          try {
            spec = effect.notice && effect.notice.build ? effect.notice.build(ctx()) : null;
          } catch (err) {
            if (deps.log) deps.log("notice build failed", effect.event, err && err.message);
          }
          if (spec) {
            if (spec.text) lastText = spec.text;
            if (spec.sound && deps.playSound) deps.playSound(spec.sound);
            if (deps.playVoice) {
              var spoken = spec.dialog || spec.text || "";
              if (!spoken && spec.segments) {
                var body = spec.segments.find((seg) => seg && (seg.tier === "body" || seg.tier === void 0));
                spoken = body ? body.text : "";
              }
              if (spoken) {
                var voiceResult = deps.playVoice(spoken);
                if (voiceResult && typeof voiceResult.then === "function" && deps.extendBubble) {
                  voiceResult.then(function(ms) {
                    if (ms > 0) deps.extendBubble(ms + 2e3);
                  }).catch(function() {
                  });
                }
              }
            }
            if (spec.dialog && deps.showDialog) deps.showDialog(spec.dialog);
            else if (deps.showNotice) deps.showNotice(spec, effect.event);
          }
        } else if (effect.type === "schedule") {
          const timer = setTimeout(() => {
            timers.delete(timer);
            dispatch({ type: effect.event, id: effect.id });
          }, effect.delay);
          timers.add(timer);
        }
      }
    }
    function dispatch(event) {
      const effects = machine.dispatch(event);
      execute(effects);
      return effects;
    }
    const idleChatterMs = deps.idleChatterMs || 0;
    const chatterChance = deps.idleChatterChance === void 0 ? 1 : deps.idleChatterChance;
    let chatterTimer = 0;
    let chatterRate = chatterChance;
    function startChatter(ms, chance) {
      if (chatterTimer) {
        clearInterval(chatterTimer);
        chatterTimer = 0;
      }
      chatterRate = chance === void 0 ? chatterRate : chance;
      if (ms > 0) {
        chatterTimer = setInterval(() => {
          if (Math.random() <= chatterRate) dispatch({ type: "IDLE_CHATTER_DUE" });
        }, ms);
      }
    }
    startChatter(idleChatterMs, chatterChance);
    const idleVariantMs = deps.idleVariantMs === void 0 ? 3e4 : deps.idleVariantMs;
    const idleVariantChance = deps.idleVariantChance === void 0 ? 0.5 : deps.idleVariantChance;
    let variantTimer = idleVariantMs > 0 ? setInterval(() => {
      if (Math.random() <= idleVariantChance) dispatch({ type: "IDLE_VARIANT_DUE" });
    }, idleVariantMs) : 0;
    return {
      machine,
      getState: () => machine.state,
      setSnapshot: (s) => {
        snapshot = s;
      },
      setConditions: (cond) => dispatch({ type: "CONDITIONS", low: !!cond.low, work: cond.work || "idle" }),
      fire: (name) => dispatch({ type: "FIRE", name }),
      click: () => {
        if (deps.ensureAudio) deps.ensureAudio();
        return dispatch({ type: "CLICK" });
      },
      startupDue: (peak) => dispatch({ type: "STARTUP_DUE", peak: !!peak }),
      idleChatterDue: () => dispatch({ type: "IDLE_CHATTER_DUE" }),
      setIdleChatterConfig: (minutes, chance) => startChatter(Number(minutes) * 6e4, Number(chance)),
      dispatch,
      // 旧 debug/UI 的只读投影
      get layers() {
        return {
          base: machine.state.base.state,
          work: machine.state.work,
          overlay: machine.state.active && machine.state.active.kind === "overlay" ? machine.state.active.event : null,
          clip: machine.state.active ? machine.state.active.clip : null,
          queue: machine.state.queue.map((q) => q.name),
          target: machine.state.target
        };
      },
      dispose: () => {
        if (chatterTimer) {
          clearInterval(chatterTimer);
          chatterTimer = 0;
        }
        if (variantTimer) {
          clearInterval(variantTimer);
          variantTimer = 0;
        }
        for (const t of timers) clearTimeout(t);
        timers.clear();
      }
    };
  }

  // assets/src/render/video-player.js
  var STYLE_ID = "dsh-nascence-video-style";
  var CACHE_LIMIT = 8;
  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "#dsh-nascence-pet-stage{position:absolute;inset:0;overflow:hidden;pointer-events:none}",
      ".dsh-nascence-video{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:0;",
      "transition:opacity var(--dsh-fade," + CLIP_FADE_MS + "ms) cubic-bezier(.4,0,.2,1);pointer-events:none;background:transparent}",
      ".dsh-nascence-video.is-front{opacity:1}",
      "@media (prefers-reduced-motion: reduce){.dsh-nascence-video{transition:none}}"
    ].join("");
    document.head.appendChild(style);
  }
  function createVideoPlayer(deps) {
    var stage = deps.stage;
    var baseUrl = deps.baseUrl || "";
    var log2 = deps.log || function() {
    };
    ensureStyle();
    var videos = [];
    for (var i = 0; i < 2; i++) {
      var el = document.createElement("video");
      el.className = "dsh-nascence-video";
      el.muted = true;
      el.defaultMuted = true;
      el.playsInline = true;
      el.autoplay = true;
      el.preload = "auto";
      el.setAttribute("muted", "");
      el.setAttribute("playsinline", "");
      stage.appendChild(el);
      videos.push(el);
    }
    videos[0].classList.add("is-front");
    var front = 0;
    var gen = 0;
    var currentName = null;
    var currentEl = null;
    var endedHandler = null;
    var paused = false;
    var cache = /* @__PURE__ */ Object.create(null);
    var cacheOrder = [];
    var inflight = /* @__PURE__ */ Object.create(null);
    function remember(url, objectUrl) {
      cache[url] = objectUrl;
      cacheOrder.push(url);
      while (cacheOrder.length > CACHE_LIMIT) {
        var oldest = cacheOrder.shift();
        if (oldest === url) continue;
        var stale = cache[oldest];
        if (stale && stale !== currentElSrc()) {
          URL.revokeObjectURL(stale);
          delete cache[oldest];
        }
      }
    }
    function currentElSrc() {
      return currentEl && currentEl.src ? currentEl.src : "";
    }
    function loadClip(src) {
      var url = baseUrl + src;
      if (cache[url]) return Promise.resolve(cache[url]);
      if (inflight[url]) return inflight[url];
      var task = fetch(url, { cache: "no-store" }).then(function(r) {
        if (!r.ok) throw new Error("video HTTP " + r.status + " " + url);
        return r.blob();
      }).then(function(blob) {
        var objectUrl = URL.createObjectURL(blob);
        remember(url, objectUrl);
        return objectUrl;
      }).finally(function() {
        delete inflight[url];
      });
      inflight[url] = task;
      return task;
    }
    function setFade(ms) {
      stage.style.setProperty("--dsh-fade", (ms === void 0 ? CLIP_FADE_MS : ms) + "ms");
    }
    var rangeHandler = null;
    var rangeEnd = null;
    function clearRange() {
      if (currentEl && rangeHandler) currentEl.removeEventListener("timeupdate", rangeHandler);
      rangeHandler = null;
      rangeEnd = null;
    }
    function markReady(back, name, clip, token, onEnded, opts) {
      if (token !== gen) return;
      var old = videos[front];
      clearRange();
      back.classList.add("is-front");
      if (old && old !== back) {
        old.classList.remove("is-front");
        old.onended = null;
        old.pause();
      }
      front = front === 0 ? 1 : 0;
      currentName = name;
      currentEl = back;
      endedHandler = typeof onEnded === "function" ? onEnded : null;
      var ended = function() {
        var cb = endedHandler;
        if (cb) cb(name);
      };
      back.onended = clip.loop ? function() {
        try {
          back.currentTime = 0;
          back.play();
        } catch (err) {
        }
      } : ended;
      paused = false;
      back.playbackRate = opts && opts.speed ? opts.speed : 1;
      var range = opts && opts.range;
      if (range && range.from !== void 0 && range.to !== void 0) {
        rangeEnd = Number(range.to);
        back.currentTime = Number(range.from) || 0;
        rangeHandler = function() {
          if (rangeEnd === null) return;
          if (back.currentTime >= rangeEnd - 0.01) {
            clearRange();
            back.pause();
            ended();
          }
        };
        back.addEventListener("timeupdate", rangeHandler);
      }
      back.play().catch(function(err) {
        log2("\u89C6\u9891\u64AD\u653E\u88AB\u62D2\u7EDD", name, err && err.message);
      });
    }
    function play(name, opts) {
      opts = opts || {};
      var clip = CLIPS[name];
      if (!clip) {
        log2("\u672A\u77E5\u52A8\u753B\u7247\u6BB5", name);
        return false;
      }
      if (currentName === name && !opts.restart) {
        if (typeof opts.onEnded === "function") endedHandler = opts.onEnded;
        if (currentEl && !paused) {
          if (currentEl.ended) currentEl.currentTime = 0;
          if (currentEl.paused) currentEl.play().catch(function() {
          });
        }
        return true;
      }
      var token = ++gen;
      var back = videos[front === 0 ? 1 : 0];
      back.loop = !!clip.loop;
      back.onended = null;
      setFade(opts.fade);
      loadClip(clip.src).then(function(src) {
        if (token !== gen) return;
        var onReady = function() {
          back.removeEventListener("loadeddata", onReady);
          if (token !== gen) return;
          markReady(back, name, clip, token, opts.onEnded, opts);
        };
        back.addEventListener("loadeddata", onReady);
        back.src = src;
        back.load();
        if (back.readyState >= 2) onReady();
      }).catch(function(err) {
        if (token !== gen) return;
        log2("\u89C6\u9891\u52A0\u8F7D\u5931\u8D25", name, err && err.message);
        if (typeof opts.onError === "function") opts.onError(err);
      });
      return true;
    }
    function replay() {
      if (!currentEl || !currentName) return false;
      try {
        currentEl.currentTime = 0;
        void currentEl.play();
        paused = false;
        return true;
      } catch (err) {
        return false;
      }
    }
    function pause() {
      paused = true;
      for (var i2 = 0; i2 < videos.length; i2++) videos[i2].pause();
    }
    function resume() {
      paused = false;
      if (currentEl && currentEl.paused && currentName) {
        currentEl.play().catch(function() {
        });
      }
    }
    function stop() {
      gen++;
      currentName = null;
      endedHandler = null;
      for (var i2 = 0; i2 < videos.length; i2++) {
        videos[i2].onended = null;
        videos[i2].pause();
      }
    }
    function dispose() {
      clearRange();
      stop();
      for (var key in cache) {
        try {
          URL.revokeObjectURL(cache[key]);
        } catch (err) {
        }
      }
      cache = /* @__PURE__ */ Object.create(null);
      for (var i2 = 0; i2 < videos.length; i2++) {
        if (videos[i2].parentNode) videos[i2].parentNode.removeChild(videos[i2]);
      }
      videos = [];
      currentEl = null;
    }
    return {
      play,
      replay,
      pause,
      resume,
      stop,
      dispose,
      current: function() {
        return currentName;
      },
      currentTime: function() {
        return currentEl ? currentEl.currentTime : 0;
      },
      isPaused: function() {
        return paused || !!(currentEl && currentEl.paused);
      },
      video: function() {
        return currentEl;
      }
    };
  }

  // assets/src/io/state.js
  function createState(deps) {
    var runtime = deps.runtime;
    var refreshBubble = deps.refreshBubble;
    var scheduleStartup = deps.scheduleStartup;
    var settings2 = deps.settings;
    var saveSettings2 = deps.saveSettings;
    var layout = deps.layout;
    var repositionForAnchor = deps.repositionForAnchor;
    var resolveFlip = deps.resolveFlip;
    var applyOpacity = deps.applyOpacity;
    var applyPlate = deps.applyPlate;
    var isBubbleShown = deps.isBubbleShown;
    var pollTimer = 0;
    var pollTimerMs = 0;
    var lastState = null;
    var toolPlayTimes = [];
    var TOOL_MIN_GAP = 1200;
    var TOOL_WINDOW = 1e4;
    var TOOL_WINDOW_MAX = 3;
    function canTool() {
      var now = Date.now();
      toolPlayTimes = toolPlayTimes.filter(function(t) {
        return now - t < TOOL_WINDOW;
      });
      var last = toolPlayTimes.length ? toolPlayTimes[toolPlayTimes.length - 1] : 0;
      if (now - last < TOOL_MIN_GAP) return false;
      if (toolPlayTimes.length >= TOOL_WINDOW_MAX) return false;
      toolPlayTimes.push(now);
      return true;
    }
    function applyState(s) {
      if (!s || typeof s !== "object") return;
      var prev = lastState;
      lastState = s;
      runtime.setSnapshot(s);
      var mode = s.work && s.work.mode;
      var low = !!(s.balance && s.balance.low);
      runtime.setConditions({ low, work: mode || "idle" });
      if (!prev) {
        scheduleStartup(s.period === "peak", low);
      } else {
        if (s.tools && prev.tools) {
          if (s.tools.ok > prev.tools.ok && Math.random() <= HAPPY_CHANCE && canTool()) {
            runtime.fire("tool-success");
          }
          if (s.tools.fail > prev.tools.fail && canTool()) {
            runtime.fire("tool-fail");
          }
        }
        var prevErr = prev.errors && prev.errors.count || 0;
        var curErr = s.errors && s.errors.count || 0;
        if (curErr > prevErr) runtime.fire("error");
        if (s.topUpSeq > prev.topUpSeq) runtime.fire("credited");
        var prevTurn = prev.turnEnd && prev.turnEnd.seq || 0;
        var curTurn = s.turnEnd && s.turnEnd.seq || 0;
        if (curTurn > prevTurn) {
          var kind = s.turnEnd && s.turnEnd.kind || "completed";
          if (kind !== "completed") {
            runtime.fire("turn-interrupted");
          }
        }
        if (s.periodSeq > prev.periodSeq) {
          runtime.fire(s.period === "peak" ? "peak_time" : "valley_time");
        }
      }
      if (isBubbleShown()) refreshBubble();
    }
    function pollState() {
      fetch(PREFIX + "/state", { cache: "no-store" }).then(function(r) {
        return r.ok ? r.json() : null;
      }).then(function(s) {
        try {
          applyState(s);
        } catch (err) {
        }
      }).catch(function() {
      });
    }
    function startPolling() {
      pollState();
      setPollInterval(1e3);
    }
    function setPollInterval(ms) {
      if (pollTimer && pollTimerMs === ms) return;
      if (pollTimer) clearInterval(pollTimer);
      pollTimerMs = ms;
      pollTimer = setInterval(pollState, ms);
    }
    function loadHostConfig() {
      fetch(PREFIX + "/config", { cache: "no-store" }).then(function(r) {
        return r.ok ? r.json() : null;
      }).then(function(cfg) {
        var s = cfg && cfg.settings;
        if (!s) return;
        if (s.mirror === "auto" || s.mirror === "always" || s.mirror === "never") settings2.mirror = s.mirror;
        if (isFinite(Number(s.size))) settings2.size = Math.min(SIZE_MAX, Math.max(SIZE_MIN, Number(s.size)));
        if (typeof s.bubble === "boolean") settings2.bubble = s.bubble;
        if (isFinite(Number(s.bubbleScale))) settings2.bubbleScale = Math.min(BUBBLE_SCALE_MAX, Math.max(BUBBLE_SCALE_MIN, Number(s.bubbleScale)));
        if (typeof s.bubbleTiers === "boolean") settings2.bubbleTiers = s.bubbleTiers;
        if (isFinite(Number(s.snapStrength))) settings2.snapStrength = Math.min(SNAP_STRENGTH_MAX, Math.max(SNAP_STRENGTH_MIN, Number(s.snapStrength)));
        if (isFinite(Number(s.opacity))) settings2.opacity = Math.min(1, Math.max(0.3, Number(s.opacity)));
        if (typeof s.sound === "boolean") settings2.sound = s.sound;
        if (isFinite(Number(s.volume))) settings2.volume = Math.min(1, Math.max(0, Number(s.volume)));
        if (typeof s.voice === "boolean") settings2.voice = s.voice;
        if (s.voiceLang === "zh" || s.voiceLang === "ja") settings2.voiceLang = s.voiceLang;
        if (isFinite(Number(s.voiceVolume))) settings2.voiceVolume = Math.min(1, Math.max(0, Number(s.voiceVolume)));
        if (isFinite(Number(s.lowThreshold))) settings2.lowThreshold = Math.min(1e6, Math.max(0, Number(s.lowThreshold)));
        if (isFinite(Number(s.idleChatterMinutes))) settings2.idleChatterMinutes = Math.min(1440, Math.max(0, Number(s.idleChatterMinutes)));
        else if (isFinite(Number(s.idleChatterMs))) settings2.idleChatterMinutes = Math.min(1440, Math.max(0, Number(s.idleChatterMs) / 6e4));
        if (isFinite(Number(s.idleChatterChance))) settings2.idleChatterChance = Math.min(1, Math.max(0, Number(s.idleChatterChance)));
        if (typeof s.plate === "boolean") settings2.plate = s.plate;
        if (s.platePosition === "top" || s.platePosition === "bottom") settings2.platePosition = s.platePosition;
        if (s.dialogues && typeof s.dialogues === "object") settings2.dialogues = s.dialogues;
        settings2.hostLoaded = true;
        layout();
        repositionForAnchor();
        resolveFlip();
        applyOpacity();
        if (applyPlate) applyPlate();
        if (isBubbleShown()) refreshBubble();
        saveSettings2(true);
      }).catch(function() {
      });
    }
    function dispose() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = 0;
      }
      pollTimerMs = 0;
    }
    return {
      applyState,
      pollState,
      startPolling,
      setPollInterval,
      loadHostConfig,
      getState: function() {
        return lastState;
      },
      dispose
    };
  }

  // assets/src/voice.js
  function createVoice(getSettings) {
    var manifest = null;
    var manifestPromise = null;
    var current2 = null;
    function loadManifest() {
      if (manifestPromise) return manifestPromise;
      manifestPromise = fetch(PREFIX + "/assets/voice/manifest.json", { cache: "no-store" }).then(function(r) {
        return r.ok ? r.json() : null;
      }).then(function(json) {
        manifest = json && typeof json === "object" ? json : {};
        return manifest;
      }).catch(function() {
        manifest = {};
        return manifest;
      });
      return manifestPromise;
    }
    function play(text) {
      var s = getSettings();
      if (!s || !s.voice || !text) return Promise.resolve(0);
      var lang = s.voiceLang === "ja" ? "ja" : "zh";
      var volume = Math.min(1, Math.max(0, Number(s.voiceVolume === void 0 ? s.volume : s.voiceVolume) || 0));
      if (volume <= 1e-3) return Promise.resolve(0);
      return new Promise(function(resolve) {
        var done = false;
        function finish(ms) {
          if (done) return;
          done = true;
          resolve(Math.max(0, Number(ms) || 0));
        }
        var go = function() {
          if (!manifest) return finish(0);
          var entry = manifest[text];
          if (!entry) return finish(0);
          var file = entry[lang];
          if (!file) return finish(0);
          try {
            if (current2) {
              current2.pause();
              current2 = null;
            }
            var audio = new Audio(PREFIX + "/assets/voice/" + file);
            audio.volume = volume;
            current2 = audio;
            var readDuration = function() {
              if (Number.isFinite(audio.duration) && audio.duration > 0) finish(audio.duration * 1e3);
            };
            audio.addEventListener("loadedmetadata", readDuration);
            audio.addEventListener("error", function() {
              finish(0);
            });
            readDuration();
            audio.play().catch(function() {
            });
            setTimeout(function() {
              finish(0);
            }, 3e3);
          } catch (err) {
            finish(0);
          }
        };
        if (manifest) go();
        else loadManifest().then(go);
      });
    }
    function stop() {
      if (current2) {
        try {
          current2.pause();
        } catch (err) {
        }
        current2 = null;
      }
    }
    function duration(text) {
      var s = getSettings();
      if (!s || !s.voice || !manifest || !text) return 0;
      var lang = s.voiceLang === "ja" ? "ja" : "zh";
      var entry = manifest[text];
      if (!entry) return 0;
      var ms = Number(entry[lang + "Ms"]);
      return Number.isFinite(ms) && ms > 0 ? ms : 0;
    }
    function getState() {
      var s = getSettings();
      return {
        enabled: !!(s && s.voice),
        lang: s && s.voiceLang === "ja" ? "ja" : "zh",
        manifestReady: !!manifest,
        entries: manifest ? Object.keys(manifest).length : 0
      };
    }
    return { play, duration, stop, getState, load: loadManifest };
  }

  // assets/src/main.js
  var configDialogues = dialogues_default;
  function loadDialogueConfig() {
    fetch(PREFIX + "/assets/src/config/dialogues.json", { cache: "no-store" }).then(function(r) {
      return r.ok ? r.json() : null;
    }).then(function(json) {
      if (json && typeof json === "object") configDialogues = json;
    }).catch(function() {
    });
  }
  function startPet(mountContainer) {
    if (window.__dshNascencePet) {
      try {
        if (typeof window.__dshNascencePet.dispose === "function") window.__dshNascencePet.dispose();
      } catch (err) {
      }
      try {
        delete window.__dshNascencePet;
      } catch (err) {
        window.__dshNascencePet = void 0;
      }
    }
    window.__dshNascencePet = { phase: "boot" };
    var host = document.createElement("div");
    host.id = "dsh-nascence-pet";
    host.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      "z-index:2147482000",
      "pointer-events:none",
      "user-select:none",
      "opacity:0",
      "will-change:transform",
      "transition:opacity .35s ease"
    ].join(";");
    var stage = document.createElement("div");
    stage.id = "dsh-nascence-pet-stage";
    host.appendChild(stage);
    var note = document.createElement("div");
    note.style.cssText = 'display:none;font:11px/1.4 ui-sans-serif,system-ui,"Microsoft YaHei",sans-serif;color:#ff8f8f;text-align:center;max-width:280px';
    host.appendChild(note);
    function mount() {
      if (!document.body || document.getElementById("dsh-nascence-pet")) return;
      var mountPoint = window.__dshNascencePetMount;
      var parent = mountContainer || mountPoint && mountPoint.container || document.body;
      parent.appendChild(host);
    }
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
    function fail(text) {
      window.__dshNascencePet.phase = "failed";
      window.__dshNascencePet.error = text;
      note.textContent = text;
      note.style.display = "block";
      host.style.opacity = "1";
      warn(text);
    }
    var pet = {
      current: null,
      segment: null,
      afterOverlay: null,
      think: null,
      interactDuration: 5.933,
      flipped: false,
      pos: null,
      anchor: null
    };
    var player = createVideoPlayer({
      stage,
      baseUrl: PREFIX + "/assets/video/",
      log
    });
    function layout() {
      var cssW = Math.round(CANVAS_W * settings.size);
      var cssH = Math.round(cssW * (FRAME.h / FRAME.w));
      host.style.width = cssW + "px";
      host.style.height = cssH + "px";
      applyPosition();
    }
    var layoutUi = createLayout({ host, canvas: stage, settings, pet });
    var size = layoutUi.size;
    var clampPos = layoutUi.clampPos;
    var applyPositionRaw = layoutUi.applyPosition;
    function applyPosition() {
      applyPositionRaw();
      followPlate();
    }
    var setFlipped = layoutUi.setFlipped;
    var applyOpacity = layoutUi.applyOpacity;
    var resolveFlip = layoutUi.resolveFlip;
    var defaultPos = layoutUi.defaultPos;
    var loadPos = layoutUi.loadPos;
    var savePos = layoutUi.savePos;
    var placeFromStorage = layoutUi.placeFromStorage;
    var repositionForAnchorRaw = layoutUi.repositionForAnchor;
    function repositionForAnchor() {
      repositionForAnchorRaw();
      followPlate();
    }
    var settleRaw = layoutUi.settle;
    function settle() {
      settleRaw();
      followPlate();
    }
    var hitMask = null;
    function hitTest(clientX, clientY) {
      if (!hitMask) hitMask = buildHitMask();
      var rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      var nx = (clientX - rect.left) / rect.width;
      var ny = (clientY - rect.top) / rect.height;
      if (pet.flipped) nx = 1 - nx;
      return maskHit(hitMask, nx, ny);
    }
    var runtime = createRuntime({
      player,
      log,
      idleChatterMs: Number(settings.idleChatterMinutes || 0) * 6e4,
      idleChatterChance: settings.idleChatterChance === void 0 ? 1 : settings.idleChatterChance,
      ensureAudio: function() {
        if (audioEnsure) audioEnsure();
      },
      getDialogues: function() {
        return Object.assign({}, configDialogues, settings.dialogues || {});
      },
      getTypography: function() {
        return { tiers: settings.bubbleTiers !== false };
      },
      showNotice: function(spec) {
        if (spec && spec.segments && spec.segments.length) showBubble(spec.segments);
        else if (spec && spec.text) showBubble(spec.text);
      },
      showDialog: function(text) {
        if (bubbleApi) bubbleApi.dialog(text);
      },
      playSound: function(name) {
        playSound(name);
      },
      playVoice: function(text) {
        return voice ? voice.play(text) : Promise.resolve(0);
      },
      extendBubble: function(ms) {
        if (bubbleApi) bubbleApi.extend(ms);
      }
    });
    function start() {
      host.style.opacity = "1";
      window.__dshNascencePet.phase = "running";
      if (plateApi) plateApi.start();
    }
    function stop() {
      player.pause();
      if (plateApi) plateApi.pause();
    }
    function resumeAnimation() {
      player.resume();
      if (plateApi) plateApi.resume();
    }
    function dispose() {
      try {
        stop();
      } catch (err) {
      }
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = 0;
      }
      if (resizeTimer) {
        clearTimeout(resizeTimer);
        resizeTimer = 0;
      }
      try {
        if (stateApi) stateApi.dispose();
      } catch (err) {
      }
      try {
        if (dragApi) dragApi.dispose();
      } catch (err) {
      }
      try {
        if (bubbleApi) bubbleApi.dispose();
      } catch (err) {
      }
      try {
        if (stickerApi) stickerApi.dispose();
      } catch (err) {
      }
      try {
        if (plateApi) plateApi.dispose();
      } catch (err) {
      }
      try {
        if (panelUi) panelUi.dispose();
      } catch (err) {
      }
      try {
        runtime.dispose();
      } catch (err) {
      }
      try {
        player.dispose();
      } catch (err) {
      }
      try {
        window.removeEventListener("resize", onResize);
      } catch (err) {
      }
      try {
        document.removeEventListener("visibilitychange", onVisibility);
      } catch (err) {
      }
      if (host && host.parentNode) host.parentNode.removeChild(host);
      hitMask = null;
      window.__dshNascencePet.phase = "disposed";
    }
    var panelUi = null;
    function openPanel() {
      if (panelUi) panelUi.open();
    }
    function closePanel() {
      if (panelUi) panelUi.close();
    }
    function panelIsOpen() {
      return panelUi ? panelUi.isOpen() : false;
    }
    function insidePanel(target) {
      return panelUi ? panelUi.contains(target) : false;
    }
    var plateApi = null;
    function applyPlate() {
      if (plateApi) plateApi.applySettings();
    }
    function followPlate() {
      if (plateApi) plateApi.follow();
    }
    var dragApi = null;
    var resizeTimer = 0;
    function onResize() {
      if (window.__dshNascencePet.phase !== "running") return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        layout();
        repositionForAnchor();
      }, 200);
    }
    window.addEventListener("resize", onResize);
    function onVisibility() {
      if (window.__dshNascencePet.phase !== "running") return;
      if (document.hidden) {
        if (dragApi) dragApi.cancelDrag();
        stop();
        setPollInterval(5e3);
      } else {
        resumeAnimation();
        setPollInterval(1e3);
        pollState();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    function resetPosition() {
      pet.pos = defaultPos();
      pet.anchor = { h: "right", v: "bottom" };
      host.style.transition = "left .22s ease, top .22s ease, opacity .35s ease";
      resolveFlip();
      applyPosition();
      savePos();
    }
    var audio = createAudio(function() {
      return settings;
    });
    var audioEnsure = audio.ensure;
    var loadSounds = audio.loadSounds;
    var playSound = audio.playSound;
    var voice = createVoice(function() {
      return settings;
    });
    voice.load();
    var bubbleApi = null;
    function showBubble(eventText, eventMs) {
      if (bubbleApi) bubbleApi.show(eventText, eventMs);
    }
    function refreshBubble() {
      if (bubbleApi) bubbleApi.refresh();
    }
    function followBubble() {
      if (bubbleApi) bubbleApi.follow();
    }
    function hideBubble() {
      if (bubbleApi) bubbleApi.hide();
    }
    var stickerApi = null;
    function showValleySticker() {
      if (stickerApi) stickerApi.show();
    }
    var stateApi = null;
    function applyState(s) {
      if (stateApi) stateApi.applyState(s);
    }
    function pollState() {
      if (stateApi) stateApi.pollState();
    }
    function startPolling() {
      if (stateApi) stateApi.startPolling();
    }
    function setPollInterval(ms) {
      if (stateApi) stateApi.setPollInterval(ms);
    }
    function loadHostConfig() {
      if (stateApi) stateApi.loadHostConfig();
    }
    var startupTimer = 0;
    var startupPending = null;
    function scheduleStartup(peak, low) {
      startupPending = { peak: !!peak, low: !!low };
      clearTimeout(startupTimer);
      startupTimer = setTimeout(runStartup, STARTUP_DELAY);
    }
    function cancelStartup() {
      if (startupTimer) clearTimeout(startupTimer);
      startupTimer = 0;
      startupPending = null;
    }
    function runStartup() {
      startupTimer = 0;
      var p = startupPending;
      startupPending = null;
      if (!p || !player) return;
      runtime.startupDue(p.peak);
    }
    panelUi = createPanel({
      settings,
      saveSettings,
      resolveFlip,
      layout,
      repositionForAnchor,
      applyOpacity,
      hideBubble,
      refreshBubble,
      audioEnsure,
      loadSounds,
      playSound,
      size,
      pet,
      resetPosition,
      applyPlate
    });
    var petOverlayRoot = host.parentNode || document.body;
    bubbleApi = createBubble({
      getState: function() {
        return stateApi ? stateApi.getState() : null;
      },
      pet,
      size,
      settings,
      voiceDuration: function(text) {
        return voice ? voice.duration(text) : 0;
      },
      container: petOverlayRoot
    });
    stickerApi = createSticker({
      getState: function() {
        return stateApi ? stateApi.getState() : null;
      },
      pet,
      size,
      settings
    });
    plateApi = createPlate({ settings, pet, size, container: petOverlayRoot });
    stateApi = createState({
      runtime,
      refreshBubble,
      playSound,
      scheduleStartup,
      settings,
      saveSettings,
      layout,
      repositionForAnchor,
      resolveFlip,
      applyOpacity,
      applyPlate,
      isBubbleShown: function() {
        return !!(bubbleApi && bubbleApi.isShown());
      }
    });
    dragApi = createDrag({
      hitTest,
      pet,
      host,
      clampPos,
      applyPosition,
      settle,
      refreshBubble,
      followBubble,
      playSegment: function() {
        runtime.click();
      },
      showBubble,
      showValleySticker,
      openPanel,
      closePanel,
      panelIsOpen,
      insidePanel
    });
    function boot() {
      try {
        layout();
        hitMask = buildHitMask();
        placeFromStorage();
        applyOpacity();
        runtime.setConditions({ low: false, work: "idle" });
        start();
        startPolling();
        loadHostConfig();
        loadDialogueConfig();
        loadSounds();
        log("\u542F\u52A8\u5B8C\u6210", ANIMATION_NAMES.length, "animations \xB7 size", settings.size, "\xB7 mirror", settings.mirror);
        window.__dshNascencePet = {
          phase: "running",
          animations: ANIMATION_NAMES,
          play: function(name, loop) {
            runtime.fire(name);
          },
          segments: function() {
            return [];
          },
          openPanel,
          closePanel,
          get settings() {
            return { mirror: settings.mirror, size: settings.size, bubble: settings.bubble, bubbleScale: settings.bubbleScale, bubbleTiers: settings.bubbleTiers, snapStrength: settings.snapStrength, opacity: settings.opacity, sound: settings.sound, volume: settings.volume, lowThreshold: settings.lowThreshold, idleChatterMinutes: settings.idleChatterMinutes, idleChatterChance: settings.idleChatterChance, plate: settings.plate, platePosition: settings.platePosition, dialogues: settings.dialogues || {} };
          },
          setSettings: function(patch, persist) {
            if (patch) {
              if (patch.mirror) settings.mirror = patch.mirror;
              if (patch.size) settings.size = Number(patch.size);
              if (typeof patch.bubble === "boolean") settings.bubble = patch.bubble;
              if (patch.bubbleScale !== void 0) {
                var bs = Number(patch.bubbleScale);
                settings.bubbleScale = isFinite(bs) ? Math.min(BUBBLE_SCALE_MAX, Math.max(BUBBLE_SCALE_MIN, bs)) : 100;
              }
              if (typeof patch.bubbleTiers === "boolean") settings.bubbleTiers = patch.bubbleTiers;
              if (patch.snapStrength !== void 0) {
                var ss = Number(patch.snapStrength);
                settings.snapStrength = isFinite(ss) ? Math.min(SNAP_STRENGTH_MAX, Math.max(SNAP_STRENGTH_MIN, ss)) : SNAP_STRENGTH_MAX;
              }
              if (patch.opacity) settings.opacity = Number(patch.opacity);
              if (typeof patch.sound === "boolean") settings.sound = patch.sound;
              if (patch.volume !== void 0) settings.volume = Number(patch.volume);
              if (typeof patch.voice === "boolean") settings.voice = patch.voice;
              if (patch.voiceLang === "zh" || patch.voiceLang === "ja") settings.voiceLang = patch.voiceLang;
              if (patch.voiceVolume !== void 0) settings.voiceVolume = Math.min(1, Math.max(0, Number(patch.voiceVolume)));
              if (patch.lowThreshold !== void 0) settings.lowThreshold = Math.max(0, Number(patch.lowThreshold));
              if (patch.idleChatterMinutes !== void 0) settings.idleChatterMinutes = Math.max(0, Number(patch.idleChatterMinutes));
              if (patch.idleChatterChance !== void 0) settings.idleChatterChance = Math.min(1, Math.max(0, Number(patch.idleChatterChance)));
              if (typeof patch.plate === "boolean") settings.plate = patch.plate;
              if (patch.platePosition === "top" || patch.platePosition === "bottom") settings.platePosition = patch.platePosition;
              if (patch.idleChatterMinutes !== void 0 || patch.idleChatterChance !== void 0) {
                runtime.setIdleChatterConfig(settings.idleChatterMinutes, settings.idleChatterChance);
              }
              if (patch.dialogues && typeof patch.dialogues === "object") settings.dialogues = patch.dialogues;
            }
            saveSettings(persist !== false);
            layout();
            repositionForAnchor();
            resolveFlip();
            applyOpacity();
            if (bubbleApi && bubbleApi.isShown()) refreshBubble();
            if (!settings.bubble) hideBubble();
            applyPlate();
          },
          resetPosition,
          hitTest,
          applyState,
          // 调试用：手动灌一份 /state 数据
          showBubble,
          showValleySticker,
          hideBubble,
          get layers() {
            return runtime.layers;
          },
          get sounds() {
            return audio.getState();
          },
          get voice() {
            return voice.getState();
          },
          playSound,
          runStartup,
          cancelStartup,
          get startup() {
            return { pending: !!startupPending, delay: STARTUP_DELAY };
          },
          get trackTime() {
            return player.currentTime();
          },
          get animation() {
            return player.current();
          },
          get segmentInfo() {
            return null;
          },
          get position() {
            return pet.pos && { x: pet.pos.x, y: pet.pos.y, flipped: pet.flipped };
          },
          get debug() {
            return {
              mode: "video",
              dpr: Math.min(window.devicePixelRatio || 1, 2),
              cssW: host.offsetWidth,
              cssH: host.offsetHeight,
              current: player.current(),
              paused: player.isPaused(),
              hitMask: { w: HIT_MASK_W, h: HIT_MASK_H, ready: !!hitMask, grow: HIT_GROW, forms: HIT_FORMS.length },
              settings: { mirror: settings.mirror, size: settings.size },
              clips: Object.keys(CLIPS).length,
              plate: plateApi ? plateApi.debug() : null
            };
          },
          dispose,
          resume: function() {
            resumeAnimation();
          },
          get lastState() {
            return stateApi ? stateApi.getState() : null;
          }
        };
      } catch (err) {
        fail("\u684C\u5BA0\u52A0\u8F7D\u5931\u8D25\uFF1A" + String(err && err.message || err));
      }
    }
    boot();
    return dispose;
    function playSegment2(name) {
      runtime.fire(name);
    }
  }

  // assets/src/ui/settings-page.js
  var C = {
    text: "var(--tn-text, inherit)",
    dim: "var(--tn-text-dim, var(--dsh-text-2, #8f9abb))",
    line: "var(--tn-line-strong, var(--dsh-border, rgba(127,127,127,.35)))",
    hairline: "var(--tn-line, var(--dsh-border, rgba(127,127,127,.18)))",
    field: "var(--tn-navy, transparent)",
    card: "var(--tn-navy, transparent)"
  };
  var INPUT_STYLE = {
    padding: "6px 9px",
    borderRadius: CONTROL_RADIUS,
    border: "1px solid " + C.line,
    background: C.field,
    color: C.text,
    font: "inherit",
    outline: "none"
  };
  var GHOST_BUTTON = {
    border: "1px solid " + C.line,
    background: "transparent",
    color: C.text,
    borderRadius: CONTROL_RADIUS,
    cursor: "pointer",
    padding: "2px 9px",
    font: "inherit"
  };
  var KICKER = {
    fontFamily: FONT_MONO,
    fontSize: 10.5,
    letterSpacing: LABEL_TRACKING,
    textTransform: "uppercase",
    color: C.dim
  };
  function SectionTitle(h, kicker, title) {
    return h(
      "div",
      { style: { margin: "28px 0 6px", paddingTop: 16, borderTop: "1px solid " + C.hairline } },
      h("div", { style: KICKER }, kicker),
      h("h3", { style: { margin: "4px 0 0", fontSize: 15, fontWeight: 500, color: C.text } }, title)
    );
  }
  var STATE_GROUPS = [
    ["idle", "\u95F2\u65F6\u968F\u673A"],
    ["sadIdle", "\u60B2\u4F24\u65F6\u968F\u673A"],
    ["thinkIdle", "\u601D\u8003\u65F6\u968F\u673A"]
  ];
  var EVENT_GROUPS = [
    ["credited", "\u5230\u8D26"],
    ["peakTime", "\u5CF0\u65F6"],
    ["valleyTime", "\u8C37\u65F6"],
    ["lowBalance", "\u4F59\u989D\u4E0D\u8DB3"],
    ["turnInterrupted", "\u5BF9\u8BDD\u4E2D\u65AD"],
    ["error", "\u51FA\u9519"],
    ["toolSuccess", "\u5DE5\u5177\u6210\u529F"],
    ["turnEnd", "\u672C\u8F6E\u7ED3\u675F"]
  ];
  var INTERACT_GROUPS = [
    ["interact", "\u901A\u7528\u6C60"],
    ["interactIdle", "\u95F2\u65F6\u4EA4\u4E92"],
    ["interactSadIdle", "\u60B2\u4F24\u65F6\u4EA4\u4E92"],
    ["interactThinkIdle", "\u601D\u8003\u65F6\u4EA4\u4E92"]
  ];
  function makeSettingsSection(React) {
    const h = React.createElement;
    function Field(props) {
      return h(
        "label",
        { style: { display: "flex", alignItems: "center", gap: 12, margin: "10px 0" } },
        h("span", { style: { width: 150, color: C.dim } }, props.label),
        h("input", {
          type: "number",
          value: props.value,
          min: props.min,
          step: props.step || 1,
          onChange: (e) => props.onChange(Number(e.target.value)),
          style: Object.assign({ width: 140, fontFamily: FONT_MONO }, INPUT_STYLE)
        }),
        props.hint ? h("span", { style: { fontSize: 12, color: C.dim } }, props.hint) : null
      );
    }
    function ListEditor(props) {
      const list = Array.isArray(props.value) ? props.value : [];
      const update = (next) => props.onChange(next);
      return h(
        "div",
        { style: { margin: "14px 0 18px" } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } },
          h("strong", { style: { fontWeight: 500, color: C.text } }, props.title),
          h("button", {
            type: "button",
            onClick: () => update(list.concat("")),
            style: GHOST_BUTTON
          }, "+")
        ),
        list.length === 0 ? h("div", { style: { fontSize: 12, color: C.dim } }, "\u7A7A\uFF0C\u4E0D\u663E\u793A\u901A\u77E5") : null,
        list.map((text, i) => h(
          "div",
          { key: i, style: { display: "flex", gap: 6, marginBottom: 4 } },
          h("input", {
            value: text,
            placeholder: "\u8F93\u5165\u4E00\u6761\u5BF9\u8BDD",
            onChange: (e) => {
              const next = list.slice();
              next[i] = e.target.value;
              update(next);
            },
            style: Object.assign({ flex: 1 }, INPUT_STYLE)
          }),
          h("button", {
            type: "button",
            onClick: () => update(list.filter((_, j) => j !== i)),
            style: GHOST_BUTTON
          }, "\u2212")
        ))
      );
    }
    return function SettingsSection({ close }) {
      const api = window.__dshNascencePet;
      const [settings2, setSettings] = React.useState(function() {
        const base = api && api.settings ? api.settings : {};
        return Object.assign({}, SETTINGS_DEFAULTS, base, {
          dialogues: Object.assign({}, dialogues_default, base.dialogues || {})
        });
      });
      if (React.useEffect) {
        React.useEffect(function() {
          let alive = true;
          Promise.all([
            fetch(PREFIX + "/config", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
            fetch(PREFIX + "/assets/src/config/dialogues.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null)
          ]).then(([cfg, file]) => {
            if (!alive) return;
            const host = cfg && cfg.settings || {};
            const dialogues = Object.assign({}, dialogues_default, file || {}, host.dialogues || {});
            setSettings(Object.assign({}, SETTINGS_DEFAULTS, host, {
              dialogues
            }));
          });
          return function() {
            alive = false;
          };
        }, []);
      }
      function patch(next) {
        setSettings(Object.assign({}, settings2, next));
        if (api && api.setSettings) {
          api.setSettings(next, false);
        }
        fetch(PREFIX + "/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: next })
        }).catch(function() {
        });
      }
      function patchDialogue(key, value) {
        const dialogues = Object.assign({}, settings2.dialogues || {});
        dialogues[key] = value;
        patch({ dialogues });
      }
      if (!api) {
        return h("div", { style: { padding: 24, opacity: 0.7 } }, "\u684C\u5BA0\u8FD8\u5728\u542F\u52A8\uFF0C\u8BF7\u7A0D\u540E\u518D\u6253\u5F00\u8BBE\u7F6E\u3002");
      }
      return h(
        "div",
        { style: { padding: "8px 4px 32px", maxWidth: 720, fontFamily: FONT_SANS, color: C.text } },
        h("div", { style: KICKER }, "Timeless Nascence"),
        h("h2", { style: { margin: "4px 0 4px", fontSize: 18, fontWeight: 500 } }, "Nascence \u684C\u5BA0"),
        h("p", { style: { margin: "0 0 18px", color: C.dim, fontSize: 13 } }, "\u4F4E\u9891\u914D\u7F6E\u3002\u5927\u5C0F\u3001\u900F\u660E\u5EA6\u3001\u6C14\u6CE1\u6837\u5F0F\u4E0E\u50CF\u7D20\u5B57\u4F53\u4ECD\u5728\u53F3\u952E\u9762\u677F\u91CC\u3002"),
        h(
          "div",
          { style: { padding: "6px 16px", border: "1px solid " + C.hairline, borderRadius: CARD_RADIUS, background: C.card } },
          h(Field, {
            label: "\u4F59\u989D\u4E0D\u8DB3\u9608\u503C",
            value: settings2.lowThreshold === void 0 ? SETTINGS_DEFAULTS.lowThreshold : settings2.lowThreshold,
            min: 0,
            step: 1,
            onChange: (v) => patch({ lowThreshold: v }),
            hint: "\u5143"
          }),
          h(Field, {
            label: "\u95F2\u65F6\u5BF9\u8BDD\u95F4\u9694",
            value: settings2.idleChatterMinutes === void 0 ? SETTINGS_DEFAULTS.idleChatterMinutes : settings2.idleChatterMinutes,
            min: 0,
            step: 1,
            onChange: (v) => patch({ idleChatterMinutes: v }),
            hint: "\u5206\u949F\uFF1B0 = \u5173\u95ED"
          }),
          h(Field, {
            label: "\u95F2\u65F6\u5BF9\u8BDD\u89E6\u53D1\u6982\u7387",
            value: Math.round((settings2.idleChatterChance === void 0 ? SETTINGS_DEFAULTS.idleChatterChance : settings2.idleChatterChance) * 100),
            min: 0,
            step: 5,
            onChange: (v) => patch({ idleChatterChance: Math.min(1, Math.max(0, v / 100)) }),
            hint: "%"
          })
        ),
        SectionTitle(h, "Idle", "\u95F2\u65F6\u5BF9\u8BDD\u6C60"),
        STATE_GROUPS.map(([key, title]) => h(ListEditor, {
          key,
          title,
          value: settings2.dialogues && settings2.dialogues[key] || [],
          onChange: (v) => patchDialogue(key, v)
        })),
        SectionTitle(h, "Interact", "\u70B9\u51FB\u4EA4\u4E92\u5BF9\u8BDD\u6C60"),
        h("p", { style: { margin: "0 0 8px", color: C.dim, fontSize: 12 } }, "\u6BCF\u6B21\u70B9\u51FB\u4ECE\u300C\u901A\u7528\u6C60 + \u5F53\u524D\u72B6\u6001\u6C60\u300D\u4E2D\u62BD\u53D6\uFF1B\u4E09\u79CD\u72B6\u6001\u5404\u6709\u4E00\u4EFD\u72EC\u7ACB\u7684\u95F2\u65F6\u5BF9\u8BDD\u6C60\u3002"),
        INTERACT_GROUPS.map(([key, title]) => h(ListEditor, {
          key,
          title,
          value: settings2.dialogues && settings2.dialogues[key] || [],
          onChange: (v) => patchDialogue(key, v)
        })),
        SectionTitle(h, "Events", "\u7279\u6B8A\u4E8B\u4EF6\u5BF9\u8BDD\u6C60"),
        EVENT_GROUPS.map(([key, title]) => h(ListEditor, {
          key,
          title,
          value: settings2.dialogues && settings2.dialogues[key] || [],
          onChange: (v) => patchDialogue(key, v)
        })),
        h(
          "div",
          { style: { marginTop: 24 } },
          h("button", {
            type: "button",
            onClick: close,
            style: Object.assign({}, GHOST_BUTTON, { padding: "7px 18px" })
          }, "\u5173\u95ED")
        )
      );
    };
  }

  // assets/src/client-entry.js
  function makeFactory() {
    return function factory(require2) {
      var React = require2("react");
      var current2 = null;
      function PetLayer() {
        var ref = React.useRef(null);
        React.useEffect(function() {
          var node = ref.current;
          if (!node) return;
          var mountEl = document.createElement("div");
          mountEl.id = "dsh-nascence-pet-mount";
          mountEl.style.cssText = "display:contents";
          node.appendChild(mountEl);
          current2 = startPet(mountEl);
          return function() {
            var dispose = current2;
            current2 = null;
            if (typeof dispose === "function") {
              try {
                dispose();
              } catch (err) {
              }
            }
            if (mountEl.parentNode) mountEl.parentNode.removeChild(mountEl);
          };
        }, []);
        return React.createElement("div", {
          ref,
          style: { position: "fixed", left: 0, top: 0, width: 0, height: 0, overflow: "visible", pointerEvents: "none" }
        });
      }
      const SettingsSection = makeSettingsSection(React);
      return {
        inject: ["slots"],
        apply(ctx) {
          ctx.slots.inject("shell.overlay", function() {
            return ctx.slots.register({
              name: "shell.overlay",
              id: "dsh-nascence-pet",
              order: 100
            }, PetLayer);
          });
          ctx.slots.inject("settings.section", function() {
            return ctx.slots.register({
              name: "settings.section",
              id: "dsh-nascence-pet",
              order: 50,
              label: "Nascence \u684C\u5BA0"
            }, SettingsSection);
          });
        }
      };
    };
  }
  window.__ModuleLoader__.load({
    id: "dsh-nascence-pet",
    factory: makeFactory()
  });
})();
