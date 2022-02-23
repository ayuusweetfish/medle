# 图标字体

按照以下步骤获得图标字体：
- 下载 [Font Awesome](https://fontawesome.com/)，将 `webfonts/fa-solid-900.ttf` 文件置于此目录下；
- 下载 [M+ Rounded 字体](http://jikasei.me/font/rounded-mplus/about.html)，将 `rounded-mplus-1c-regular.ttf` 文件置于此目录下；
- 下载 [fontTools](https://github.com/fonttools/fonttools)，并确保程序 `pyftsubset` 在 `$PATH` 下；
- 安装 [FontForge](https://fontforge.org/)，并确保程序 `fontforge` 在 `$PATH` 下；
- 下载 [woff2 工具](https://github.com/google/woff2)，并确保程序 `woff2_compress` 在 `$PATH` 下；
- 执行脚本 `process.sh`；
- 检查 `icons.woff2` 是否可用。
