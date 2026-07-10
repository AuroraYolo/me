const navLinks = Array.from(document.querySelectorAll(".nav-links a"));

const setActive = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
  });
};

const sections = Array.from(document.querySelectorAll(".one-page > section[id]"));

const updateActiveSection = () => {
  const marker = window.innerHeight * 0.42;
  const current = sections.reduce((active, section) => {
    return section.getBoundingClientRect().top <= marker ? section : active;
  }, sections[0]);
  if (current?.id) {
    setActive(current.id);
    document.body.dataset.section = current.id;
  }
};

window.addEventListener("scroll", updateActiveSection, { passive: true });
window.addEventListener("resize", updateActiveSection);
window.addEventListener("hashchange", updateActiveSection);
requestAnimationFrame(updateActiveSection);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const runHeroParticleIntro = () => {
  const art = document.querySelector(".hero-art");
  const img = art?.querySelector("img");
  if (!art || !img) return;

  const finish = (canvas) => {
    art.classList.add("is-particle-done");
    art.classList.remove("is-particle-loading");
    if (canvas) window.setTimeout(() => canvas.remove(), 500);
  };

  if (prefersReducedMotion) {
    finish();
    return;
  }

  const start = () => {
    const artRect = art.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    if (imgRect.width < 80 || imgRect.height < 80 || !img.naturalWidth) {
      finish();
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      finish();
      return;
    }

    canvas.className = "hero-particles";
    canvas.style.left = `${imgRect.left - artRect.left}px`;
    canvas.style.top = `${imgRect.top - artRect.top}px`;
    canvas.style.width = `${imgRect.width}px`;
    canvas.style.height = `${imgRect.height}px`;
    canvas.width = Math.round(imgRect.width * dpr);
    canvas.height = Math.round(imgRect.height * dpr);
    ctx.scale(dpr, dpr);
    art.append(canvas);
    art.classList.add("is-particle-loading");

    const sampleW = Math.min(190, Math.round(imgRect.width / 5));
    const sampleH = Math.max(1, Math.round(sampleW * imgRect.height / imgRect.width));
    const sample = document.createElement("canvas");
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
    if (!sampleCtx) {
      finish(canvas);
      return;
    }

    sample.width = sampleW;
    sample.height = sampleH;

    const scale = Math.max(sampleW / img.naturalWidth, sampleH / img.naturalHeight);
    const sourceW = sampleW / scale;
    const sourceH = sampleH / scale;
    const sourceX = (img.naturalWidth - sourceW) / 2;
    const sourceY = 0;
    sampleCtx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sampleW, sampleH);

    const pixels = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;
    const points = [];
    const step = Math.max(2, Math.round(sampleW / 58));
    for (let y = 0; y < sampleH; y += step) {
      for (let x = 0; x < sampleW; x += step) {
        const i = (y * sampleW + x) * 4;
        if (pixels[i + 3] < 24) continue;
        points.push({
          tx: x / sampleW * imgRect.width,
          ty: y / sampleH * imgRect.height,
          color: `rgb(${pixels[i]} ${pixels[i + 1]} ${pixels[i + 2]})`
        });
      }
    }

    points.sort(() => Math.random() - 0.5);
    const limit = window.innerWidth < 700 ? 620 : 1350;
    const particles = points.slice(0, limit).map((point) => {
      const wave = point.tx / imgRect.width * 0.55 + point.ty / imgRect.height * 0.45;
      return {
        ...point,
        x: point.tx + (Math.random() - 0.5) * 180,
        y: point.ty + (Math.random() - 0.5) * 150,
        r: 1 + Math.random() * 1.7,
        delay: Math.min(0.76, 0.12 + wave * 0.56 + Math.random() * 0.1),
        span: 0.35
      };
    });

    const duration = 1900;
    const started = performance.now();
    const easeOut = (value) => 1 - Math.pow(1 - value, 4);

    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      ctx.clearRect(0, 0, imgRect.width, imgRect.height);

      particles.forEach((particle) => {
        const local = Math.max(0, Math.min(1, (progress - particle.delay) / particle.span));
        const eased = easeOut(local);
        const fade = progress < 0.88 ? 1 : Math.max(0, 1 - (progress - 0.88) / 0.12);
        const x = particle.x + (particle.tx - particle.x) * eased;
        const y = particle.y + (particle.ty - particle.y) * eased;

        ctx.globalAlpha = easeOut(Math.min(1, local * 1.2)) * fade;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(x, y, particle.r * (0.45 + eased * 0.65), 0, Math.PI * 2);
        ctx.fill();
      });

      if (progress > 0.78) art.classList.add("is-particle-done");
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        canvas.classList.add("is-done");
        finish(canvas);
      }
    };

    requestAnimationFrame(tick);
  };

  if (img.complete) requestAnimationFrame(start);
  else img.addEventListener("load", () => requestAnimationFrame(start), { once: true });
};

