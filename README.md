<p align="center">
  <h1 align="center">
    size-plugin
    <a href="https://www.npmjs.org/package/size-plugin"><img src="https://img.shields.io/npm/v/size-plugin.svg?style=flat" alt="npm"></a>
  </h1>
</p>

<p align="center">
  Prints the gzipped sizes of your webpack assets and the changes since the last build.
</p>

<p align="center">
  <img src="https://i.imgur.com/3bWBrJm.png" width="602" alt="size-plugin">
</p>

> 🙋 Using Rollup? Check out the [rollup-plugin-size](https://github.com/luwes/rollup-plugin-size) port.
>
> 🙋‍♂ Using CI ? Check out [size-plugin-bot](https://github.com/kuldeepkeshwar/size-plugin-bot) 🤖 to automate intergation with CI

## Installation

Install `size-plugin` as a development dependency using npm:

```sh
npm i -D size-plugin
```

* * *

## Usage

Add an instance of the plugin to your webpack configuration:

```diff
// webpack.config.js
+ const SizePlugin = require('size-plugin');

module.exports = {
  plugins: [
+    new SizePlugin()
  ]
}
```

* * *

## Options

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

-   [SizePlugin](#sizeplugin)
    -   [Parameters](#parameters)
-   [Item](#item)
    -   [Properties](#properties)
-   [Data](#data)
    -   [Properties](#properties-1)

### SizePlugin

`new SizePlugin(options)`

#### Parameters

-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
    -   `options.compression` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** compression method(gzip/brotli) to use, default: 'gzip'
    -   `options.pattern` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** minimatch pattern of files to track
    -   `options.exclude` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** minimatch pattern of files NOT to track
    -   `options.filename` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** file name to save filesizes to disk
    -   `options.publish` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** option to publish filesizes to size-plugin-store
    -   `options.writeFile` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** option to save filesizes to disk
    -   `options.stripHash` **[function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** custom function to remove/normalize hashed filenames for comparison

### Item

#### Properties

-   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Filename of the item
-   `sizeBefore` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Previous size, in kilobytes
-   `size` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Current size, in kilobytes
-   `sizeText` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Formatted current size
-   `delta` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Difference from previous size, in kilobytes
-   `deltaText` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Formatted size delta
-   `msg` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Full item's default message
-   `color` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The item's default CLI color

### Data

#### Properties

-   `sizes` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Item](#item)>** List of file size items
-   `output` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Current buffered output

## License

[Apache 2.0](LICENSE)

This is not an official Google product.
