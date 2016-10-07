/**
 *  Copyright (c) 2016, Helikar Lab.
 *  All rights reserved.
 *
 *  This source code is licensed under the GPLv3 License.
 *  Authors: David Tichy, Aleš Saska
 */

class Texts {
  constructor(gl){
    this._gl = gl;
    this._size = 1024;

    
    this._canvas = document.createElement("canvas");
    this._canvas.width = this._canvas.height = this._size;
    this._canvas.style.width = this._canvas.style.height = this._size + 'px';
    this._canvas.style.display = "none";
    document.body.appendChild(this._canvas);

    this._context = this._canvas.getContext('2d');
    this._context.fillStyle = "white";
    this._context.textAlign = "left";
    this._context.textBaseline = "top";

    this._rendered = this._texts = this._x = this._y = this._height = undefined;

    this.texture = this._gl.createTexture();

    
  }

  clear() {
    this._rendered = {};
    this._context.clearRect(0, 0, this._size, this._size);
    this._height = this._x = this._y = 0;
  }

  setFont (font) {
    this._rendered [font] = this._texts = this._rendered [font] || {};
    this._context.font = font;
    this._x = 0;
    this._y += this._height;
    this._height = +/(\d+)px/.exec(font)[1] + 1;
  }

  get (text) {
    let result = this._texts[text];
    if (!result) {
	let width = this._context.measureText(text).width;
	if (this._x + width > this._size) {
	    this._x = 0;
	    this._y += this._height;
	}
	this._context.fillText(text, this._x, this._y);
	this._texts[text] = result = {
	    width: width,
	    height: this._height,
	    left: this._x / this._size,
	    right: (this._x + width) / this._size,
	    top: this._y / this._size,
	    bottom: (this._y + this._height) / this._size
	};
	this._x += width;
    }
    return result;
  }

  bind () {
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.texture);
    this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, false);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, this._gl.NEAREST);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._gl.NEAREST);
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, this._canvas);
    this._gl.bindTexture(this._gl.TEXTURE_2D, null);
  }

};

module.exports = Texts;