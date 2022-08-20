(() => {
const N = tune.length;
const DECO_8VA = 1;
const DECO_8VB = 2;
const DECO_SHARP = 4;
const DECO_FLAT = 8;
const DECO_APPO = 16;
const tuneDecos = tune.map((note) => {
  let a = note[0];
  let r = 0;
  if (a >= 100) {
    r |= DECO_APPO;
    a -= 100;
    note[0] = a;
  }
  if (a < 1) r |= DECO_8VB;
  if (a > 7) r |= DECO_8VA;
  const i = Math.round(a);
  if (i !== a) {
    note[0] = i;
    r |= (a < i ? DECO_FLAT : DECO_SHARP);
  }
  return r;
});
const tuneAnswer = tune.map((x) => (x[0] + 6) % 7 + 1);

const attemptsLimit = (N >= 10 ? 6 : 5);

const SCALE = [0, 2, 4, 5, 7, 9, 11];

let tuneDur = 0;
for (const v of tune) {
  for (let i = 1; i < v.length; i++) {
    const t = v[i];
    v[i] = tuneDur;
    tuneDur += t;
  }
}

let sfxOn;
let metronomeOn;
const metronomeOffset =
  () => (metronomeOn && metronome[0] < 0 ? -metronome[0] : 0);

const createRow = (decos, parentEl, rowIndex) => {
  const o = {};

  const n = decos.length;

  const div = (parentEl, classes) => {
    const el = document.createElement('div');
    if (typeof classes === 'string')
      el.classList.add(classes);
    else if (typeof classes === 'object')
      for (const cl of classes) el.classList.add(cl);
    parentEl.appendChild(el);
    return el;
  };

  const bgDivs = [];
  const fgDivs = [];
  const fgTexts = [];

  const el1 = div(parentEl, 'list');
  const el2 = div(el1, 'bg');
  const el3 = div(el1, 'fg');
  for (let i = 0; i < n; i++) {
    const el4a = div(el2, 'bubble');
    const el5a = div(el4a, 'content');
    const el4b = div(el3, 'bubble');
    const el5b = div(el4b, 'content');
    bgDivs.push(el4a);
    fgDivs.push(el4b);
    fgTexts.push(el5b);
    // Decoration?
    if (decos[i] & DECO_8VA) div(el5a, ['tune-dot', 'ottava']);
    if (decos[i] & DECO_8VB) div(el5a, ['tune-dot', 'ottava-bassa']);
    if (decos[i] & DECO_FLAT) el5a.classList.add('flat');
    if (decos[i] & DECO_SHARP) el5a.classList.add('sharp');
    if (decos[i] & DECO_APPO) {
      el4a.classList.add('appo');
      el4b.classList.add('appo');
    }
    div(el5a, 'accidental');
  }

  o.fill = (i, s) => {
    bgDivs[i].classList.remove('hidden');
    fgDivs[i].classList.remove('hidden');
    bgDivs[i].classList.remove('outline');
    for (let s = 1; s <= 7; s++) {
      fgDivs[i].classList.remove(`solf-${s}`);
      bgDivs[i].classList.remove(`solf-${s}`);
    }
    if (s !== undefined) {
      fgDivs[i].classList.add(`solf-${s}`);
      bgDivs[i].classList.add(`solf-${s}`);
    }
  };
  o.clear = (i) => {
    bgDivs[i].classList.remove('hidden');
    bgDivs[i].classList.add('outline');
    fgDivs[i].classList.add('hidden');
  };
  o.style = (i, s) => {
    bgDivs[i].classList.add(s);
    fgDivs[i].classList.add(s);
  };
  o.clearStyle = (i, s) => {
    bgDivs[i].classList.remove(s);
    fgDivs[i].classList.remove(s);
  };
  o.pop = (i, keep) => {
    fgDivs[i].classList.add('large');
    bgDivs[i].classList.add('large');
    setTimeout(() => {
      fgDivs[i].classList.remove('large');
      bgDivs[i].classList.remove('large');
    }, isFinite(keep) ?
      Math.min(200, Math.max(100, keep / 2)) :
      200);
  };
  o.show = (b) => {
    if (b) {
      for (let i = 0; i < n; i++) bgDivs[i].classList.remove('hidden');
      for (let i = 0; i < n; i++) fgDivs[i].classList.remove('hidden');
    } else {
      for (let i = 0; i < n; i++) bgDivs[i].classList.add('hidden');
      for (let i = 0; i < n; i++) fgDivs[i].classList.add('hidden');
    }
  };
  o.fast = (b) => {
    if (b) for (let i = 0; i < n; i++) bgDivs[i].classList.add('fast');
    else   for (let i = 0; i < n; i++) bgDivs[i].classList.remove('fast');
  };
  o.fastPop = (b) => {
    if (b) for (let i = 0; i < n; i++) bgDivs[i].classList.add('fast-pop');
    else   for (let i = 0; i < n; i++) bgDivs[i].classList.remove('fast-pop');
  };

  if (rowIndex !== undefined) {
    el1.addEventListener('click', () => window.replay(rowIndex));
  }

  return o;
};

const check = (answer, guess) => {
  const n = answer.length;
  const result = Array(n).fill(0);
  for (let i = 0; i < n; i++)
    if (answer[i] === guess[i]) result[i] = 2;
  for (let i = 0; i < n; i++) if (result[i] !== 2) {
    // Look for the leftmost unmarked occurrence of answer[i] in the guess
    for (let j = 0; j < n; j++)
      if (result[j] === 0 && answer[i] === guess[j]) {
        result[j] = 1;
        break;
      }
  }
  return result;
};

const sendAnalytics = (contents) => {
  const form = new FormData();
  form.append('puzzle', puzzleId);
  form.append('t', contents);
  fetch('/analytics', { method: 'POST', body: form });
};

const audios = {};
const paths = [['/static/samples/pop.wav'], ['/static/samples/beat.wav']];

const notesReachable = {};
const octaves = [0];
const accidentals = [0];
if (!tuneDecos.every((r) => (r & DECO_8VA) === 0)) octaves.push(12);
if (!tuneDecos.every((r) => (r & DECO_8VB) === 0)) octaves.push(-12);
if (!tuneDecos.every((r) => (r & DECO_SHARP) === 0)) accidentals.push(1);
if (!tuneDecos.every((r) => (r & DECO_FLAT) === 0)) accidentals.push(-1);
for (const a of octaves)
  for (const b of accidentals)
    for (const c of SCALE)
      notesReachable[a + b + c] = true;

for (let i = -12; i <= 24; i++)
  if (notesReachable[i])
    paths.push([
      `/static/samples/pf-${tunePitchBase + i}.ogg`,
      `/static/samples/pf-${tunePitchBase + i}.mp3`,
    ]);

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const createSound = (urls) => {
  const o = {};

  o.eventHandlers = {load: [], end: []};
  const emit = (name) => {
    for (const fn of o.eventHandlers[name]) fn();
    o.eventHandlers[name].splice(0);
  };
  o.once = (name, fn) => o.eventHandlers[name].push(fn);

  var buf = null;
  const tryFetch = (i) => {
    fetch(urls[i]).then((resp) => {
      resp.arrayBuffer().then((dataBuf) => {
        audioCtx.decodeAudioData(dataBuf,
          (pcmBuf) => {
            buf = pcmBuf;
            emit('load');
          },
          () => {
            if (i + 1 < urls.length) tryFetch(i + 1);
            // XXX: Throw an exception otherwise?
          }
        );
      });
    });
  };
  tryFetch(0);

  o.duration = () => buf.duration;

  var count = 0;
  var s = {};
  o.stop = (id) => {
    if (id === undefined)
      for (const id in s) o.stop(id);
    else if (s[id]) {
      s[id].nSource.stop();
      s[id].nSource.disconnect();
      s[id].nGain.disconnect();
      delete s[id];
    }
  };
  o.play = () => {
    const id = count++;
    const nSource = audioCtx.createBufferSource();
    nSource.buffer = buf;
    nSource.start();
    nSource.onended = () => {
      emit('end');
      o.stop(id);
    };
    const nGain = audioCtx.createGain();
    nSource.connect(nGain);
    nGain.connect(audioCtx.destination);
    s[id] = {
      nSource: nSource,
      nGain: nGain,
    };
    return id;
  };

  o.volume = (vol, id) => {
    if (vol === undefined) {
      if (!s[id]) return 0;
      return s[id].nGain.gain.value;
    }
    s[id].nGain.gain.value = vol;
  };
  o.fade = (from, to, dur, id) => {
    if (id === undefined) {
      for (const id in s) o.fade(from, to, dur, id);
      return;
    }
    if (!s[id]) return;
    const g = s[id].nGain.gain;
    const t = audioCtx.currentTime;
    g.setValueAtTime(from, t);
    g.linearRampToValueAtTime(to, t + dur / 1000);
  };

  return o;
};

const preloadSounds = (callback) => {
  let count = 0;
  for (const pathList of paths) {
    const name = pathList[0].split('/').pop().split('.')[0];
    const audio = createSound(pathList);
    audio.once('load', () => {
      callback(++count, paths.length);
    });
    audios[name] = audio;
  }
};

const playSound = (name, vol) => {
  if (!sfxOn) return;
  if (name === 'beat' && !metronomeOn) return;
  const id = audios[name].play();
  audios[name].volume(vol !== undefined ? vol : 1, id);
  return [name, id];
};
const stopSound = ([name, id], fade) => {
  if (!sfxOn) return;
  if (fade) {
    audios[name].fade(audios[name].volume(undefined, id), 0, 100, id);
  } else {
    audios[name].stop(id);
  }
};

const modalBackground = document.getElementById('modal-bg');
let modalStack = [];
let modalStackOnClose = [];

const closeModal = () => {
  if (modalStack.length === 0) return;
  // Close the topmost modal
  const el1 = modalStack.pop();
  el1.classList.add('hidden');
  const fn = modalStackOnClose.pop();
  if (fn) fn();
  // Hide the background, or show the new topmost modal
  if (modalStack.length === 0) {
    modalBackground.classList.add('hidden');
  } else {
    const el2 = modalStack[modalStack.length - 1];
    el2.classList.remove('hidden');
  }
};
const showModal = (id, onClose) => {
  if (modalStack.length > 0)
    modalStack[modalStack.length - 1].classList.add('hidden');
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  modalStack.push(el);
  modalStackOnClose.push(onClose);
  modalBackground.classList.remove('hidden');
};
modalBackground.addEventListener('mouseup', closeModal);
window.closeModal = closeModal;

const loadingContainer = document.getElementById('text-loading');
const loadingProgress = document.getElementById('text-loading-progress');
const startButton = document.getElementById('btn-start');
const textTip = document.getElementById('text-tip');

// Back up local storage with cookies
const clearCookies = () => {
  const items = document.cookie.split(';');
  if (items) for (const s of items) {
    const i = s.indexOf('=');
    const key = decodeURIComponent(s.substring(0, i).trim());
    const value = decodeURIComponent(s.substring(i + 1));
    document.cookie = `${encodeURIComponent(key)}=; samesite=strict; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
};
const cookieToLocalStorage = () => {
  localStorage.clear();
  const items = document.cookie.split(';');
  for (const s of items) {
    const i = s.indexOf('=');
    const key = decodeURIComponent(s.substring(0, i).trim());
    const value = decodeURIComponent(s.substring(i + 1));
    localStorage[key] = value;
  }
};
const localStorageToCookie = () => {
  clearCookies();
  for (const [key, value] of Object.entries(localStorage)) {
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; samesite=strict; max-age=2592000`;
  }
};

if (localStorage.length === 0 && document.cookie) {
  cookieToLocalStorage();
}

// Display tip
const tips = textTip.children;
const tipIndex = ((+localStorage.tip || 0) + 1) % tips.length;
localStorage.tip = tipIndex;
tips[tipIndex].style.display = 'inline';

let gamePreloaded = false;
let gameStarted = false;

const startGame = () => {
  gameStarted = true;
  startButton.classList.add('hidden');
  document.getElementById('start-btn-container').classList.add('no-pointer');
  textTip.classList.add('hidden');

  sendAnalytics('start');

  const listContainer = document.getElementById('list-container');
  const btnsRow1 = document.getElementById('input-btns-row-1');
  const btnsRow2 = document.getElementById('input-btns-row-2');
  const btnDelBg = document.getElementById('input-btn-del-bg');
  const btnsConfirm = document.getElementById('input-btns-confirm');
  const btnConfirmBg = document.getElementById('input-btn-confirm-bg');
  const btnsReveal = document.getElementById('input-btns-reveal');
  const btnRevealBg = document.getElementById('input-btn-reveal-bg');

  let curPfSound = undefined;
  const stopPfSound = () => {
    if (curPfSound !== undefined) stopSound(curPfSound, true);
  };
  const playForPos = (pos, solf, vol) => {
    const pitch = tunePitchBase + SCALE[solf - 1] +
      ((tuneDecos[pos] & DECO_8VA) ? 12 :
       (tuneDecos[pos] & DECO_8VB) ? -12 : 0) +
      ((tuneDecos[pos] & DECO_SHARP) ? 1 :
       (tuneDecos[pos] & DECO_FLAT) ? -1 : 0);
    stopPfSound();
    vol = (vol === undefined ? 1 : vol);
    if (tuneDecos[pos] & DECO_APPO) vol *= 0.5;
    curPfSound = playSound(`pf-${pitch}`, vol);
  };
  const playPopForPos = (pos, vol) => {
    vol = (vol === undefined ? 1 : vol);
    if (tuneDecos[pos] & DECO_APPO) vol *= 0.3;
    playSound('pop', vol);
  };

  const curInput = [];
  const attInputs = [];
  const attResults = [];
  const attRows = [];
  let succeeded = false;

  let buttonsVisible = false;
  const pickVisibleButtons = () => {
    if (attResults.length === attemptsLimit || succeeded) {
      btnsRow1.classList.add('hidden');
      btnsRow2.classList.add('hidden');
      btnsRow2.classList.add('must');
      btnsConfirm.classList.add('hidden');
      btnsReveal.classList.remove('hidden');
      recalcConfirmWidth();
      return;
    }
    btnsReveal.classList.add('hidden');
    if (curInput.length < N) {
      btnsRow1.classList.remove('hidden');
      btnsRow2.classList.remove('hidden');
      btnsConfirm.classList.add('hidden');
    } else {
      btnsRow1.classList.add('hidden');
      btnsRow2.classList.add('hidden');
      btnsConfirm.classList.remove('hidden');
      recalcConfirmWidth();
    }
  };
  const showButtons = (b) => {
    buttonsVisible = b;
    if (b) {
      btnsRow1.classList.remove('hidden');
      btnsRow2.classList.remove('hidden');
      btnsRow2.classList.remove('must');
      btnsConfirm.classList.remove('hidden');
      btnsReveal.classList.remove('hidden');
      pickVisibleButtons();
    } else {
      btnsRow1.classList.add('hidden');
      btnsRow2.classList.add('hidden');
      btnsRow2.classList.add('must');
      btnsConfirm.classList.add('hidden');
      btnsReveal.classList.add('hidden');
    }
  };

  const initialRow = createRow(tuneDecos, listContainer, 0);
  initialRow.fast(true);
  initialRow.show(false);
  attRows.push(initialRow);

  for (let i = 0; i < N; i++) {
    const ts = tune[i];
    for (let j = 1; j < ts.length; j++) {
      setTimeout(() => {
        if (j === 1) initialRow.fill(i);
        else initialRow.pop(i, (ts[j + 1] - ts[j]) * tuneBeatDur);
        playPopForPos(i);
      }, (ts[j] + metronomeOffset()) * tuneBeatDur + 20);
    }
    for (let t = metronome[0]; t < tuneDur; t += metronome[1]) {
      const stress = (!metronome[2] ||
        (t - metronome[0]) % (metronome[1] * metronome[2]) == 0);
      setTimeout(() => playSound('beat', stress ? 1 : 0.25),
        (t + metronomeOffset()) * tuneBeatDur + 20);
    }
  }
  setTimeout(() => {
    for (let i = 0; i < N; i++) initialRow.clear(i);
    initialRow.fast(false);
  }, (tuneDur + metronomeOffset()) * tuneBeatDur);
  setTimeout(() => showButtons(true), tuneDur * tuneBeatDur + 1000);

  // Replay
  let replayTimers = [];
  let curReplay = -1;
  const stopReplay = () => {
    // Stop the replay in progress, if any
    if (curReplay !== -1) {
      for (const t of replayTimers) clearTimeout(t);
      replayTimers.splice(0);
      for (let i = 0; i < N; i++)
        attRows[curReplay].clearStyle(i, 'large');
      curReplay = -1;
    }
  };
  const replay = (attemptIndex) => {
    const prevReplay = curReplay;
    stopReplay();
    if (!buttonsVisible) return;
    if (prevReplay === attemptIndex) {
      curReplay = -1;
      return;
    }
    // Start replay
    curReplay = attemptIndex;
    const input = (attemptIndex >= attInputs.length ?
        curInput : attInputs[attemptIndex]);
    const row = attRows[attemptIndex];
    const result = attResults[attemptIndex];
    for (let i = 0; i < N; i++) {
      const ts = tune[i];
      for (let j = 1; j < ts.length; j++) {
        const timer = setTimeout(() => {
          row.pop(i, (ts[j + 1] - ts[j]) * tuneBeatDur);
          if (input[i] !== undefined) {
            const pop = (result && result[i] !== 2);
            playForPos(i, input[i], pop ? 0.2 : 1);
            if (pop) playPopForPos(i);
          } else {
            stopPfSound();
            playPopForPos(i);
          }
        }, (ts[j] + metronomeOffset()) * tuneBeatDur + 20);
        replayTimers.push(timer);
      }
      for (let t = metronome[0]; t < tuneDur; t += metronome[1]) {
        const timer = setTimeout(() => playSound('beat'),
          (t + metronomeOffset()) * tuneBeatDur + 20);
        replayTimers.push(timer);
      }
    }
    const timer = setTimeout(() => {
      curReplay = -1;
      replayTimers.splice(0);
    }, (tuneDur + metronomeOffset()) * tuneBeatDur + 20);
    replayTimers.push(timer);
  };
  window.replay = replay;

  const recalcConfirmWidth = () => {
    const rect = btnDelBg.getBoundingClientRect();
    const vw = document.body.clientWidth;
    const w = vw - 2 * (vw - rect.right);
    btnConfirmBg.style.width = (w / 1.2) + 'px';
  };
  window.addEventListener('resize', recalcConfirmWidth);

  let r = initialRow;

  window.input = (i) => {
    if (attResults.length === attemptsLimit || succeeded) return;
    stopReplay();
    if (i === -1 && curInput.length > 0) {
      curInput.pop();
      r.clear(curInput.length);
    } else if (i !== -1 && curInput.length < N) {
      r.fill(curInput.length, i);
      curInput.push(i);
      playForPos(curInput.length - 1, i);
    }
    pickVisibleButtons();
  };

  window.confirmGuess = () => {
    stopReplay();
    showButtons(false);
    const input = curInput.splice(0);
    const result = check(tuneAnswer, input);
    const previousRow = r;
    for (let i = 0; i < N; i++) {
      const ts = tune[i];
      const r = previousRow;
      for (let j = 1; j < ts.length; j++) {
        setTimeout(() => {
          r.pop(i, (ts[j + 1] - ts[j]) * tuneBeatDur);
          if (result[i] === 0) r.style(i, 'none');
          if (result[i] === 1) r.style(i, 'maybe');
          if (result[i] === 2) r.style(i, 'bingo');
          const pop = (result[i] !== 2);
          playForPos(i, input[i], pop ? 0.2 : 1);
          if (pop) playPopForPos(i);
        }, 500 + (ts[j] + metronomeOffset()) * tuneBeatDur);
      }
      for (let t = metronome[0]; t < tuneDur; t += metronome[1]) {
        setTimeout(() => playSound('beat'),
          500 + (t + metronomeOffset()) * tuneBeatDur);
      }
    }
    attInputs.push(input);
    attResults.push(result);
    succeeded = result.every((r) => r === 2);
    const finished = (attResults.length === attemptsLimit || succeeded);
    if (!finished) {
      r = createRow(tuneDecos, listContainer, attResults.length);
      r.show(false);
      attRows.push(r);
    }
    setTimeout(() => {
      if (finished) {
        // Send analytics
        sendAnalytics('fin ' + attInputs.map((a) => a.join('')).join(','));
        // Reveal answer
        window.revealAnswer();
        showButtons(true);
      } else {
        for (let i = 0; i < N; i++) r.clear(i);
        showButtons(true);
      }
    }, 500 + (tuneDur + metronomeOffset()) * tuneBeatDur + 1000);
  };

  const answerContainer = document.getElementById('answer-container');
  const answerRow = createRow(tuneDecos, answerContainer);
  for (let i = 0; i < N; i++)
    answerRow.fill(i, tuneAnswer[i]);
  answerRow.fastPop(true);

  const btnShare = document.getElementById('btn-share');
  new ClipboardJS(btnShare, {
    text: () => {
      btnShare.classList.add('copied');
      const prefix = `Medle #${puzzleId} ${succeeded ? attResults.length : 'X'}/${attemptsLimit}\n`;
      const suffix = `https://medle.0-th.art/` +
        (puzzleId === todayDaily ? '' : puzzleId);
      return prefix +
        attResults.map((result) => result.map((r) => {
          if (r === 0) return '\u{26aa}';
          if (r === 1) return '\u{1f7e1}';
          if (r === 2) return '\u{1f7e2}';
        }).join('')).join('\n') +
        '\n' + suffix;
    }
  });

  let answerAudioLoading = false;
  let answerAudio;
  const btnPlay = document.getElementById('btn-play');
  const btnPlayContent = document.getElementById('btn-play-content');

  let fadeOutTimer = -1;
  let playing = false;
  const updatePlayButtonText = () => {
    btnPlayContent.innerText = (playing ? '\u{f04d}' : '\u{f04b}');
  };

  let revealBubbleTimers = [];
  const createBubbleTimers = () => {
    for (let i = 0; i < N; i++) {
      const ts = tune[i];
      for (let j = 1; j < ts.length; j++) {
        const t = setTimeout(
          () => {
            answerRow.pop(i, (ts[j + 1] - ts[j]) * tuneBeatDur);
            answerRow.style(i, 'bingo');
          },
          ts[j] * tuneRevealBeatDur + tuneRevealOffset - 100);
        revealBubbleTimers.push(t);
      }
    }
  };
  const stopBubbleTimers = () => {
    for (const t of revealBubbleTimers) clearTimeout(t);
    revealBubbleTimers.splice(0);
    for (let i = 0; i < N; i++) answerRow.clearStyle(i, 'bingo');
  };

  window.revealAnswer = () => {
    btnShare.classList.remove('copied');

    showModal('modal-finish', () => {
      if (playing) window.revealPlay();
    });
    playing = false;

    if (!answerAudioLoading) {
      answerAudioLoading = true;
      answerAudio = createSound([`/reveal/${puzzleId}.mp3`]);
      answerAudio.once('load', () => {
        btnPlay.classList.remove('disabled');
        updatePlayButtonText();
      });
    }

    for (let i = 0; i < N; i++)
      answerRow.clearStyle(i, 'bingo');
  };

  window.revealPlay = () => {
    if (fadeOutTimer !== -1) clearTimeout(fadeOutTimer);
    if (playing) {
      answerAudio.fade(1, 0, 100);
      fadeOutTimer = setTimeout(
        () => answerAudio.stop(),
        120);
      stopBubbleTimers();
    } else {
      answerAudio.stop();
      answerAudio.fade(0, 1, 100);
      answerAudio.play();
      fadeOutTimer = setTimeout(
        () => answerAudio.fade(1, 0, 100),
        answerAudio.duration() * 1000 - 120);
      createBubbleTimers();
      answerAudio.once('end', () => {
        playing = false;
        updatePlayButtonText();
        stopBubbleTimers();
      });
    }
    playing = !playing;
    updatePlayButtonText();
  };

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (!buttonsVisible) return;
    // Do not use e.keyCode for better compatibility with numpads
    if (e.key.length === 1) {
      // Numeric
      const num = e.key.charCodeAt(0) - 48;
      if (num >= 1 && num <= 7) window.input(num);
      // Alphabetic
      if (localStorage.notation === 'nota-alpha') {
        const alpha = e.key.charCodeAt(0) - 97;
        if (alpha >= 0 && alpha <= 6) {
          const note = tuneNoteBase.charCodeAt(0) - 65;
          window.input((alpha - note + 7) % 7 + 1);
        }
      }
    } else if (e.key === 'Backspace') {
        window.input(-1);
    } else if (e.key === 'Enter') {
      if (curInput.length === N)
        window.confirmGuess();
    }
  });
};
window.startGame = startGame;

