# Medle

[**medle.0-th.art**](https://medle.0-th.art/)

旋律猜谜游戏，每日更新~  
Daily melody puzzle game (available in en/zh)

## [zh] 服务端程序

安装 [Deno](https://deno.land/) (1.27.0)，然后执行命令

```sh
deno run --allow-net --allow-read --allow-env server.js
```

程序在 `puzzles` 目录下寻找谜题。谜题内容位于 [`puzzles`](https://github.com/ayuusweetfish/medle/tree/puzzles) 分支，可按如下方式放置：

```sh
# 首次
git clone -b puzzles --single-branch https://github.com/ayuusweetfish/medle puzzles
# 后续更新
git -C puzzles pull
```

若要允许展示未来的谜题，请设置环境变量 `DEBUG=1`。

### 自动打包

执行以下命令可打包并压缩 JavaScript 与 CSS：

```sh
deno run --allow-read --allow-write --allow-env server.js build
```

产生的文件位于 `build/` 目录，服务端程序会自动发现之。若要使用 `pages/` 下的原始文件，请删除 `build/` 目录或者设置环境变量 `NOBUILD=1`。

### 许可

源码在**木兰公共许可证**下分发，许可证文本见 [COPYING.MulanPubL.md](COPYING.MulanPubL.md)；也可选择遵循 **GNU Affero 通用公共许可证**，文本见 [COPYING.AGPL.md](COPYING.AGPL.md)。

钢琴声音来自 [Salamander Grand Piano](https://sfzinstruments.github.io/pianos/salamander)；字体来自 [Varela Round](https://fonts.google.com/specimen/Varela+Round)、[FxEmojis](https://github.com/mozilla/fxemoji)、[Font Awesome](https://fontawesome.com/) 与 [Rounded M+](http://jikasei.me/font/rounded-mplus/about.html)。上述资源以及谜题中音乐的作者对作品保留其声明的权利。

## [en] The Server Application

Install [Deno](https://deno.land/) (1.27.0), and then run

```sh
deno run --allow-net --allow-read --allow-env server.js
```

The puzzles are expected to be present under the `puzzles` directory. Contents are available at the [`puzzles`](https://github.com/ayuusweetfish/medle/tree/puzzles) branch and can be properly placed as such:

```sh
# Setup
git clone -b puzzles --single-branch https://github.com/ayuusweetfish/medle puzzles
# Subsequent updates
git -C puzzles pull
```

Set the environment variable `DEBUG=1` to allow future puzzles to be displayed.

### Automatic Packaging

To build minified bundles of JavaScript and CSS used, run

```sh
deno run --allow-read --allow-write --allow-env server.js build
```

The files produced will be put in the `build/` directory and will be automatically detected by the server application. To use the original files in `page/` instead, remove the `build/` directory or set the environment variable `NOBUILD=1`.

### Licence

The source code is distributed under the **Mulan Public License** ([COPYING.MulanPubL.md](COPYING.MulanPubL.md)) or **GNU Affero General Public License** ([COPYING.AGPL.md](COPYING.AGPL.md)) at your option.

The piano samples are from [Salamander Grand Piano](https://sfzinstruments.github.io/pianos/salamander); fonts from [Varela Round](https://fonts.google.com/specimen/Varela+Round), [FxEmojis](https://github.com/mozilla/fxemoji), [Font Awesome](https://fontawesome.com/), and [Rounded M+](http://jikasei.me/font/rounded-mplus/about.html). The authors of these resources as well as those of the music in the puzzles reserve all rights they have declared.