runHeroParticleIntro();

const initMusicPlayer = () => {
  const player = document.querySelector("[data-music-player]");
  const toggle = player?.querySelector("[data-music-toggle]");
  const status = player?.querySelector("[data-music-status]");
  const progress = player?.querySelector("[data-music-progress]");
  const track = player?.querySelector("[data-music-track]");
  const currentTime = player?.querySelector("[data-music-current]");
  const duration = player?.querySelector("[data-music-duration]");
  const minimize = player?.querySelector("[data-music-minimize]");
  const src = player?.dataset.audioSrc;
  if (!player || !toggle || !status || !progress || !track || !currentTime || !duration || !minimize || !src) return;

  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "metadata";

  const formatTime = (value) => {
    if (!Number.isFinite(value)) return "--:--";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const setPlaying = (playing) => {
    player.classList.toggle("is-playing", playing);
    toggle.setAttribute("aria-label", playing ? "暂停背景音乐" : "播放背景音乐");
    toggle.setAttribute("aria-pressed", String(playing));
    status.textContent = playing ? "梁博 · 正在播放" : "梁博 · 点击播放";
  };

  const playMusic = async () => {
    try {
      await audio.play();
      player.classList.remove("is-missing");
      setPlaying(true);
    } catch {
      setPlaying(false);
      status.textContent = "请再点一次播放";
    }
  };

  toggle.addEventListener("click", async () => {
    const wasCollapsed = player.classList.contains("is-collapsed");
    if (wasCollapsed) player.classList.remove("is-collapsed");
    if (wasCollapsed && !audio.paused) return;
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    await playMusic();
  });

  minimize.addEventListener("click", () => player.classList.add("is-collapsed"));

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const value = audio.currentTime / audio.duration * 100;
    progress.style.transform = `scaleX(${value / 100})`;
    track.setAttribute("aria-valuenow", String(Math.round(value)));
    currentTime.textContent = formatTime(audio.currentTime);
  });
  audio.addEventListener("loadedmetadata", () => { duration.textContent = formatTime(audio.duration); });
  audio.addEventListener("ended", () => setPlaying(false));
  audio.addEventListener("error", () => {
    setPlaying(false);
    player.classList.add("is-missing");
    status.textContent = "请添加音频文件";
  });

  toggle.setAttribute("aria-pressed", "false");
  if (window.matchMedia("(max-width: 640px)").matches) player.classList.add("is-collapsed");
};

initMusicPlayer();

const terminalRows = Array.from(document.querySelectorAll(".terminal-progress .progress"));
let terminalRunId = 0;

const setProgress = (row, value) => {
  const bar = row.querySelector("[data-progress]");
  const label = row.querySelector("b");
  if (!bar || !label) return;
  bar.style.transform = `scaleX(${value / 100})`;
  bar.setAttribute("aria-valuenow", String(value));
  label.textContent = `${value}%`;
};

