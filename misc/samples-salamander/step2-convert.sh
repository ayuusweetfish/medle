rm -rf samples
mkdir samples

FLAGS=( "-ar" "44100" "-af" "silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB,loudnorm=TP=-6.0,afade=t=in:ss=0:d=0.01,afade=t=out:st=1.5:d=0.5" "-t" "2" )

for i in {24..105}; do
  ffmpeg -i pf-$i.wav ${FLAGS[@]} samples/pf-$i.ogg
  ffmpeg -i pf-$i.wav ${FLAGS[@]} samples/pf-$i.mp3
done
