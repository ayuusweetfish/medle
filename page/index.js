const N = tune.length;
const DECO_8VA = 1;
const DECO_8VB = 2;
const DECO_SHARP = 4;
const DECO_FLAT = 8;
const tuneDecos = tune.map(([a, b]) => {
  let r = 0;
  if (a < 1) r |= DECO_8VB;
  if (a > 7) r |= DECO_8VA;
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
  }

  o.fill = (i, s) => {
    bgDivs[i].classList.remove('hidden');
    fgDivs[i].classList.remove('hidden');
    bgDivs[i].classList.remove('outline');
    fgTexts[i].innerText = s;
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
  audios[name].stop();
  audios[name].volume(vol !== undefined ? vol : 1);
  audios[name].play();
  return name;
};
const stopSound = (name, fade) => {
  if (fade) {
    audios[name].fade(audios[name].volume(), 0, 100);
  } else {
    audios[name].stop();
  }
};

const modalBackground = document.getElementById('modal-bg');
let curModal = null;
let curModalOnClose = undefined;

const closeModal = () => {
  if (curModal !== null) {
    curModal.classList.add('hidden');
    curModal = null;
  }
  modalBackground.classList.add('hidden');
  if (curModalOnClose) curModalOnClose();
};
const showModal = (id, onClose) => {
  if (curModal !== null) closeModal();
  curModal = document.getElementById(id);
  curModal.classList.remove('hidden');
  modalBackground.classList.remove('hidden');
  curModalOnClose = onClose;
};
modalBackground.addEventListener('mouseup', closeModal);

const loadingContainer = document.getElementById('text-loading');
const loadingProgress = document.getElementById('text-loading-progress');
const startButton = document.getElementById('btn-start');

const startGame = () => {
  startButton.classList.add('hidden');
  document.getElementById('start-btn-container').classList.add('no-pointer');
  document.getElementById('text-recommend-audio').classList.add('hidden');

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
       (tuneDecos[pos] & DECO_8VB) ? -12 : 0);
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
      initialRow.fill(i, '');
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
    }
  };
  const replay = (attemptIndex) => {
    stopReplay();
    if (!buttonsVisible) return;
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
      r.fill(curInput.length, i.toString());
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
    r = createRow(tuneDecos, listContainer, attResults.length);
    r.show(false);
    attRows.push(r);
    setTimeout(() => {
      succeeded = result.every((r) => r === 2);
      if (attResults.length === 5 || succeeded) {
        // Send analytics
        const form = new FormData();
        form.append('puzzle', puzzleId);
        form.append('att', attInputs.map((a) => a.join('')).join(','));
        fetch('/analytics', { method: 'POST', body: form });
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
      btnShare.innerText = '✓ 已复制到剪贴板';
      btnShare.classList.add('copied');
      const prefix = `Medle #${puzzleId} ${succeeded ? attResults.length : 'X'}/5\n`;
      const suffix = `https://medle.0-th.art/` +
        (isDaily && !guideToToday ? '' : puzzleId);
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
    btnShare.innerText = '分享';
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
};

preloadSounds((loaded, total) => {
  loadingProgress.innerText = `${loaded}/${total}`;
  if (loaded === total) {
    loadingContainer.classList.add('hidden');
    startButton.classList.remove('hidden');
  }
});

if (localStorage.first === undefined) {
  showModal('modal-intro');
  localStorage.first = '';
} else if (guideToToday) {
  showModal('modal-guide-today');
}

document.getElementById('icon-btn-help').addEventListener('click', () => {
  showModal('modal-intro');
});

document.getElementById('icon-btn-options').addEventListener('click', () => {
  showModal('modal-options');
});

const initToggleButton = (ids, bodyClass, localStorageKey) => {
  if (typeof ids === 'string') ids = [ids];
  const btns = ids.map((id) => document.getElementById(id));

  const update = (on) => {
    if (on) {
      document.body.classList.add(bodyClass);
      for (const btn of btns) {
        btn.classList.add('on');
        btn.innerText = 'ON';
      }
    } else {
      document.body.classList.remove(bodyClass);
      for (const btn of btns) {
        btn.classList.remove('on');
        btn.innerText = 'OFF';
      }
    }
  };
  update(localStorage[localStorageKey] === '1');
  for (const btn of btns)
    btn.addEventListener('click', (e) => {
      const on = (localStorage[localStorageKey] !== '1');
      localStorage[localStorageKey] = (on ? '1' : '0');
      update(on);
    });
};
initToggleButton('btn-dark-theme', 'dark', 'dark');
initToggleButton(['btn-high-con', 'btn-high-con-alt'], 'highcon', 'highcon');
