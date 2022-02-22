# 图标字体

按照以下步骤获得图标字体：
- 下载 [Font Awesome](https://fontawesome.com/)，将 `webfonts/fa-solid-900.ttf` 文件置于此目录下；
- 下载 [M+ Rounded 字体](http://jikasei.me/font/rounded-mplus/about.html)，将 `rounded-mplus-1c-regular.ttf` 文件置于此目录下；
- 使用 [FontForge](https://fontforge.org/) 执行脚本 `merge.sh`（可能耗时略长，约数十秒）；
- 下载 [woff2 工具](https://github.com/google/woff2)，执行 `woff2_compress icons.ttf`；
- 检查 `icons.woff2` 是否可用。
