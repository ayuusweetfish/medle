rm pf-*.wav

for oct in {1..7}; do
  i=0
  for note in C D\# F\# A; do
    midi=$((oct*12 + 12 + i))
    ${RUBBERBAND} --pitch -1 --crisp 1 ${note}${oct}v8.wav pf-$((midi - 1)).wav
    ${RUBBERBAND} --pitch  1 --crisp 1 ${note}${oct}v8.wav pf-$((midi + 1)).wav
    ln -s ${note}${oct}v8.wav pf-${midi}.wav
    i=$((i + 3))
  done
done