preloadSounds((loaded, total) => {
  loadingProgress.innerText = `${loaded}/${total}`;
  if (loaded === total) {
    // Set pitch bend
    if (tunePitchBend !== 1) {
      for (const [k, v] of Object.entries(audios))
        if (k.startsWith('pf-')) v.rate(tunePitchBend);
    }
    // Show buttons
    loadingContainer.classList.add('hidden');
    startButton.classList.remove('hidden');
    gamePreloaded = true;
  }
});

// Press Enter to start
document.addEventListener('keydown', function (e) {
  if (gameStarted) {
    document.removeEventListener('keydown', arguments.callee);
  }
  if (gamePreloaded && !gameStarted && e.key === 'Enter') {
    startGame();
    document.removeEventListener('keydown', arguments.callee);
  }
});

// Archive
const puzzleLink = (index) => {
  const a = document.createElement('a');
  a.classList.add('puzzle-link');
  const id = index.toString().padStart(3, '0');
  const date = new Date('2022-02-21');
  date.setDate(date.getDate() + (index - 1));
  a.innerHTML =
    date.getFullYear() + '.' +
    (date.getMonth() + 1).toString().padStart(2, '0') + '.' +
    (date.getDate()).toString().padStart(2, '0') +
    ` — <strong>#${id}</strong>`;
  if (id === puzzleId) {
    a.classList.add('current');
    a.setAttribute('href', `javascript:closeModal()`);
  } else {
    a.setAttribute('href', `/${id}?past`);
  }
  return a;
};
if (isDaily) {
  document.getElementById('icon-btn-archive').addEventListener('click', () => {
    showModal('modal-archive');
  });

  const container = document.getElementById('archive-container');
  const latest = parseInt(todayDaily);
  for (let i = latest; i >= 1; i--) {
    container.appendChild(puzzleLink(i));
  }
}
if (guideToToday) {
  const guideLinks = document.getElementById('guide-today-links');
  guideLinks.appendChild(puzzleLink(puzzleId));
  guideLinks.appendChild(puzzleLink(todayDaily));
  showModal('modal-guide-today');
}

