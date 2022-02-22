# fontforge -lang=ff -script %
Open("fa-solid-900.ttf")
em1=$em
Close()

Open("rounded-mplus-1c-regular.ttf")
SelectMore(0u266d)
SelectMore(0u266f)
ScaleToEm(em1)
MergeFonts("fa-solid-900.ttf")
SelectMore(0uf013)
SelectMore(0uf04b)
SelectMore(0uf04d)
SelectMore(0uf141)
SelectMore(0uf55a)
SelectInvert()
DetachAndRemoveGlyphs()
Generate("icons.ttf")
Close()
