// 효과음은 오디오 파일 없이 Web Audio로 직접 합성합니다.
// (모바일 브라우저는 사용자가 화면을 터치한 뒤에만 소리를 낼 수 있어요)
window.Sound = (() => {
  let ctx = null;
  let master = null;
  let noise = null;
  let muted = false;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state !== "running") ctx.resume();
    return ctx;
  }

  // 아이폰은 무음(진동) 모드면 웹 소리를 꺼버려서, '음악 재생' 모드로 바꿔 무음 스위치와 상관없이 들리게 함.
  // iOS 17+ 는 audioSession, 그 이전 버전은 소리 없는 오디오를 반복 재생하는 방법으로 처리
  let silentEl = null;
  function playbackMode() {
    if (navigator.audioSession) {
      try { navigator.audioSession.type = "playback"; } catch {}
      return;
    }
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) return;
    if (!silentEl) {
      const n = 4000; // 0.5초 무음 (8kHz, 8bit)
      const b = new Uint8Array(44 + n);
      const v = new DataView(b.buffer);
      const str = (o, s) => [...s].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
      str(0, "RIFF"); v.setUint32(4, 36 + n, true); str(8, "WAVEfmt ");
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
      str(36, "data"); v.setUint32(40, n, true); b.fill(128, 44);
      silentEl = new Audio(URL.createObjectURL(new Blob([b], { type: "audio/wav" })));
      silentEl.loop = true;
      silentEl.setAttribute("playsinline", "");
    }
    silentEl.play().catch(() => {});
  }

  // 종소리 음색 (오르골/벨)
  function bell(freq, t, dur = 1.2, vol = 0.18, out = master) {
    const partials = [[1, 1], [2.76, 0.35], [5.4, 0.12]];
    partials.forEach(([mul, amp]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq * mul;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * amp, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / mul ** 0.5);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  function noiseHit(t, dur, freq, q, vol, type = "bandpass", out = master) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // 썰매 방울 (상자 흔들 때)
  function sleigh(t, count = 9) {
    for (let i = 0; i < count; i++) {
      const tt = t + i * 0.075 + Math.random() * 0.02;
      noiseHit(tt, 0.09, 7000 + Math.random() * 2500, 6, 0.35);
      bell(2600 + Math.random() * 1400, tt, 0.25, 0.03);
    }
  }

  // 상자 열릴 때 '펑' + 반짝
  function pop(t) {
    noiseHit(t, 0.35, 1800, 0.7, 0.6, "lowpass");
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.4);
  }

  function sparkle(t) {
    [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => bell(f, t + i * 0.06, 1.1, 0.09));
  }

  // 여는 순간의 긴장감 BGM: peak(실링이 떨어지는 순간)까지 점점 고조되고,
  // 그 뒤 dur까지 잦아들며 조용히 끝남 (터지는 소리 없음)
  function suspense(t, peak, dur) {
    // 낮게 깔리는 드론
    const dr = ctx.createOscillator();
    const dg = ctx.createGain();
    dr.type = "triangle";
    dr.frequency.value = 55;
    dg.gain.setValueAtTime(0.0001, t);
    dg.gain.exponentialRampToValueAtTime(0.12, t + peak * 0.6);
    dg.gain.setValueAtTime(0.12, t + peak);
    dg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    dr.connect(dg).connect(master);
    dr.start(t);
    dr.stop(t + dur + 0.05);
    // 드럼롤: peak까지 빨라지고 커졌다가, 이후엔 느려지며 작아짐
    let tt = t;
    while (tt < t + dur) {
      const up = tt < t + peak;
      const p = up ? (tt - t) / peak : 1 - (tt - t - peak) / (dur - peak);
      noiseHit(tt, 0.07, 1500 + p * 1500, 1.2, up ? 0.08 + p * 0.3 : 0.02 + p * 0.14);
      if (Math.random() < 0.25 + p * 0.5) noiseHit(tt, 0.06, 7500, 6, 0.04 + p * 0.13);
      tt += 0.2 - p * 0.16;
    }
    // 심장 박동 (고조되기 전 절반)
    for (let k = 0; k < peak * 0.5; k += 0.55) {
      [0, 0.16].forEach((off, j) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(70, t + k + off);
        o.frequency.exponentialRampToValueAtTime(40, t + k + off + 0.15);
        g.gain.setValueAtTime(j ? 0.25 : 0.4, t + k + off);
        g.gain.exponentialRampToValueAtTime(0.0001, t + k + off + 0.18);
        o.connect(g).connect(master);
        o.start(t + k + off);
        o.stop(t + k + off + 0.2);
      });
    }
    // 올라가는 소리 (라이저)
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(880, t + peak);
    f.type = "lowpass";
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(5000, t + peak);
    f.frequency.exponentialRampToValueAtTime(400, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + peak);
    g.gain.exponentialRampToValueAtTime(0.0001, t + peak + 0.25);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.1);
    grand(t + peak, dur - peak);
  }

  // 실링이 떨어지는 순간의 웅장한 화음: 팀파니 + 현악 같은 화음 + 반짝임
  function grand(t, len) {
    const tp = ctx.createOscillator();
    const tg = ctx.createGain();
    tp.frequency.setValueAtTime(120, t);
    tp.frequency.exponentialRampToValueAtTime(46, t + 0.5);
    tg.gain.setValueAtTime(0.75, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    tp.connect(tg).connect(master);
    tp.start(t);
    tp.stop(t + 1.2);
    noiseHit(t, 0.45, 900, 0.6, 0.45, "lowpass");
    ["D3", "A3", "D4", "F#4", "A4", "D5", "F#5", "A5"].forEach((n, i) => {
      [-5, 5].forEach((cents) => {
        const o = ctx.createOscillator();
        const f = ctx.createBiquadFilter();
        const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = hz(n);
        o.detune.value = cents;
        f.type = "lowpass";
        f.frequency.setValueAtTime(3200, t);
        f.frequency.exponentialRampToValueAtTime(700, t + len);
        const vol = i < 3 ? 0.05 : 0.032;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.07);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(f).connect(g).connect(master);
        o.start(t);
        o.stop(t + len + 0.05);
      });
    });
    noiseHit(t, len, 7000, 0.5, 0.14, "highpass");
    sparkle(t + 0.12);
  }

  // 2안: 하프 + 종소리, 설레고 사랑스러운 느낌
  function openHarp(t, peak, dur) {
    for (let k = 0; k < peak; k += Math.max(0.28, 0.62 - (k / peak) * 0.34)) {
      [0, 0.15].forEach((off, j) => pluck(j ? 58 : 66, t + k + off, 0.2, j ? 0.26 : 0.36, "sine", master, 300));
    }
    const up = ["D4", "F#4", "A4", "D5", "F#5", "A5", "D6", "F#6", "A6", "D7"];
    up.forEach((n, i) => {
      const at = t + peak * 0.45 + (peak * 0.55 * i) / up.length;
      pluck(hz(n), at, 1.2, 0.05 + i * 0.008, "triangle", master, 4000);
    });
    ["D5", "F#5", "A5", "D6"].forEach((n, i) => bell(hz(n), t + peak + i * 0.05, dur - peak, 0.13));
    sparkle(t + peak + 0.2);
  }

  // 3안: 드럼롤 + 금관 팬파레, 축하하는 느낌
  function openFanfare(t, peak, dur) {
    let tt = t;
    while (tt < t + peak) {
      const p = (tt - t) / peak;
      noiseHit(tt, 0.06, 2600, 1, 0.07 + p * 0.34);
      tt += 0.13 - p * 0.085;
    }
    const brass = (n, at, len, vol) => {
      [-6, 6].forEach((cents) => {
        const o = ctx.createOscillator();
        const f = ctx.createBiquadFilter();
        const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = hz(n);
        o.detune.value = cents;
        f.type = "lowpass";
        f.frequency.setValueAtTime(900, at);
        f.frequency.exponentialRampToValueAtTime(3200, at + 0.07);
        f.frequency.exponentialRampToValueAtTime(1200, at + len);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(vol, at + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, at + len);
        o.connect(f).connect(g).connect(master);
        o.start(at);
        o.stop(at + len + 0.05);
      });
    };
    const p = t + peak;
    [["D4", 0], ["D4", 0.16], ["D4", 0.32]].forEach(([n, off]) => {
      brass(n, p + off, 0.14, 0.09);
      brass("A4", p + off, 0.14, 0.07);
    });
    ["D4", "A4", "D5", "F#5", "A5"].forEach((n) => brass(n, p + 0.5, Math.max(0.6, dur - peak - 0.5), 0.07));
    noiseHit(p + 0.5, Math.max(0.6, dur - peak - 0.5), 6500, 0.5, 0.22, "highpass");
    pluck(90, p + 0.5, 0.7, 0.6, "sine", master, 400);
  }

  // 4안: 반짝임이 차오르는 신비로운 느낌
  function openMagic(t, peak, dur) {
    const scale = ["A4", "B4", "D5", "E5", "F#5", "A5", "B5", "D6", "E6", "F#6", "A6"];
    let k = 0;
    let i = 0;
    while (k < peak) {
      bell(hz(scale[i % scale.length]), t + k, 1, 0.05 + (k / peak) * 0.07);
      k += Math.max(0.09, 0.34 - (k / peak) * 0.27);
      i++;
    }
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = hz("D3");
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + peak);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
    ["D4", "A4", "D5", "F#5", "A5", "D6"].forEach((n, j) => bell(hz(n), t + peak + j * 0.02, dur - peak, 0.11));
    noiseHit(t + peak, dur - peak, 8000, 0.5, 0.13, "highpass");
    sparkle(t + peak + 0.1);
  }

  const OPENINGS = {
    orchestra: { name: "웅장한 오케스트라", play: suspense },
    harp: { name: "설레는 하프", play: openHarp },
    fanfare: { name: "축하 팡파르", play: openFanfare },
    magic: { name: "반짝이는 마법", play: openMagic },
  };
  let opening = OPENINGS.orchestra;

  // 음이름 → 주파수 ("F#4" 같은 형식)
  function hz(n) {
    const pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[n[0]] + (n[1] === "#" ? 1 : 0);
    return 440 * 2 ** ((pc + (+n[n.length - 1] + 1) * 12 - 69) / 12);
  }
  const N = { G5: hz("G5"), C6: hz("C6") };

  // ------------------------------------------------------------ 배경음악
  // 멜로디 표기: "음이름:박자", R은 쉼표. 곡은 전부 Public domain이거나 직접 작곡
  const score = (text) => {
    let at = 0;
    const out = [];
    text.trim().split(/\s+/).forEach((tok) => {
      const [n, len] = tok.split(":");
      if (n !== "R") out.push({ at, f: hz(n) });
      at += +len;
    });
    return out;
  };
  const CHORD = {
    C: ["C4", "E4", "G4"], D: ["D4", "F#4", "A4"], Dm: ["D4", "F4", "A4"], E: ["E4", "G#4", "B4"], Em: ["E4", "G4", "B4"],
    F: ["C4", "F4", "A4"], G: ["D4", "G4", "B4"], G7: ["D4", "F4", "G4"], A: ["C#4", "E4", "A4"], Am: ["C4", "E4", "A4"],
    Bm: ["D4", "F#4", "B4"], "F#m": ["C#4", "F#4", "A4"], Gmaj7: ["D4", "F#4", "B4"], Dmaj7: ["C#4", "F#4", "A4"],
  };
  const ROOT = {
    C: "C3", D: "D3", Dm: "D3", E: "E3", Em: "E3", F: "F2", G: "G2", G7: "G2", A: "A2", Am: "A2",
    Bm: "B2", "F#m": "F#2", Gmaj7: "G2", Dmaj7: "D3",
  };

  // 부드러운 피아노 음색
  function piano(freq, t, dur, vol, out) {
    pluck(freq, t, dur, vol, "triangle", out, 2400);
    pluck(freq * 2, t, dur * 0.6, vol * 0.3, "sine", out, 3000);
  }
  // 줄을 튕기는 음색 (우쿨렐레 느낌)
  function uke(freq, t, vol, out) {
    pluck(freq, t, 0.32, vol, "triangle", out, 2600);
    pluck(freq * 2, t, 0.14, vol * 0.4, "square", out, 2200);
  }

  const TRACKS = {
    // 1안: 파헬벨 캐논, 오르골 + 분산화음
    canon: {
      name: "캐논 오르골", beat: 0.48, meter: 4,
      bars: "D A Bm F#m G D G A D A Bm F#m G D G A",
      song: "F#5:4 E5:4 D5:4 C#5:4 B4:4 A4:4 B4:4 C#5:4 D5:1 F#5:1 A5:1 G5:1 F#5:1 D5:1 F#5:1 E5:1 D5:1 B4:1 D5:1 A5:1 G5:1 B5:1 A5:1 G5:1 F#5:1 D5:1 E5:1 C#6:1 D6:1 F#6:1 A6:1 A5:1 B5:1 G5:1 A5:1 F#5:1 D5:1 D6:1 C#6:2",
      note: (f, t, out) => bell(f, t, 1.3, 0.1, out),
      backing(chord, pos, t, out, beat) {
        const root = hz(ROOT[chord]);
        if (pos === 0) pluck(root, t, 0.8, 0.18, "sine", out, 600);
        if (pos === 2) pluck(root * 1.5, t, 0.7, 0.13, "sine", out, 600);
        const n = CHORD[chord];
        pluck(hz(n[pos % 3]), t, 0.4, 0.04, "triangle", out, 1800);
        pluck(hz(n[(pos + 1) % 3]), t + beat / 2, 0.4, 0.03, "triangle", out, 1800);
      },
    },
    // 2안: 바흐 미뉴에트 G장조, 경쾌한 3박자 오르골
    minuet: {
      name: "미뉴에트 오르골", beat: 0.4, meter: 3,
      bars: "G G C G C G D D G G C G C G D G",
      song: "D5:1 G4:.5 A4:.5 B4:.5 C5:.5 D5:1 G4:1 G4:1 E5:1 C5:.5 D5:.5 E5:.5 F#5:.5 G5:1 G4:1 G4:1 C5:1 D5:.5 C5:.5 B4:.5 A4:.5 B4:1 C5:.5 B4:.5 A4:.5 G4:.5 F#4:1 G4:.5 A4:.5 B4:.5 G4:.5 A4:3 D5:1 G4:.5 A4:.5 B4:.5 C5:.5 D5:1 G4:1 G4:1 E5:1 C5:.5 D5:.5 E5:.5 F#5:.5 G5:1 G4:1 G4:1 C5:1 D5:.5 C5:.5 B4:.5 A4:.5 B4:1 C5:.5 B4:.5 A4:.5 G4:.5 A4:1 B4:.5 A4:.5 G4:.5 F#4:.5 G4:3",
      note: (f, t, out) => bell(f, t, 1, 0.11, out),
      backing(chord, pos, t, out) {
        if (pos === 0) pluck(hz(ROOT[chord]), t, 0.7, 0.17, "sine", out, 700);
        else CHORD[chord].forEach((n) => pluck(hz(n), t, 0.28, 0.03, "triangle", out, 1800));
      },
    },
    // 3안: 사티 짐노페디 1번, 잔잔한 피아노
    gymnopedie: {
      name: "잔잔한 피아노", beat: 0.66, meter: 3,
      bars: "Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7",
      song: "R:12 R:1 F#5:1 A5:1 G5:1 F#5:1 C#5:1 B4:1 C#5:1 D5:1 A4:3 R:1 F#5:1 A5:1 G5:1 F#5:1 C#5:1 B4:1 C#5:1 D5:1 A4:3",
      note: (f, t, out) => piano(f, t, 2.2, 0.24, out),
      backing(chord, pos, t, out) {
        if (pos === 0) piano(hz(ROOT[chord]), t, 2, 0.22, out);
        if (pos === 1) CHORD[chord].forEach((n) => piano(hz(n), t, 1.5, 0.085, out));
      },
    },
    // 4안: 직접 작곡한 밝은 우쿨렐레풍 곡
    ukulele: {
      name: "통통 우쿨렐레", beat: 0.36, meter: 4,
      bars: "C G F G C G F C",
      song: "E5:.5 G5:.5 A5:1 G5:.5 E5:.5 C5:1 D5:.5 E5:.5 G5:1 E5:2 F5:.5 A5:.5 C6:1 A5:.5 F5:.5 D5:1 E5:.5 F5:.5 G5:1 R:2 E5:.5 G5:.5 A5:1 G5:.5 E5:.5 C5:1 D5:.5 E5:.5 F5:1 D5:2 E5:.5 G5:.5 C6:1 B5:.5 A5:.5 G5:1 F5:.5 D5:.5 C5:3",
      note: (f, t, out) => uke(f, t, 0.13, out),
      backing(chord, pos, t, out, beat) {
        if (pos === 0 || pos === 2) pluck(hz(ROOT[chord]), t, 0.32, 0.17, "sine", out, 500);
        // 스트럼: 쿵-짝-쿵-짝
        CHORD[chord].forEach((n, k) => {
          uke(hz(n), t + k * 0.012, 0.045, out);
          uke(hz(n), t + beat / 2 + k * 0.012, 0.03, out);
        });
        if (pos % 2 === 1) noiseHit(t, 0.06, 5200, 1, 0.1, "bandpass", out);
      },
    },
  };
  Object.values(TRACKS).forEach((tr) => {
    tr.events = score(tr.song);
    tr.beats = tr.bars.split(" ").length * tr.meter;
    tr.chords = tr.bars.split(" ");
  });
  let track = TRACKS.canon;

  function pluck(freq, t, dur, vol, type, out, cutoff = 2000) {
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    f.type = "lowpass";
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function playBeat(tr, i, t, out) {
    const chord = tr.chords[Math.floor(i / tr.meter)];
    tr.events.forEach((ev) => {
      if (ev.at >= i && ev.at < i + 1) tr.note(ev.f, t + (ev.at - i) * tr.beat, out);
    });
    tr.backing(chord, i % tr.meter, t, out, tr.beat);
  }

  let bgm = null;
  function startBgm(fadeIn = 1.2) {
    if (!ac() || bgm) return;
    playbackMode();
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + fadeIn);
    out.connect(master);
    bgm = { out, t: ctx.currentTime + 0.1, i: 0, tr: track };
    const tick = () => {
      while (bgm && bgm.t < ctx.currentTime + 1) {
        playBeat(bgm.tr, bgm.i, bgm.t, bgm.out);
        bgm.t += bgm.tr.beat;
        bgm.i = (bgm.i + 1) % bgm.tr.beats;
      }
    };
    tick();
    bgm.timer = setInterval(tick, 250);
  }
  // 바로 꺼짐 (이미 예약된 음도 함께 묵음)
  function stopBgm() {
    if (silentEl && document.hidden) silentEl.pause();
    if (!bgm) return;
    const { out, timer } = bgm;
    bgm = null;
    clearInterval(timer);
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
    setTimeout(() => out.disconnect(), 70);
  }

  return {
    unlock() { playbackMode(); ac(); },
    tap() { if (!ac()) return; bell(1568, ctx.currentTime, 0.4, 0.07); },
    jingle() { if (!ac()) return; sleigh(ctx.currentTime, 5); },
    // 종이가 스치는 소리 (편지를 꺼내거나 넣을 때)
    paper() {
      if (!ac()) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 6; i++) noiseHit(t + i * 0.07 + Math.random() * 0.03, 0.12, 2200 + Math.random() * 2500, 0.9, 0.12);
    },
    suspense(peak, dur) { if (!ac()) return; opening.play(ctx.currentTime + 0.09, peak, dur); },
    setTrack(id) { if (TRACKS[id]) track = TRACKS[id]; },
    setOpening(id) { if (OPENINGS[id]) opening = OPENINGS[id]; },
    open() {
      if (!ac()) return;
      const t = ctx.currentTime;
      pop(t);
      noiseHit(t, 1.6, 6000, 0.5, 0.25, "highpass"); // 심벌
      sparkle(t + 0.08);
    },
    chime() { if (!ac()) return; const t = ctx.currentTime; [N.G5, N.C6].forEach((f, i) => bell(f, t + i * 0.12, 1.4, 0.12)); },
    startBgm,
    stopBgm,
    isBgmPlaying() { return !!bgm; },
    setMuted(m) {
      muted = m;
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
    },
    isMuted() { return muted; },
  };
})();