if (localStorage.first === undefined) {
  showModal('modal-intro');
  localStorage.first = '';
}

document.getElementById('icon-btn-help').addEventListener('click', () => {
  showModal('modal-intro');
});

document.getElementById('icon-btn-options').addEventListener('click', () => {
  showModal('modal-options');
});

const initToggleButton = (ids, cfgKey, defaultVal, fn) => {
  if (typeof ids === 'string') ids = [ids];
  const btns = ids.map((id) => document.getElementById(id));

  const update = (on) => {
    fn(on);
    if (on) {
      for (const btn of btns) {
        btn.classList.add('on');
        btn.innerText = 'ON';
      }
    } else {
      for (const btn of btns) {
        btn.classList.remove('on');
        btn.innerText = 'OFF';
      }
    }
  };
  if (localStorage[cfgKey] === undefined)
    localStorage[cfgKey] = (defaultVal ? '1' : '0');
  localStorageToCookie();
  update(localStorage[cfgKey] === '1');
  for (const btn of btns)
    btn.addEventListener('click', (e) => {
      const on = (localStorage[cfgKey] !== '1');
      localStorage[cfgKey] = (on ? '1' : '0');
      localStorageToCookie();
      update(on);
    });
};
initToggleButton('btn-play-sfx', 'sfx', true, (on) => sfxOn = on);
initToggleButton('btn-metronome', 'metronome', false, (on) => metronomeOn = on);
initToggleButton('btn-dark-theme', 'dark',
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
(on) => {
  if (on) document.body.classList.add('dark');
  else document.body.classList.remove('dark');
});
initToggleButton(['btn-high-con', 'btn-high-con-alt'], 'highcon', false, (on) => {
  if (on) document.body.classList.add('highcon');
  else document.body.classList.remove('highcon');
});

