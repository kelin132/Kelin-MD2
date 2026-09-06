import { i as __require, t as __commonJSMin } from "../../_runtime.mjs";
//#region node_modules/.pnpm/@mongodb-js+saslprep@1.5.0/node_modules/@mongodb-js/saslprep/dist/index.js
var require_dist = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var getCodePoint = (character) => character.codePointAt(0);
	var first = (x) => x[0];
	var last = (x) => x[x.length - 1];
	function toCodePoints(input) {
		const codepoints = [];
		const size = input.length;
		for (let i = 0; i < size; i += 1) {
			const before = input.charCodeAt(i);
			if (before >= 55296 && before <= 56319 && size > i + 1) {
				const next = input.charCodeAt(i + 1);
				if (next >= 56320 && next <= 57343) {
					codepoints.push((before - 55296) * 1024 + next - 56320 + 65536);
					i += 1;
					continue;
				}
			}
			codepoints.push(before);
		}
		return codepoints;
	}
	function saslprep({ unassigned_code_points, commonly_mapped_to_nothing, non_ASCII_space_characters, prohibited_characters, bidirectional_r_al, bidirectional_l }, input, opts = {}) {
		const mapping2space = non_ASCII_space_characters;
		const mapping2nothing = commonly_mapped_to_nothing;
		if (typeof input !== "string") throw new TypeError("Expected string.");
		if (input.length === 0) return "";
		const mapped_input = toCodePoints(input).map((character) => mapping2space.get(character) ? 32 : character).filter((character) => !mapping2nothing.get(character));
		const normalized_input = String.fromCodePoint.apply(null, mapped_input).normalize("NFKC");
		const normalized_map = toCodePoints(normalized_input);
		if (normalized_map.some((character) => prohibited_characters.get(character))) throw new Error("Prohibited character, see https://tools.ietf.org/html/rfc4013#section-2.3");
		if (opts.allowUnassigned !== true) {
			if (normalized_map.some((character) => unassigned_code_points.get(character))) throw new Error("Unassigned code point, see https://tools.ietf.org/html/rfc4013#section-2.5");
		}
		const hasBidiRAL = normalized_map.some((character) => bidirectional_r_al.get(character));
		const hasBidiL = normalized_map.some((character) => bidirectional_l.get(character));
		if (hasBidiRAL && hasBidiL) throw new Error("String must not contain RandALCat and LCat at the same time, see https://tools.ietf.org/html/rfc3454#section-6");
		const isFirstBidiRAL = bidirectional_r_al.get(getCodePoint(first(normalized_input)));
		const isLastBidiRAL = bidirectional_r_al.get(getCodePoint(last(normalized_input)));
		if (hasBidiRAL && !(isFirstBidiRAL && isLastBidiRAL)) throw new Error("Bidirectional RandALCat character must be the first and the last character of the string, see https://tools.ietf.org/html/rfc3454#section-6");
		return normalized_input;
	}
	saslprep.saslprep = saslprep;
	saslprep.default = saslprep;
	module.exports = saslprep;
}));
//#endregion
//#region node_modules/.pnpm/memory-pager@1.5.0/node_modules/memory-pager/index.js
var require_memory_pager = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = Pager;
	function Pager(pageSize, opts) {
		if (!(this instanceof Pager)) return new Pager(pageSize, opts);
		this.length = 0;
		this.updates = [];
		this.path = /* @__PURE__ */ new Uint16Array(4);
		this.pages = new Array(32768);
		this.maxPages = this.pages.length;
		this.level = 0;
		this.pageSize = pageSize || 1024;
		this.deduplicate = opts ? opts.deduplicate : null;
		this.zeros = this.deduplicate ? alloc(this.deduplicate.length) : null;
	}
	Pager.prototype.updated = function(page) {
		while (this.deduplicate && page.buffer[page.deduplicate] === this.deduplicate[page.deduplicate]) {
			page.deduplicate++;
			if (page.deduplicate === this.deduplicate.length) {
				page.deduplicate = 0;
				if (page.buffer.equals && page.buffer.equals(this.deduplicate)) page.buffer = this.deduplicate;
				break;
			}
		}
		if (page.updated || !this.updates) return;
		page.updated = true;
		this.updates.push(page);
	};
	Pager.prototype.lastUpdate = function() {
		if (!this.updates || !this.updates.length) return null;
		var page = this.updates.pop();
		page.updated = false;
		return page;
	};
	Pager.prototype._array = function(i, noAllocate) {
		if (i >= this.maxPages) {
			if (noAllocate) return;
			grow(this, i);
		}
		factor(i, this.path);
		var arr = this.pages;
		for (var j = this.level; j > 0; j--) {
			var p = this.path[j];
			var next = arr[p];
			if (!next) {
				if (noAllocate) return;
				next = arr[p] = new Array(32768);
			}
			arr = next;
		}
		return arr;
	};
	Pager.prototype.get = function(i, noAllocate) {
		var arr = this._array(i, noAllocate);
		var first = this.path[0];
		var page = arr && arr[first];
		if (!page && !noAllocate) {
			page = arr[first] = new Page(i, alloc(this.pageSize));
			if (i >= this.length) this.length = i + 1;
		}
		if (page && page.buffer === this.deduplicate && this.deduplicate && !noAllocate) {
			page.buffer = copy(page.buffer);
			page.deduplicate = 0;
		}
		return page;
	};
	Pager.prototype.set = function(i, buf) {
		var arr = this._array(i, false);
		var first = this.path[0];
		if (i >= this.length) this.length = i + 1;
		if (!buf || this.zeros && buf.equals && buf.equals(this.zeros)) {
			arr[first] = void 0;
			return;
		}
		if (this.deduplicate && buf.equals && buf.equals(this.deduplicate)) buf = this.deduplicate;
		var page = arr[first];
		var b = truncate(buf, this.pageSize);
		if (page) page.buffer = b;
		else arr[first] = new Page(i, b);
	};
	Pager.prototype.toBuffer = function() {
		var list = new Array(this.length);
		var empty = alloc(this.pageSize);
		var ptr = 0;
		while (ptr < list.length) {
			var arr = this._array(ptr, true);
			for (var i = 0; i < 32768 && ptr < list.length; i++) list[ptr++] = arr && arr[i] ? arr[i].buffer : empty;
		}
		return Buffer.concat(list);
	};
	function grow(pager, index) {
		while (pager.maxPages < index) {
			var old = pager.pages;
			pager.pages = new Array(32768);
			pager.pages[0] = old;
			pager.level++;
			pager.maxPages *= 32768;
		}
	}
	function truncate(buf, len) {
		if (buf.length === len) return buf;
		if (buf.length > len) return buf.slice(0, len);
		var cpy = alloc(len);
		buf.copy(cpy);
		return cpy;
	}
	function alloc(size) {
		if (Buffer.alloc) return Buffer.alloc(size);
		var buf = new Buffer(size);
		buf.fill(0);
		return buf;
	}
	function copy(buf) {
		var cpy = Buffer.allocUnsafe ? Buffer.allocUnsafe(buf.length) : new Buffer(buf.length);
		buf.copy(cpy);
		return cpy;
	}
	function Page(i, buf) {
		this.offset = i * buf.length;
		this.buffer = buf;
		this.updated = false;
		this.deduplicate = 0;
	}
	function factor(n, out) {
		n = (n - (out[0] = n & 32767)) / 32768;
		n = (n - (out[1] = n & 32767)) / 32768;
		out[3] = (n - (out[2] = n & 32767)) / 32768 & 32767;
	}
}));
//#endregion
//#region node_modules/.pnpm/sparse-bitfield@3.0.3/node_modules/sparse-bitfield/index.js
var require_sparse_bitfield = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var pager = require_memory_pager();
	module.exports = Bitfield;
	function Bitfield(opts) {
		if (!(this instanceof Bitfield)) return new Bitfield(opts);
		if (!opts) opts = {};
		if (Buffer.isBuffer(opts)) opts = { buffer: opts };
		this.pageOffset = opts.pageOffset || 0;
		this.pageSize = opts.pageSize || 1024;
		this.pages = opts.pages || pager(this.pageSize);
		this.byteLength = this.pages.length * this.pageSize;
		this.length = 8 * this.byteLength;
		if (!powerOfTwo(this.pageSize)) throw new Error("The page size should be a power of two");
		this._trackUpdates = !!opts.trackUpdates;
		this._pageMask = this.pageSize - 1;
		if (opts.buffer) {
			for (var i = 0; i < opts.buffer.length; i += this.pageSize) this.pages.set(i / this.pageSize, opts.buffer.slice(i, i + this.pageSize));
			this.byteLength = opts.buffer.length;
			this.length = 8 * this.byteLength;
		}
	}
	Bitfield.prototype.get = function(i) {
		var o = i & 7;
		var j = (i - o) / 8;
		return !!(this.getByte(j) & 128 >> o);
	};
	Bitfield.prototype.getByte = function(i) {
		var o = i & this._pageMask;
		var j = (i - o) / this.pageSize;
		var page = this.pages.get(j, true);
		return page ? page.buffer[o + this.pageOffset] : 0;
	};
	Bitfield.prototype.set = function(i, v) {
		var o = i & 7;
		var j = (i - o) / 8;
		var b = this.getByte(j);
		return this.setByte(j, v ? b | 128 >> o : b & (255 ^ 128 >> o));
	};
	Bitfield.prototype.toBuffer = function() {
		var all = alloc(this.pages.length * this.pageSize);
		for (var i = 0; i < this.pages.length; i++) {
			var next = this.pages.get(i, true);
			var allOffset = i * this.pageSize;
			if (next) next.buffer.copy(all, allOffset, this.pageOffset, this.pageOffset + this.pageSize);
		}
		return all;
	};
	Bitfield.prototype.setByte = function(i, b) {
		var o = i & this._pageMask;
		var j = (i - o) / this.pageSize;
		var page = this.pages.get(j, false);
		o += this.pageOffset;
		if (page.buffer[o] === b) return false;
		page.buffer[o] = b;
		if (i >= this.byteLength) {
			this.byteLength = i + 1;
			this.length = this.byteLength * 8;
		}
		if (this._trackUpdates) this.pages.updated(page);
		return true;
	};
	function alloc(n) {
		if (Buffer.alloc) return Buffer.alloc(n);
		var b = new Buffer(n);
		b.fill(0);
		return b;
	}
	function powerOfTwo(x) {
		return !(x & x - 1);
	}
}));
//#endregion
//#region node_modules/.pnpm/@mongodb-js+saslprep@1.5.0/node_modules/@mongodb-js/saslprep/dist/memory-code-points.js
var require_memory_code_points = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.createMemoryCodePoints = createMemoryCodePoints;
	var sparse_bitfield_1 = __importDefault(require_sparse_bitfield());
	function createMemoryCodePoints(data) {
		let offset = 0;
		function read() {
			const size = data.readUInt32BE(offset);
			offset += 4;
			const codepoints = data.slice(offset, offset + size);
			offset += size;
			return (0, sparse_bitfield_1.default)({ buffer: codepoints });
		}
		return {
			unassigned_code_points: read(),
			commonly_mapped_to_nothing: read(),
			non_ASCII_space_characters: read(),
			prohibited_characters: read(),
			bidirectional_r_al: read(),
			bidirectional_l: read()
		};
	}
}));
//#endregion
//#region node_modules/.pnpm/@mongodb-js+saslprep@1.5.0/node_modules/@mongodb-js/saslprep/dist/code-points-data.js
var require_code_points_data = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = (0, __require("zlib").gunzipSync)(Buffer.from("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", "base64"));
}));
//#endregion
//#region node_modules/.pnpm/@mongodb-js+saslprep@1.5.0/node_modules/@mongodb-js/saslprep/dist/node.js
var require_node = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	var index_1 = __importDefault(require_dist());
	var memory_code_points_1 = require_memory_code_points();
	var code_points_data_1 = __importDefault(require_code_points_data());
	var codePoints = (0, memory_code_points_1.createMemoryCodePoints)(code_points_data_1.default);
	function saslprep(input, opts) {
		return (0, index_1.default)(codePoints, input, opts);
	}
	saslprep.saslprep = saslprep;
	saslprep.default = saslprep;
	module.exports = saslprep;
}));
//#endregion
export { require_node as t };
