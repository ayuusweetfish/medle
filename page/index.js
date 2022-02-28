const N = tune.length;
const DECO_8VA = 1;
const DECO_8VB = 2;
const DECO_SHARP = 4;
const DECO_FLAT = 8;
const tuneDecos = tune.map((note) => {
  const a = note[0];
  let r = 0;
  if (a < 1) r |= DECO_8VB;
  if (a > 7) r |= DECO_8VA;
  if (Math.round(a) !== a) {
    const i = Math.round(a);
    note[0] = i;
    r |= (a < i ? DECO_FLAT : DECO_SHARP);
  }
  return r;
});
const tuneChromatic = !tuneDecos.every((r) => (r & (DECO_SHARP | DECO_FLAT)) === 0);
const tuneAnswer = tune.map(([a, b]) => (a + 6) % 7 + 1);

const SCALE = [0, 2, 4, 5, 7, 9, 11];

let tuneDur = 0;
for (const v of tune) {
  const t = v[1];
  v[1] = tuneDur;
  tuneDur += t;
}

let sfxOn;

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
    if (decos[i] & DECO_FLAT) div(el5a, ['accidental', 'flat']);
    if (decos[i] & DECO_SHARP) div(el5a, ['accidental', 'sharp']);
  }

  o.fill = (i, s) => {
    bgDivs[i].classList.remove('hidden');
    fgDivs[i].classList.remove('hidden');
    bgDivs[i].classList.remove('outline');
    for (let s = 1; s <= 7; s++)
      fgDivs[i].classList.remove(`solf-${s}`);
    if (s !== undefined) fgDivs[i].classList.add(`solf-${s}`);
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
  o.pop = (i) => {
    fgDivs[i].classList.add('large');
    bgDivs[i].classList.add('large');
    setTimeout(() => {
      fgDivs[i].classList.remove('large');
      bgDivs[i].classList.remove('large');
    }, 200);
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
const paths = [['/static/samples/pop.wav']];
for (let i = -12; i <= 24; i++)
  if (tuneChromatic || SCALE.indexOf((i + 12) % 12) !== -1)
    paths.push([
      `/static/samples/pf-${tunePitchBase + i}.ogg`,
      `/static/samples/pf-${tunePitchBase + i}.mp3`,
    ]);

const preloadSounds = (callback) => {
  let count = 0;
  for (const pathList of paths) {
    const name = pathList[0].split('/').pop().split('.')[0];
    const audio = new Howl({src: pathList});
    audio.once('load', () => {
      callback(++count, paths.length);
    });
    audios[name] = audio;
  }
};

const playSound = (name, vol) => {
  if (!sfxOn) return;
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

const loadingContainer = document.getElementById('text-loading');
const loadingProgress = document.getElementById('text-loading-progress');
const startButton = document.getElementById('btn-start');
const textTip = document.getElementById('text-tip');

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
    curPfSound = playSound(`pf-${pitch}`, vol);
  };

  const curInput = [];
  const attInputs = [];
  const attResults = [];
  const attRows = [];
  let succeeded = false;

  let buttonsVisible = false;
  const pickVisibleButtons = () => {
    if (attResults.length === 5 || succeeded) {
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

  for (const [i, [a, b]] of Object.entries(tune)) {
    setTimeout(() => {
      initialRow.fill(i, undefined);
      playSound('pop');
    }, b * tuneBeatDur + 20);
  }
  setTimeout(() => {
    for (let i = 0; i < N; i++) initialRow.clear(i);
    initialRow.fast(false);
  }, tuneDur * tuneBeatDur);
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
    for (const [i, [a, b]] of Object.entries(tune)) {
      const t = setTimeout(() => {
        row.pop(i);
        if (input[i] !== undefined) {
          const pop = (result && result[i] !== 2);
          playForPos(i, input[i], pop ? 0.2 : 1);
          if (pop) playSound('pop');
        } else {
          stopPfSound();
          playSound('pop');
        }
      }, b * tuneBeatDur + 20);
      replayTimers.push(t);
    }
    const t = setTimeout(() => {
      curReplay = -1;
      replayTimers.splice(0);
    }, tuneDur * tuneBeatDur + 20);
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
    for (const [i, [a, b]] of Object.entries(tune)) {
      const r = previousRow;
      setTimeout(() => {
        r.pop(i);
        if (result[i] === 0) r.style(i, 'none');
        if (result[i] === 1) r.style(i, 'maybe');
        if (result[i] === 2) r.style(i, 'bingo');
        const pop = (result[i] !== 2);
        playForPos(i, input[i], pop ? 0.2 : 1);
        if (pop) playSound('pop');
      }, 500 + b * tuneBeatDur);
    }
    attInputs.push(input);
    attResults.push(result);
    succeeded = result.every((r) => r === 2);
    const finished = (attResults.length === 5 || succeeded);
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
    }, 500 + tuneDur * tuneBeatDur + 1000);
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
      const prefix = `Medle #${puzzleId} ${succeeded ? attResults.length : 'X'}/5\n`;
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
      const t = setTimeout(
        () => {
          answerRow.pop(i);
          answerRow.style(i, 'bingo');
        },
        tune[i][1] * tuneRevealBeatDur + tuneRevealOffset - 100);
      revealBubbleTimers.push(t);
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
      answerAudio = new Howl({src: [`/reveal/${puzzleId}.mp3`]});
      answerAudio.once('load', () => {
        btnPlay.classList.remove('disabled');
        updatePlayButtonText();
      });
      answerAudio.on('end', () => {
        playing = false;
        updatePlayButtonText();
        stopBubbleTimers();
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
    }
    playing = !playing;
    updatePlayButtonText();
  };

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (!buttonsVisible) return;
    // Do not use e.keyCode for better compatibility with numpads
    if (e.key.length === 1) {
      const code = e.key.charCodeAt(0) - 48;
      if (code >= 1 && code <= 7)
        window.input(code);
    } else if (e.key === 'Backspace') {
        window.input(-1);
    } else if (e.key === 'Enter') {
      if (curInput.length === N)
        window.confirmGuess();
    }
  });
};

