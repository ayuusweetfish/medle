pyftsubset rounded-mplus-1c-regular.ttf \
  --output-file=rounded-mplus-1c-regular-subset.ttf \
  --unicodes=266a,266d,266f,2714
pyftsubset fa-solid-900.ttf \
  --output-file=fa-solid-900-subset.ttf \
  --unicodes=f013,f041,f04b,f04d,f0c8,f0d8,1f7e4,1f4c6,f141,f219,1f319,f55a
fontforge -lang=ff -script merge.ff
woff2_compress icons.ttf
rm rounded-mplus-1c-regular-subset.ttf fa-solid-900-subset.ttf icons.ttf