const btnNotation = document.getElementById('btn-notation');
const updateNotation = (inc) => {
  const notations = ['nota-num', 'nota-solf', 'nota-alpha', 'nota-roman', 'nota-aikin'];
  let current = notations.indexOf(localStorage.notation);
  if (current === -1) current = 0;
  const nova = (current + (inc ? 1 : 0)) % notations.length;
  localStorage.notation = notations[nova];
  localStorageToCookie();
  document.body.classList.remove(notations[current]);
  document.body.classList.add(notations[nova]);
};
btnNotation.addEventListener('click', () => {
  updateNotation(true);
});
updateNotation(false);

// Internationalization
let curLang = 1;  // Defaults to English
const btnLangs = [document.getElementById('btn-lang'), document.getElementById('btn-lang-alt')];

const i18nEls = document.querySelectorAll('[data-t]');
const updateInterfaceLanguage = () => {
  const dict = window.languages[curLang][2];
  const langName = window.languages[curLang][0];
  const langVars = i18nVars[langName];
  for (const el of i18nEls) {
    const key = el.dataset.t;
    if (key[0] === '=') {
      if (el.tagName === 'IMG')
        el.alt = langVars[key.substring(1)];
      else
        el.innerText = langVars[key.substring(1)];
    } else {
      el.innerText = dict[key];
    }
  }
  for (const btnLang of btnLangs)
    btnLang.innerText = window.languages[curLang][1];
  localStorage.lang = langName;
  localStorageToCookie();
};

// Find previously stored language or preferred language
const langCode = (localStorage.lang || window.navigator.languages[0]).split('-');
let bestMatch = 0;
for (const [i, [code, name, dict]] of Object.entries(window.languages)) {
  const codeParts = code.split('-');
  // Compare components
  let comps = 0;
  for (comps = 0; comps < langCode.length && comps < codeParts.length; comps++)
    if (langCode[comps] !== codeParts[comps]) break;
  if (comps > bestMatch) {
    bestMatch = comps;
    curLang = +i;
  }
}
updateInterfaceLanguage();

for (const btnLang of btnLangs)
  btnLang.addEventListener('click', () => {
    curLang = (curLang + 1) % window.languages.length;
    updateInterfaceLanguage();
  });

localStorageToCookie();

document.body.classList.add('loaded');
})();