preloadSounds((loaded, total) => {
  loadingProgress.innerText = `${loaded}/${total}`;
  if (loaded === total) {
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
  update(localStorage[cfgKey] === '1');
  for (const btn of btns)
    btn.addEventListener('click', (e) => {
      const on = (localStorage[cfgKey] !== '1');
      localStorage[cfgKey] = (on ? '1' : '0');
      update(on);
    });
};
initToggleButton('btn-play-sfx', 'sfx', true, (on) => sfxOn = on);
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
  const notations = ['nota-num', 'nota-solf', 'nota-roman', 'nota-aikin'];
  let current = notations.indexOf(localStorage.notation);
  if (current === -1) current = 0;
  const nova = (current + (inc ? 1 : 0)) % notations.length;
  localStorage.notation = notations[nova];
  document.body.classList.remove(notations[current]);
  document.body.classList.add(notations[nova]);
};
btnNotation.addEventListener('click', () => {
  updateNotation(true);
});
updateNotation(false);

// Internationalization
let curLang = 1;  // Defaults to English
const btnLang = document.getElementById('btn-lang');

const i18nEls = document.querySelectorAll('[data-t]');
const updateInterfaceLanguage = () => {
  const dict = window.languages[curLang][2];
  const langName = window.languages[curLang][0];
  const langVars = i18nVars[langName];
  for (const el of i18nEls) {
    const key = el.dataset.t;
    if (key[0] === '=') {
      el.innerText = langVars[key.substring(1)];
    } else {
      el.innerText = dict[key];
    }
  }
  btnLang.innerText = window.languages[curLang][1];
  localStorage.lang = langName;
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

btnLang.addEventListener('click', () => {
  console.log(curLang);
  curLang = (curLang + 1) % window.languages.length;
  updateInterfaceLanguage();
});

document.body.classList.add('loaded');
