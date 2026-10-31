(() => {
  const C = window.SITE_CONFIG;
  const $ = (id) => document.getElementById(id);

  // 편지지 (힉스필드로 만든 이미지: assets/paper-<id>.webp)
  const PAPERS = [
    { id: "ribbon", name: "리본" },
    { id: "heart", name: "하트" },
    { id: "star", name: "별빛" },
    { id: "gift", name: "선물" },
  ];
  // 이전 버전에서 보낸 편지 링크의 편지지 이름
  const OLD_PAPERS = { holly: "ribbon", holy: "ribbon", snow: "star", plaid: "gift", check: "gift", gold: "heart", gemini: "star" };

  // '뭐라고 쓰지?' 예시: 받는 사람 유형별로 3개씩, 같은 버튼을 또 누르면 다음 문장
  const EXAMPLES = [
    { id: "friend", label: "💛 친구", who: "친한 친구", texts: [
      "올해도 내 옆에 있어줘서 고마워.\n너 없었으면 이번 학기 진짜 못 버텼다 😭\n앞으로도 잘 부탁해 🙌",
      "특별한 날은 아니지만\n너한테는 꼭 말하고 싶었어.\n항상 고맙고, 많이 아낀다 💛",
      "같이 웃고 떠든 시간이 다 좋은 추억이야.\n조만간 맛있는 거 먹으러 가자! 🍕",
    ] },
    { id: "classmate", label: "🎓 동기·팀플", who: "같은 과 동기", texts: [
      "이번 학기 팀플 하느라 진짜 고생 많았어.\n너랑 같은 팀이라 다행이었다 🙌\n종강까지 조금만 더 버티자!",
      "시험기간에 같이 밤새던 거 벌써 그립다(?)\n종강하면 무조건 한잔하자 🍻",
      "같은 수업 듣다가 친구가 돼서 좋아.\n다음 학기에도 시간표 맞춰보자 📚",
    ] },
    { id: "crush", label: "💕 설렘", who: "좋아하는 사람", texts: [
      "요즘 하루 중에 제일 좋은 시간이\n너랑 얘기하는 시간이야.\n오늘도 좋은 꿈 꿔 🌙",
      "올해 제일 잘한 일은 너를 만난 거야.\n앞으로도 내 옆에 있어줘 💕",
      "할 말이 있는데 말로는 못 하겠어서\n편지로 보내. 시간 되면 밥 먹자 💌",
    ] },
    { id: "family", label: "🏠 가족", who: "가족", texts: [
      "올 한 해도 고생 많으셨어요.\n표현은 잘 못하지만 항상 감사해요.\n사랑해요 ❤️",
      "늘 내 편이 되어줘서 고마워.\n이번 주말엔 집에 가서 같이 밥 먹자 🍚",
      "자주 연락 못 해서 미안해.\n그래도 항상 생각하고 있어.\n곧 보러 갈게 🏠",
    ] },
    { id: "senior", label: "🙇 선배·교수", who: "고마운 선배나 교수님", texts: [
      "한 해 동안 많이 챙겨주셔서 감사합니다.\n덕분에 많이 배우고 성장할 수 있었어요 😊",
      "선배 덕분에 학교생활이 훨씬 즐거웠어요!\n앞으로도 잘 부탁드립니다 🙇",
      "바쁘신 와중에도 늘 신경 써주셔서 감사했어요.\n남은 학기도 건강 잘 챙기세요 🍀",
    ] },
    { id: "fun", label: "😜 장난", who: "장난치기 좋은 친구", texts: [
      "이 편지가 선물이야. 다른 건 없어.\n마음만 받아 🎁",
      "밥 한 번 산다는 말 아직 유효하지?\n잊은 줄 알았지 🍗",
      "올해 내 웃음 지분의 절반은 너야.\n앞으로도 웃기게 살아줘 😂",
    ] },
  ];

  // ------------------------------------------------------------ 통계 (GA4)
  function initAnalytics() {
    if (!C.gaMeasurementId) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + C.gaMeasurementId;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    // 편지 내용이 담긴 주소의 # 뒷부분은 통계로 보내지 않음
    const page = location.origin + location.pathname;
    gtag("set", { page_location: page, page_referrer: document.referrer.split("#")[0] });
    gtag("config", C.gaMeasurementId, { page_location: page });
  }
  function track(name, params = {}) {
    if (window.gtag) window.gtag("event", name, params);
  }

  // ------------------------------------------------------------ 링크 인코딩
  // 편지 내용은 주소의 # 뒤에 담겨서 서버나 통계로 전송되지 않아요.
  function encode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    try {
      const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
      const obj = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
      if (!obj) return null;
      const to = obj.t ?? obj.to;
      const from = obj.f ?? obj.from;
      const msg = obj.m ?? obj.content;
      const paper = obj.p ?? obj.theme;
      if (typeof to !== "string" || typeof msg !== "string") return null;
      return {
        t: to.slice(0, 20),
        f: String(from || "").slice(0, 20),
        m: msg.slice(0, C.maxLetterLength),
        p: typeof paper === "string" ? paper : "",
      };
    } catch {
      return null;
    }
  }
  const baseUrl = () => location.origin + location.pathname;
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const paperOf = (id) => {
    if (PAPERS.some((p) => p.id === id)) return id;
    return OLD_PAPERS[id] || PAPERS[0].id;
  };

  // ------------------------------------------------------------ 공통 UI
  let toastTimer;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      ta.remove();
      return ok;
    }
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => (s.hidden = s.id !== id));
    window.scrollTo(0, 0);
    if (id === "screen-create") fitText($("hero-title"));
  }

  // 봉투 안쪽 구조 (뒷면 → 편지 → 앞주머니 → 뚜껑 → 실링)
  const ENV_HTML =
    '<span class="env-back"></span><span class="env-letter"></span>' +
    '<span class="env-front"><svg viewBox="0 0 300 192" preserveAspectRatio="none">' +
    '<path d="M0 6Q0 0 6 2L150 100L294 2Q300 0 300 6V186Q300 192 294 192H6Q0 192 0 186Z" style="fill:var(--env)"/>' +
    '<path d="M2 192L150 88L298 192Z" style="fill:var(--env-l)" filter="url(#es)"/></svg></span>' +
    '<span class="env-flap"><svg viewBox="0 0 300 119" preserveAspectRatio="none">' +
    '<path d="M0 4Q0 0 4 0H296Q300 0 300 4L156 115Q150 119 144 115Z" style="fill:var(--env-l)" filter="url(#es)"/></svg></span>' +
    '<img class="env-seal" src="assets/seal.webp" alt="">';
  function setupEnvelope(el, paper, extraClass) {
    el.innerHTML = ENV_HTML;
    el.dataset.paper = paper;
    el.className = el.className.replace(/\b(idle|charging|open|gone|sealing)\b/g, "").trim();
    if (extraClass) el.classList.add(extraClass);
  }

  // ------------------------------------------------------------ 편지 쓰기 화면
  let selectedPaper = PAPERS[0].id;

  function renderPaperGrid() {
    const grid = $("paper-grid");
    PAPERS.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "paper-opt";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", p.name);
      b.dataset.id = p.id;
      b.innerHTML = `<img src="assets/paper-${p.id}-thumb.webp" alt=""><span class="nm"></span>`;
      b.querySelector(".nm").textContent = p.name;
      b.addEventListener("click", () => {
        selectedPaper = p.id;
        updatePaperGrid();
      });
      grid.appendChild(b);
    });
    updatePaperGrid();
  }
  function updatePaperGrid() {
    document.querySelectorAll(".paper-opt").forEach((b) =>
      b.setAttribute("aria-checked", String(b.dataset.id === selectedPaper))
    );
    $("hero-env").dataset.paper = selectedPaper;
  }

  let activeExample = null;
  const exampleIndex = {};
  let filledByExample = "";

  function renderChips() {
    const wrap = $("chips");
    EXAMPLES.forEach((ex) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.id = ex.id;
      b.textContent = ex.label;
      b.addEventListener("click", () => useExample(ex));
      wrap.appendChild(b);
    });
  }

  function useExample(ex) {
    const msg = $("in-msg");
    // 직접 쓴 글이 있으면 덮어쓰기 전에 확인
    const typed = msg.value.trim() && msg.value !== filledByExample;
    if (typed && !confirm("지금 쓴 편지를 예시 문장으로 바꿀까요?")) return;
    const i = activeExample === ex.id ? ((exampleIndex[ex.id] ?? 0) + 1) % ex.texts.length : (exampleIndex[ex.id] ?? 0);
    exampleIndex[ex.id] = i;
    activeExample = ex.id;
    msg.value = filledByExample = ex.texts[i];
    msg.classList.remove("invalid");
    updateCounter();
    document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.dataset.id === ex.id));
    $("chips-hint").textContent = `${i + 1}/${ex.texts.length} · 한 번 더 누르면 다른 문장이 나와요 🎲`;
    track("use_example", { example: ex.id, index: i });
  }

  function updateCounter() {
    $("counter").textContent = `${$("in-msg").value.length}/${C.maxLetterLength}`;
  }

  async function askGemini() {
    const to = $("in-to").value.trim() || "친구";
    const ex = EXAMPLES.find((e) => e.id === activeExample);
    const prompt =
      `'${to}'에게 보낼 짧은 편지를 써줘. 마음을 선물하는 느낌으로. ` +
      (ex ? `받는 사람은 나의 ${ex.who}이야. ` : "") +
      `말투는 받는 사람에게 어울리게, 3~4문장, 200자 이내로. 이모지도 한두 개 넣어줘.`;
    // 팝업 차단을 피하려고 창을 먼저 연 뒤 복사
    const win = window.open("https://gemini.google.com/app", "_blank", "noopener");
    const ok = await copyText(prompt);
    toast(ok ? "부탁 문장을 복사했어요! Gemini에 붙여넣으면 편지를 써줘요 ✦" : "Gemini에게 편지를 부탁해 보세요 ✦");
    track("gemini_help_click", { opened: !!win });
  }

  function validate() {
    let ok = true;
    ["in-to", "in-from", "in-msg"].forEach((id) => {
      const el = $(id);
      const bad = !el.value.trim();
      el.classList.toggle("invalid", bad);
      if (bad && ok) { el.focus(); ok = false; }
    });
    return ok;
  }

  let lastShareUrl = "";
  let lastTo = "";

  function onSubmit(e) {
    e.preventDefault();
    Sound.unlock();
    if (!validate()) {
      toast("빈칸을 채워주세요 ✍️");
      return;
    }
    const data = {
      t: $("in-to").value.trim(),
      f: $("in-from").value.trim(),
      m: $("in-msg").value.trim().slice(0, C.maxLetterLength),
      p: selectedPaper,
    };
    lastTo = data.t;
    lastShareUrl = baseUrl() + "#g=" + encode(data);
    try { sessionStorage.setItem("lastCreated", lastShareUrl); } catch {}
    track("create_letter", { paper: data.p, length: data.m.length });

    $("done-to").textContent = data.t;
    $("share-url").value = lastShareUrl;
    // 편지가 봉투에 들어가고 실링이 찍히는 애니메이션
    setupEnvelope($("done-env"), data.p, "sealing");
    history.pushState(null, "", "#done");
    showScreen("screen-done");
  }

  function shareMessage(to) {
    return `💌 ${to}님에게 편지가 도착했어요! 봉투를 열어보세요 🎁`;
  }

  async function onShare() {
    const text = shareMessage(lastTo);
    if (navigator.share) {
      try {
        await navigator.share({ title: C.title, text, url: lastShareUrl });
        track("share_letter", { method: "native" });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    const ok = await copyText(`${text}\n${lastShareUrl}`);
    toast(ok ? "링크를 복사했어요! 카톡에 붙여넣어 보내세요 💌" : "링크를 길게 눌러 복사해주세요");
    track("share_letter", { method: "copy" });
  }

  async function onCopy() {
    const ok = await copyText(lastShareUrl);
    toast(ok ? "링크를 복사했어요! 💌" : "링크를 길게 눌러 복사해주세요");
    track("share_letter", { method: "copy_button" });
  }

  function resetForm(prefill = {}) {
    $("in-to").value = prefill.t || "";
    $("in-from").value = prefill.f || "";
    $("in-msg").value = filledByExample = "";
    activeExample = null;
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
    $("chips-hint").textContent = "";
    ["in-to", "in-from", "in-msg"].forEach((id) => $(id).classList.remove("invalid"));
    selectedPaper = PAPERS[0].id;
    updatePaperGrid();
    updateCounter();
  }

  // ------------------------------------------------------------ 받는 화면
  let current = null;
  let opened = false;

  // '○○님의 편지가 도착했어요'를 한 줄에 맞춤 (이름이 길면 글자를 줄임)
  function fitText(el) {
    el.style.fontSize = "";
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth && size > 14) el.style.fontSize = (size -= 1) + "px";
  }
  const fitTitle = () => fitText($("view-title"));

  // 편지를 펼친 뒤: 학생 혜택 카드가 화면 안에 다 들어오게 하되, 위쪽(로고·제목)은 최대한 남김
  function scrollToRead() {
    const cardBottom = $("signup").getBoundingClientRect().bottom + scrollY + 12;
    // 편지는 펼쳐지는 애니메이션 중이라 위치가 어긋나므로, 그 바로 위의 제목 기준으로 계산
    const letterTop = $("view-head").getBoundingClientRect().bottom + scrollY + 6;
    // 긴 편지는 첫 줄부터 읽도록 편지 위쪽을 넘어가지 않게
    const target = Math.max(0, Math.min(letterTop, cardBottom - innerHeight));
    scrollTo({ top: target, behavior: "smooth" });
    // 부드러운 스크롤이 동작하지 않는 브라우저에서도 카드가 보이게
    setTimeout(() => { if (Math.abs(scrollY - target) > 4) scrollTo(0, target); }, 800);
  }

  // ------------------------------------------------------------ 배경음악
  // 브라우저는 첫 터치 전에는 소리를 못 내서, 첫 터치 때 시작.
  // 봉투를 여는 순간엔 완전히 끄고(긴장감 효과음만), 편지가 펼쳐지면 다시 천천히 켬.
  let bgmHold = false;
  let bgmTimer = null;

  // 처음 들어왔을 때 한 번만: 탭하면 사라지고 음악 시작을 예약
  function showIntro() {
    const isView = !$("screen-view").hidden;
    if (!isView && $("screen-create").hidden) return; // 완료·오류 화면에선 생략
    const intro = $("intro");
    const title = $("intro-title");
    if (isView) {
      title.innerHTML = "<b></b>님의 편지가<br>도착했어요 💌";
      title.querySelector("b").textContent = current.f || "익명";
      $("intro-btn").textContent = "💌 편지 확인하기";
    } else {
      title.innerHTML = "말로 못 한 마음,<br>편지로 선물해 볼까? 🎁";
      $("intro-btn").textContent = "🎁 시작하기";
    }
    intro.hidden = false;
    bgmHold = true;
    intro.addEventListener("click", () => {
      Sound.unlock();
      // 화면이 나타난 뒤 1초 쉬었다가 음악을 서서히 시작
      bgmTimer = setTimeout(() => {
        bgmHold = false;
        maybeStartBgm(1.2);
      }, 1000);
      intro.classList.add("out");
      setTimeout(() => (intro.hidden = true), 450);
      track("intro_start", { screen: isView ? "view" : "create" });
    }, { once: true });
  }

  function maybeStartBgm(fadeIn) {
    if (bgmHold || Sound.isMuted() || document.hidden) return;
    // 봉투가 열리는 동안에는 꺼둠
    if (opened && !$("screen-view").hidden && !$("screen-view").classList.contains("is-read")) return;
    Sound.startBgm(fadeIn);
  }

  function showLetter(data) {
    current = data;
    opened = false;
    const paper = paperOf(data.p);
    const from = data.f || "익명";

    $("v-to").textContent = data.t;
    $("v-from").textContent = from;
    $("l-to").textContent = data.t;
    $("l-msg").textContent = data.m;
    $("l-from").textContent = from;
    $("letter-paper").dataset.paper = paper;

    const stage = $("view-stage");
    stage.classList.remove("opened-stage", "charging-stage", "read");
    $("screen-view").classList.remove("is-read");
    setupEnvelope($("v-env"), paper, "idle");
    const hint = $("tap-hint");
    hint.textContent = "봉투를 톡 눌러보세요 👆";
    hint.classList.remove("charging-hint");
    $("letter").hidden = true;
    $("cta").hidden = true;
    showScreen("screen-view");
    fitTitle();

    let preview = false;
    try { preview = sessionStorage.getItem("lastCreated") === location.href; } catch {}
    track("view_letter", { paper, preview });
  }

  const CHARGE_MS = 2800; // 열리기 전 두근두근 시간

  function openEnvelope() {
    if (opened) return;
    opened = true;
    clearTimeout(bgmTimer);
    bgmHold = false;
    Sound.stopBgm();
    const env = $("v-env");
    const stage = $("view-stage");
    const hint = $("tap-hint");
    hint.textContent = "두근두근…";
    hint.classList.add("charging-hint");
    env.classList.remove("idle");
    env.classList.add("charging");
    stage.classList.add("charging-stage");
    // 고조되다가 실링이 떨어질 때 정점, 편지가 펼쳐지기 전에 잦아듦
    Sound.suspense(CHARGE_MS / 1000, (CHARGE_MS + 2000) / 1000);
    if (navigator.vibrate) navigator.vibrate([20, 350, 20, 280, 30, 200, 40, 140, 50, 90, 70, 60, 200]);
    track("open_letter", { paper: paperOf(current.p) });

    setTimeout(() => {
      // 실링 톡 → 뚜껑 열림 → 편지가 올라옴
      hint.textContent = "";
      env.classList.remove("charging");
      env.classList.add("open");
      stage.classList.remove("charging-stage");
      stage.classList.add("opened-stage");
      flash();
      burst();
    }, CHARGE_MS);

    // 편지가 다 올라오면 봉투는 내려가고 편지를 크게 펼침
    setTimeout(() => env.classList.add("gone"), CHARGE_MS + 1800);
    setTimeout(() => {
      stage.classList.add("read");
      $("screen-view").classList.add("is-read");
      setTimeout(() => maybeStartBgm(2.5), 300);
      $("letter").hidden = false;
      $("cta").hidden = false;
      setTimeout(scrollToRead, 950);
      track("read_letter");
    }, CHARGE_MS + 2300);
  }

  function flash() {
    const el = $("flash");
    el.classList.remove("on");
    void el.offsetWidth;
    el.classList.add("on");
  }

  function burst() {
    if (!window.confetti) return;
    const colors = ["#f0645c", "#ff8f7f", "#ffd66b", "#ffb3c0", "#ffffff"];
    const rect = $("v-env").getBoundingClientRect();
    const y = (rect.top + rect.height * 0.4) / innerHeight;
    confetti({ particleCount: 170, spread: 110, startVelocity: 52, scalar: 1.1, origin: { x: 0.5, y }, colors, zIndex: 50 });
    setTimeout(() => {
      confetti({ particleCount: 70, angle: 60, spread: 70, startVelocity: 58, origin: { x: 0, y: 0.8 }, colors, zIndex: 50 });
      confetti({ particleCount: 70, angle: 120, spread: 70, startVelocity: 58, origin: { x: 1, y: 0.8 }, colors, zIndex: 50 });
    }, 220);
    setTimeout(() => {
      confetti({ particleCount: 60, spread: 160, startVelocity: 30, gravity: 0.7, origin: { x: 0.5, y: 0.25 }, colors, zIndex: 50 });
    }, 620);
  }

  function goCreate(prefill) {
    history.pushState(null, "", location.pathname + location.search);
    resetForm(prefill);
    showScreen("screen-create");
    if (prefill) setTimeout(() => $("in-msg").focus({ preventScroll: true }), 300);
    if (prefill) setTimeout(() => $("create-form").scrollIntoView({ behavior: "smooth" }), 80);
  }

  function onReply() {
    const anon = !current.f || current.f === "익명";
    track("reply_click");
    goCreate({ t: anon ? "" : current.f, f: current.t });
    toast("받는 사람/보내는 사람을 바꿔서 채웠어요 💌");
  }

  // ------------------------------------------------------------ 스토리 이미지
  function wrapLines(ctx, text, maxW) {
    const out = [];
    text.split("\n").forEach((para) => {
      let line = "";
      for (const ch of Array.from(para)) {
        if (ctx.measureText(line + ch).width > maxW && line) {
          // 가능하면 공백 기준으로 줄바꿈
          const cut = line.lastIndexOf(" ");
          if (cut > line.length * 0.5) {
            out.push(line.slice(0, cut));
            line = line.slice(cut + 1) + ch;
          } else {
            out.push(line);
            line = ch;
          }
        } else line += ch;
      }
      out.push(line);
    });
    return out;
  }

  async function makeStoryImage() {
    await Promise.all([
      document.fonts.load('400 52px "Gamja Flower"'),
      document.fonts.load('800 50px "Pretendard Variable"'),
    ]).catch(() => {});
    const W = 1080, H = 1920;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const x = cv.getContext("2d");
    const from = current.f || "익명";
    const UI = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", sans-serif';
    const HAND = '"Gamja Flower", cursive';

    const FG = cssVar("--fg");

    // 배경 (현재 테마 색)
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, cssVar("--st1"));
    bg.addColorStop(0.55, cssVar("--st2"));
    bg.addColorStop(1, cssVar("--st3"));
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);
    const art = await loadImg("assets/bg-mobile.webp").catch(() => null);
    if (art) {
      const s = Math.max(W / art.width, H / art.height);
      x.drawImage(art, (W - art.width * s) / 2, H - art.height * s, art.width * s, art.height * s);
    }

    // 상단 타이틀
    x.shadowColor = "rgba(255,255,255,.7)";
    x.shadowBlur = 12;
    x.textAlign = "center";
    x.fillStyle = FG;
    x.font = `800 64px ${UI}`;
    x.fillText(`${from}님의 편지 💌`, W / 2, 270);

    // 편지지 (3:4 비율 그대로)
    const pw = 860, ph = 1151, px = (W - pw) / 2, py = 370;
    const paper = await loadImg(`assets/paper-${paperOf(current.p)}.webp`).catch(() => null);
    x.shadowColor = "rgba(214,110,90,.45)";
    x.shadowBlur = 40;
    x.fillStyle = "#fffaf1";
    roundRect(x, px, py, pw, ph, 44);
    x.fill();
    x.shadowColor = "transparent";
    if (paper) {
      x.save();
      roundRect(x, px, py, pw, ph, 44);
      x.clip();
      x.drawImage(paper, px, py, pw, ph);
      x.restore();
    }
    x.shadowColor = "transparent";

    const inset = 90;
    const LAYOUT = { ribbon: [270, "center", 0], heart: [130, "right", 110], star: [375, "left", 0], gift: [320, "left", 0] };
    const [textTop, fromAlign, sideGap] = LAYOUT[paperOf(current.p)];
    x.textAlign = "left";
    x.fillStyle = "#4a2a26";
    x.font = `400 56px ${HAND}`;
    x.fillText(`To. ${current.t}`, px + inset, py + textTop);
    x.font = `400 50px ${HAND}`;
    const lh = 76;
    let lines = wrapLines(x, current.m, pw - inset * 2 - sideGap);
    const maxLines = Math.floor((ph - 270 - textTop) / lh);
    if (lines.length > maxLines) lines = lines.slice(0, maxLines).concat("…");
    lines.forEach((l, i) => x.fillText(l, px + inset, py + textTop + 100 + i * lh));
    x.textAlign = fromAlign;
    x.font = `400 56px ${HAND}`;
    x.fillText(`From. ${from}`, { left: px + inset, center: W / 2, right: px + pw - inset }[fromAlign], py + ph - 70);

    // 하단 안내 (그림 위에서도 읽히도록 둥근 띠 위에) + 학생 혜택 QR
    x.fillStyle = "rgba(255,253,249,.94)";
    roundRect(x, 90, H - 320, W - 180, 220, 40);
    x.fill();
    const qr = await loadImg("assets/qr-signup.svg").catch(() => null);
    const tx = qr ? 140 : W / 2;
    if (qr) {
      x.fillStyle = "#fff";
      roundRect(x, W - 90 - 200, H - 310, 190, 190, 22);
      x.fill();
      x.drawImage(qr, W - 90 - 190, H - 300, 170, 170);
    }
    x.textAlign = qr ? "left" : "center";
    x.fillStyle = "#4a2a26";
    x.font = `700 42px ${UI}`;
    x.fillText("너도 친구에게 편지 선물해봐 🎁", tx, H - 236);
    x.fillStyle = "#d94a4a";
    x.font = `800 46px ${UI}`;
    x.fillText("@" + C.instagramHandle, tx, H - 170);

    return new Promise((res) => cv.toBlob(res, "image/png"));
  }

  function loadImg(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function showStoryOverlay(url) {
    const box = document.createElement("div");
    box.className = "story-overlay";
    const hint = document.createElement("p");
    hint.textContent = "이미지를 길게 눌러 저장하세요 📸";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "인스타 스토리용 이미지";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn btn-soft";
    close.textContent = "닫기";
    close.addEventListener("click", () => { box.remove(); URL.revokeObjectURL(url); });
    box.append(hint, img, close);
    document.body.appendChild(box);
  }

  async function onStory() {
    toast("이미지를 만드는 중이에요… 🎨");
    const blob = await makeStoryImage();
    if (!blob) return toast("이미지를 만들지 못했어요 🥲");
    const file = new File([blob], "gemini-letter-gift.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: C.title });
        track("story_image", { method: "share" });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    if (/iPhone|iPad|iPod|KAKAOTALK|Instagram/i.test(navigator.userAgent)) {
      showStoryOverlay(url);
      track("story_image", { method: "long_press" });
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("이미지를 저장했어요! 스토리에 올리고 태그해 주세요 📸");
    track("story_image", { method: "download" });
  }

  // ------------------------------------------------------------ 천천히 떨어지는 색종이
  function paperFall() {
    const cv = $("paper-fall");
    const ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COLORS = ["#ff8f7f", "#ffc9b8", "#ffd66b", "#ffb3c0", "#ffffff"];
    let bits = [];
    let w, h, dpr;
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth;
      h = innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = reduce ? 0 : Math.min(36, Math.round((w * h) / 26000));
      bits = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 2.5 + Math.random() * 3,
        s: 0.25 + Math.random() * 0.5,
        d: Math.random() * Math.PI * 2,
        a: 0.45 + Math.random() * 0.4,
        c: COLORS[i % COLORS.length],
      }));
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const b of bits) {
        b.y += b.s;
        b.d += 0.012;
        b.x += Math.sin(b.d) * 0.35;
        if (b.y > h + 8) { b.y = -8; b.x = Math.random() * w; }
        ctx.globalAlpha = b.a;
        ctx.fillStyle = b.c;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) requestAnimationFrame(frame);
    }
    resize();
    addEventListener("resize", resize);
    frame();
  }

  // ------------------------------------------------------------ 라우팅
  function route() {
    const h = location.hash;
    if (h.startsWith("#g=")) {
      const data = decode(h.slice(3));
      return data ? showLetter(data) : showScreen("screen-broken");
    }
    if (h === "#done" && lastShareUrl) return showScreen("screen-done");
    showScreen("screen-create");
  }

  function init() {
    initAnalytics();
    const q = new URLSearchParams(location.search);
    Sound.setTrack(q.get("bgm") || C.bgmTrack);
    Sound.setOpening(q.get("open") || C.openSound);
    renderPaperGrid();
    setupEnvelope($("hero-env"), selectedPaper, "idle");
    renderChips();
    $("btn-student").textContent = C.studentButton;
    $("btn-student").href = C.signupUrl;
    $("btn-student").addEventListener("click", () => track("signup_click", { from: "form" }));
    updateCounter();
    $("in-msg").maxLength = C.maxLetterLength;
    $("foot-handle").textContent = C.instagramHandle;
    $("foot-insta").href = C.instagramUrl;
    $("foot-insta").addEventListener("click", () => track("instagram_click"));
    $("foot-team").textContent = C.teamName;
    $("foot-qr").href = C.signupUrl;
    $("foot-qr").addEventListener("click", () => track("signup_click", { from: "footer_qr" }));
    $("signup-head").textContent = C.signupHeadline;
    $("signup-body").textContent = C.signupBody;
    $("signup-link").textContent = C.signupButton;
    $("signup-link").href = C.signupUrl;

    $("create-form").addEventListener("submit", onSubmit);
    $("in-msg").addEventListener("input", updateCounter);
    ["in-to", "in-from", "in-msg"].forEach((id) =>
      $(id).addEventListener("input", () => $(id).classList.remove("invalid"))
    );
    $("btn-gemini").addEventListener("click", askGemini);
    $("btn-share").addEventListener("click", onShare);
    $("btn-copy").addEventListener("click", onCopy);
    $("btn-preview").addEventListener("click", () => { location.hash = lastShareUrl.split("#")[1]; });
    $("btn-again").addEventListener("click", () => goCreate());
    $("v-env").addEventListener("click", () => { Sound.unlock(); openEnvelope(); });
    $("btn-reply").addEventListener("click", onReply);
    $("btn-mine").addEventListener("click", () => { track("send_mine_click"); goCreate(); });
    $("btn-story").addEventListener("click", onStory);
    $("signup-link").addEventListener("click", () => track("signup_click"));
    $("sound-toggle").addEventListener("click", () => {
      const m = !Sound.isMuted();
      Sound.setMuted(m);
      if (m) Sound.stopBgm();
      else maybeStartBgm();
      $("sound-toggle").textContent = m ? "🔇" : "🔊";
      $("sound-toggle").setAttribute("aria-label", m ? "소리 켜기" : "소리 끄기");
    });

    addEventListener("popstate", route);
    const refit = () => { fitText($("hero-title")); if (current) fitTitle(); };
    addEventListener("resize", refit);
    document.fonts && document.fonts.ready.then(refit); // 웹폰트가 늦게 오면 글자 폭이 달라져서 다시 맞춤
    // 첫 터치 때 배경음악 시작 (봉투를 누르는 터치는 제외: 그땐 긴장감 효과음이 먼저).
    // 폰은 손가락을 '뗄 때'(touchend/click)만 소리를 허용해서, 누를 때·뗄 때 모두 시도함
    const firstTouch = () => { Sound.unlock(); maybeStartBgm(0.4); };
    ["pointerdown", "pointerup", "touchend", "click", "keydown"].forEach((ev) =>
      addEventListener(ev, firstTouch, true)
    );
    // 다른 앱/탭으로 가면 멈추고, 돌아오면 다시
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) Sound.stopBgm();
      else if (Sound.isBgmPlaying() === false) maybeStartBgm();
    });
    route();
    showIntro();
    paperFall();
  }

  init();
})();