const animateProgress = (row, target, duration = 900) => {
  const start = Number(row.dataset.value || 0);
  const startAt = performance.now();

  const tick = (now) => {
    const elapsed = Math.min(1, (now - startAt) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    const value = Math.round(start + (target - start) * eased);
    row.dataset.value = String(value);
    setProgress(row, value);
    if (elapsed < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

terminalRows.forEach((row) => {
  const bar = row.querySelector("[data-progress]");
  row.dataset.value = "0";
  setProgress(row, 0);
});

const terminalOutput = document.querySelector("[data-terminal-output]");
const terminalStatus = document.querySelector("[data-terminal-status]");
const terminalLines = [
  { text: "$ whoami", statusLabel: "v1.0.0 · identifying...", progress: 8 },
  { text: "> Peter", statusLabel: "v1.0.0 · profile loaded", progress: 18 },
  { text: "$ peter status --live", statusLabel: "v1.0.0 · checking workspace", progress: 28 },
  { text: "10:12:01   loading AI learning log", status: "[OK]", statusClass: "ok", statusLabel: "v1.0.0 · loading...", progress: 42 },
  { text: "10:12:02   mounting travel archive", status: "[OK]", statusClass: "ok", statusLabel: "v1.0.0 · mounting...", progress: 58 },
  { text: "10:12:04   linking source repository", status: "[RUN]", statusClass: "run", statusLabel: "v1.0.0 · linking...", progress: 76 },
  { text: "10:12:05   portfolio session ready", status: "[READY]", statusClass: "lock", statusLabel: "v1.0.0 · ready", progress: 100 }
];

const setTerminalStatus = (text = "v1.0.0 · waiting...") => {
  if (terminalStatus) terminalStatus.textContent = text;
};

const resetTerminalProgress = () => {
  terminalRows.forEach((row) => {
    row.dataset.value = "0";
    setProgress(row, 0);
  });
};

const appendTerminalLine = (entry, runId = terminalRunId) => {
  if (!terminalOutput) return Promise.resolve(false);
  const line = document.createElement("div");
  line.className = "term-line";
  terminalOutput.append(line);

  if (prefersReducedMotion) {
    line.append(entry.text);
    if (entry.status) {
      const status = document.createElement("span");
      status.className = entry.statusClass;
      status.textContent = entry.status;
      line.append(status);
    }
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let cursor = 0;
    const type = () => {
      if (runId !== terminalRunId) {
        resolve(false);
        return;
      }

      line.textContent = entry.text.slice(0, cursor);
      cursor += 1;

      if (cursor <= entry.text.length) {
        window.setTimeout(type, 20 + Math.random() * 18);
        return;
      }

      if (entry.status) {
        const status = document.createElement("span");
        status.className = entry.statusClass;
        status.textContent = entry.status;
        line.append(status);
      }

      window.setTimeout(() => resolve(runId === terminalRunId), 260);
    };
    type();
  });
};

const runTerminal = async () => {
  if (!terminalOutput) return;
  const runId = ++terminalRunId;
  resetTerminalProgress();
  setTerminalStatus();
  terminalOutput.classList.remove("is-complete");
  terminalOutput.textContent = "";

  for (const entry of terminalLines) {
    const completed = await appendTerminalLine(entry, runId);
    if (!completed || runId !== terminalRunId) return;

    if (entry.statusLabel) setTerminalStatus(entry.statusLabel);

    if (typeof entry.progress === "number") {
      const row = terminalRows[0];
      const target = entry.progress;
      animateProgress(row, target, 850);
      await new Promise((resolve) => window.setTimeout(resolve, 340));
      if (runId !== terminalRunId) return;
    }
  }

  terminalOutput.classList.add("is-complete");
};

window.restartTerminalDemo = runTerminal;
window.readTerminalDemo = () => ({
  text: terminalOutput?.innerText || "",
  progress: terminalRows.map((row) => row.querySelector("b")?.textContent || "")
});

if (prefersReducedMotion) {
  terminalLines.forEach((entry) => {
    appendTerminalLine(entry);
    if (entry.statusLabel) setTerminalStatus(entry.statusLabel);
    if (typeof entry.progress === "number") setProgress(terminalRows[0], entry.progress);
  });
  terminalOutput?.classList.add("is-complete");
} else {
  const terminal = terminalOutput?.closest(".terminal");
  if (terminal) {
    const terminalObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      runTerminal();
    }, { threshold: 0.35 });
    terminalObserver.observe(terminal);
  }
}

document.querySelector("[data-terminal-replay]")?.addEventListener("click", runTerminal);
