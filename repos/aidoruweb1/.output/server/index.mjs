globalThis.__nitro_main__ = import.meta.url;
import { n as serve, t as NodeResponse } from "./_libs/srvx.mjs";
import { i as toEventHandler, n as defineHandler, o as HTTPError, r as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.2.2_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/aidoru-bg-cards.webp": {
		"type": "image/webp",
		"etag": "\"8b54-yed73YUEAAVaeppqX/E4H9WnbjI\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 35668,
		"path": "../public/aidoru-bg-cards.webp"
	},
	"/aidoru-bg-guild.webp": {
		"type": "image/webp",
		"etag": "\"15dac-+nMj9afNC3iYIxA81s13MS23YGg\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 89516,
		"path": "../public/aidoru-bg-guild.webp"
	},
	"/aidoru-bg-leaderboard.webp": {
		"type": "image/webp",
		"etag": "\"d686-bNKpH+rIsJVVTll2lZdPEpxl1XQ\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 54918,
		"path": "../public/aidoru-bg-leaderboard.webp"
	},
	"/aidoru-bg-pets.webp": {
		"type": "image/webp",
		"etag": "\"bc28-2URkOgnCNRFwBG84QqhzrHUpK0o\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 48168,
		"path": "../public/aidoru-bg-pets.webp"
	},
	"/aidoru-login-hutao.webp": {
		"type": "image/webp",
		"etag": "\"be86-oEg2qcXdAqozOAjpGhobYcuT8nA\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 48774,
		"path": "../public/aidoru-login-hutao.webp"
	},
	"/aidoru-login-anime.webp": {
		"type": "image/webp",
		"etag": "\"10580-NgW4MzBRQyv3GzwY8NOHNxIQtEk\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 66944,
		"path": "../public/aidoru-login-anime.webp"
	},
	"/favicon.png": {
		"type": "image/png",
		"etag": "\"2b2e-HIWZ790ZGQIVH7K3B3n666wS23o\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 11054,
		"path": "../public/favicon.png"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"a0-CKGXSIe7TSsqDTmGm/nY1t/o5d0\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 160,
		"path": "../public/robots.txt"
	},
	"/aidoru-login-library.webp": {
		"type": "image/webp",
		"etag": "\"2e808-z+69KTN2o/GC5JijLR+6fVK59Zc\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 190472,
		"path": "../public/aidoru-login-library.webp"
	},
	"/aidoru-community/community-01.webp": {
		"type": "image/webp",
		"etag": "\"2acde-GCgeqVHBAPWR1hwW91z/voa2T+I\"",
		"mtime": "2026-09-05T11:32:52.694Z",
		"size": 175326,
		"path": "../public/aidoru-community/community-01.webp"
	},
	"/aidoru-community/community-03.webp": {
		"type": "image/webp",
		"etag": "\"7938-i+r6dch++afXyV2hlecpizGIC+8\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 31032,
		"path": "../public/aidoru-community/community-03.webp"
	},
	"/aidoru-community/community-02.webp": {
		"type": "image/webp",
		"etag": "\"b24a-+x+T1Q04SmMkaMzxdlno2RT7pu0\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 45642,
		"path": "../public/aidoru-community/community-02.webp"
	},
	"/aidoru-community/community-04.webp": {
		"type": "image/webp",
		"etag": "\"a1c8-KuP4TBgTI/SsIZavB0wpZnUeQpE\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 41416,
		"path": "../public/aidoru-community/community-04.webp"
	},
	"/aidoru-community/community-05.webp": {
		"type": "image/webp",
		"etag": "\"b832-7/Tc3RdfI9SFc/EMCpt34B2D3fI\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 47154,
		"path": "../public/aidoru-community/community-05.webp"
	},
	"/aidoru-community/community-07.webp": {
		"type": "image/webp",
		"etag": "\"d392-iU6/bMoTypfqDlrMYViagfuNVIU\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 54162,
		"path": "../public/aidoru-community/community-07.webp"
	},
	"/aidoru-community/community-08.webp": {
		"type": "image/webp",
		"etag": "\"86fe-xSvMM0Mii9bvg72vnxRrzYY2A+E\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 34558,
		"path": "../public/aidoru-community/community-08.webp"
	},
	"/aidoru-community/community-06.webp": {
		"type": "image/webp",
		"etag": "\"19ad8-ND2b2RQYuMRaRMMpFFAdQt/AjF0\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 105176,
		"path": "../public/aidoru-community/community-06.webp"
	},
	"/aidoru-community/community-09.webp": {
		"type": "image/webp",
		"etag": "\"a3ba-JW8zyYwOsxvjfeXB2HEzO4YKPOU\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 41914,
		"path": "../public/aidoru-community/community-09.webp"
	},
	"/aidoru-battle-preview.png": {
		"type": "image/png",
		"etag": "\"14ed9c-S/g+yxK4OZb1lcO6Z4UnHbS26rE\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 1371548,
		"path": "../public/aidoru-battle-preview.png"
	},
	"/assets/AppShell-pZuFJ2fk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"aa1b-K4XRUDII33a0qkgooW6t3OfIvFo\"",
		"mtime": "2026-09-05T11:32:51.552Z",
		"size": 43547,
		"path": "../public/assets/AppShell-pZuFJ2fk.js"
	},
	"/aidoru-community/community-11.webp": {
		"type": "image/webp",
		"etag": "\"8a18-cI3FSBtiJVaUEtbbAGMh/z9+erE\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 35352,
		"path": "../public/aidoru-community/community-11.webp"
	},
	"/aidoru-community/community-10.webp": {
		"type": "image/webp",
		"etag": "\"bda8-MEfE4s1la5KR7EiHgtJRN1Gecs8\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 48552,
		"path": "../public/aidoru-community/community-10.webp"
	},
	"/assets/ConnectionNotice-CHoXkCnw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7bfe-x9xY20U5dDXSfmE0XNbTjOmOxtU\"",
		"mtime": "2026-09-05T11:32:51.552Z",
		"size": 31742,
		"path": "../public/assets/ConnectionNotice-CHoXkCnw.js"
	},
	"/assets/arcade-BSVn1gA6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"21b7-sHE4v3BplaRdaKhBBKP7NfhaAe8\"",
		"mtime": "2026-09-05T11:32:51.552Z",
		"size": 8631,
		"path": "../public/assets/arcade-BSVn1gA6.js"
	},
	"/assets/battle-Ddv2C2gd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"328e-lWvDRxyXAPIrXFrfpFT2xT+gFxo\"",
		"mtime": "2026-09-05T11:32:51.552Z",
		"size": 12942,
		"path": "../public/assets/battle-Ddv2C2gd.js"
	},
	"/assets/battle._roomId-D5U3QV8P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a4c-pLL+P0oEih9DBax7ezJiBlb/kGg\"",
		"mtime": "2026-09-05T11:32:51.552Z",
		"size": 27212,
		"path": "../public/assets/battle._roomId-D5U3QV8P.js"
	},
	"/assets/cards-BYHZBlVc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2767-2L23OMY5pSXLAQg2mPU/Y5IvVv8\"",
		"mtime": "2026-09-05T11:32:51.552Z",
		"size": 10087,
		"path": "../public/assets/cards-BYHZBlVc.js"
	},
	"/assets/coins-BooLeGdE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11e-whGI79P33GeDBV6puYChAuAR308\"",
		"mtime": "2026-09-05T11:32:51.552Z",
		"size": 286,
		"path": "../public/assets/coins-BooLeGdE.js"
	},
	"/assets/confetti.module-Uxh4CK4s.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2944-oRi9RNoHIQ6m6VjGQuuOhDQSXMg\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 10564,
		"path": "../public/assets/confetti.module-Uxh4CK4s.js"
	},
	"/assets/crown-BsbIjUeA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"16b-01xKG7v29QnUGBS26iPQCzS75EI\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 363,
		"path": "../public/assets/crown-BsbIjUeA.js"
	},
	"/assets/dashboard-BY-sko-v.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1364-B7++diEKNdGSiMORjc3O0BIbovY\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 4964,
		"path": "../public/assets/dashboard-BY-sko-v.js"
	},
	"/assets/guild-Dmru1_uf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"38c8-gzknSIFDjOcoHMU34aTpLxvkbyQ\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 14536,
		"path": "../public/assets/guild-Dmru1_uf.js"
	},
	"/assets/index-Dsv75wTW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4e290-b/20KFuLjtWSyNPYX45CFVoAdLs\"",
		"mtime": "2026-09-05T11:32:51.547Z",
		"size": 320144,
		"path": "../public/assets/index-Dsv75wTW.js"
	},
	"/assets/journey-gGmU_cNB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2777-rveX51JGaFJGa9njrw+oDDPE/g0\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 10103,
		"path": "../public/assets/journey-gGmU_cNB.js"
	},
	"/assets/loader-circle-Bj9eWIom.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"199-f229hWsADTAj8F6yU5j4tkl9Hug\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 409,
		"path": "../public/assets/loader-circle-Bj9eWIom.js"
	},
	"/assets/mart-BYpMAJON.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e16-dsfbGCDsACuFwbE7SUzJEWSO6WI\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 7702,
		"path": "../public/assets/mart-BYpMAJON.js"
	},
	"/assets/mutation-HsXvOX05.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"efba-lUbjzq2KEhnHURpMu9+GVC0mSSE\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 61370,
		"path": "../public/assets/mutation-HsXvOX05.js"
	},
	"/assets/pets-CFn6d4Nx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2862-/+A9BDkX+SQdFKxMOQIXyAqKDFY\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 10338,
		"path": "../public/assets/pets-CFn6d4Nx.js"
	},
	"/aidoru-bg-leaderboard.png": {
		"type": "image/png",
		"etag": "\"362e5c-bXRHa8mj+GyiBlUqkph5rmLim6c\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 3550812,
		"path": "../public/aidoru-bg-leaderboard.png"
	},
	"/assets/plus-CPaNqes7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-9TfuNwRNTGzbBbf4PoU5IMyZkFw\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 154,
		"path": "../public/assets/plus-CPaNqes7.js"
	},
	"/aidoru-bg-pets.png": {
		"type": "image/png",
		"etag": "\"368c0c-QlR8F5O59BhjtlOnHV/Nc3KYUOI\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 3574796,
		"path": "../public/aidoru-bg-pets.png"
	},
	"/assets/profile-DHx7OTbb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"444b-d4AnbQhGA8m4ojxOW+BU36EjKUg\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 17483,
		"path": "../public/assets/profile-DHx7OTbb.js"
	},
	"/assets/react-dV6gCyaE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d7a8-XuYiFIo9usSQFLoe8tzGgmwXZMk\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 120744,
		"path": "../public/assets/react-dV6gCyaE.js"
	},
	"/assets/routes-Cd_7Ifeo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3887-4SakP1fgzdr7/EhycIYdvKFMa3Y\"",
		"mtime": "2026-09-05T11:32:51.553Z",
		"size": 14471,
		"path": "../public/assets/routes-Cd_7Ifeo.js"
	},
	"/assets/search-Bj-Ttl4R.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"af-5hn+OMZ7NjM6L9gejlapKilsUpA\"",
		"mtime": "2026-09-05T11:32:51.554Z",
		"size": 175,
		"path": "../public/assets/search-Bj-Ttl4R.js"
	},
	"/assets/styles-DeEDdaMv.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"33249-m/t7rHIUdH0HNzFnu04YkPndvPw\"",
		"mtime": "2026-09-05T11:32:51.554Z",
		"size": 209481,
		"path": "../public/assets/styles-DeEDdaMv.css"
	},
	"/aidoru-bg-cards.png": {
		"type": "image/png",
		"etag": "\"36524b-VhSyt7qbcqh7/pknWM6sTtefJ+c\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 3560011,
		"path": "../public/aidoru-bg-cards.png"
	},
	"/assets/trophy-Bsm71C8v.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dd-CyiP1eUjFGHSx5vdWMf3NMNg00s\"",
		"mtime": "2026-09-05T11:32:51.554Z",
		"size": 477,
		"path": "../public/assets/trophy-Bsm71C8v.js"
	},
	"/assets/wallet-cards-BWSjMnuN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"149-rXCoF6GoRsWIpsnPswHfMWFL3uU\"",
		"mtime": "2026-09-05T11:32:51.554Z",
		"size": 329,
		"path": "../public/assets/wallet-cards-BWSjMnuN.js"
	},
	"/battle-gym/pewter_gym.png": {
		"type": "image/png",
		"etag": "\"635-Of+eT8AVD3HvUG9Vh81ax1HJemk\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 1589,
		"path": "../public/battle-gym/pewter_gym.png"
	},
	"/battle-gym/psychic.png": {
		"type": "image/png",
		"etag": "\"1a2-0mlsMEbAlBDNLrsLZOYoh8EIvpc\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 418,
		"path": "../public/battle-gym/psychic.png"
	},
	"/battle-gym/saffron_gym.png": {
		"type": "image/png",
		"etag": "\"35c-Nhb2TYJBn1yf2K2V5g597DAbFmA\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 860,
		"path": "../public/battle-gym/saffron_gym.png"
	},
	"/battle-gym/vermilion_gym.png": {
		"type": "image/png",
		"etag": "\"4b7-zu3CPoSbEpqyAphv7FPZZYIGPTQ\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 1207,
		"path": "../public/battle-gym/vermilion_gym.png"
	},
	"/battle-gym/viridian_gym.png": {
		"type": "image/png",
		"etag": "\"35c-9i/ZXW6JoqpyOsQ/vx287pA2VPE\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 860,
		"path": "../public/battle-gym/viridian_gym.png"
	},
	"/aidoru-login-hutao.png": {
		"type": "image/png",
		"etag": "\"3cee81-kH8SaBsnmfJlvPIB6SNv4G/gvvc\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 3993217,
		"path": "../public/aidoru-login-hutao.png"
	},
	"/battle-gym/grassy.webp": {
		"type": "image/webp",
		"etag": "\"98c6-m2auY7COiYySM5f8D97XuSo6Shw\"",
		"mtime": "2026-09-05T11:32:52.695Z",
		"size": 39110,
		"path": "../public/battle-gym/grassy.webp"
	},
	"/battle-gym/water.png": {
		"type": "image/png",
		"etag": "\"ed1-7v86VSlGFulJXhdPqhTSKytq6w0\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 3793,
		"path": "../public/battle-gym/water.png"
	},
	"/battle-gym/stadium.webp": {
		"type": "image/webp",
		"etag": "\"1cb08-tSIg0SwKFyaHxBVUJGniqrceeB4\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 117512,
		"path": "../public/battle-gym/stadium.webp"
	},
	"/battle-music/mus_too_bad.mp3": {
		"type": "audio/mpeg",
		"etag": "\"bbe6-RsxiXq1oEkr4/ItPuMRUfJ7cHaA\"",
		"mtime": "2026-09-05T11:32:52.694Z",
		"size": 48102,
		"path": "../public/battle-music/mus_too_bad.mp3"
	},
	"/aidoru-pink-leaf-bg.jpg": {
		"type": "image/jpeg",
		"etag": "\"40c2cf-r7L7JO/4uDfUa2Lm1y+W3N9C1Ck\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 4244175,
		"path": "../public/aidoru-pink-leaf-bg.jpg"
	},
	"/battle-music/mus_victory_gym_leader.mp3": {
		"type": "audio/mpeg",
		"etag": "\"b4de6-DQZ4U+zC7Wb9R4lluNhB9rkdPRw\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 740838,
		"path": "../public/battle-music/mus_victory_gym_leader.mp3"
	},
	"/aidoru-bg-guild.png": {
		"type": "image/png",
		"etag": "\"4abeac-d5pOHOGW18LmaRyp0mteUqTEqRI\"",
		"mtime": "2026-09-05T11:32:52.718Z",
		"size": 4898476,
		"path": "../public/aidoru-bg-guild.png"
	},
	"/battle-music/mus_victory_road.mp3": {
		"type": "audio/mpeg",
		"etag": "\"7f8d3-f/q6haytWHI/XGpodvjVaNkhanw\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 522451,
		"path": "../public/battle-music/mus_victory_road.mp3"
	},
	"/battle-music/mus_victory_trainer.mp3": {
		"type": "audio/mpeg",
		"etag": "\"3ca64-1O9LFtpmdOQ7JpE8ViH+WPB1yps\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 248420,
		"path": "../public/battle-music/mus_victory_trainer.mp3"
	},
	"/battle-music/se_ball_open.mp3": {
		"type": "audio/mpeg",
		"etag": "\"51a3-i17b1iRm2aoWaKp2k2AbhXLOVAo\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 20899,
		"path": "../public/battle-music/se_ball_open.mp3"
	},
	"/battle-music/se_ball_throw.mp3": {
		"type": "audio/mpeg",
		"etag": "\"3d1a-5ECYAAXcqB6ZLHyqEk1vZ0Ctu6s\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 15642,
		"path": "../public/battle-music/se_ball_throw.mp3"
	},
	"/battle-trainers/brendan.png": {
		"type": "image/png",
		"etag": "\"2b0-n3CwdDMFv/mmoFI9795rbpmCq2A\"",
		"mtime": "2026-09-05T11:32:52.694Z",
		"size": 688,
		"path": "../public/battle-trainers/brendan.png"
	},
	"/battle-trainers/leaf.png": {
		"type": "image/png",
		"etag": "\"2d2-ax9vaKAC0H5USpbTSqwqWfvF3S0\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 722,
		"path": "../public/battle-trainers/leaf.png"
	},
	"/battle-trainers/may.png": {
		"type": "image/png",
		"etag": "\"2ab-wtiNbonuja+LedWEt/6vZaM/BG0\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 683,
		"path": "../public/battle-trainers/may.png"
	},
	"/battle-trainers/red.png": {
		"type": "image/png",
		"etag": "\"2b3-Rhy/5Mx7caBAQgNV6+npvXezqBE\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 691,
		"path": "../public/battle-trainers/red.png"
	},
	"/battle-music/se_exp.mp3": {
		"type": "audio/mpeg",
		"etag": "\"9ff3-oqFVDmBhaVSHypvh2l1afijOg90\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 40947,
		"path": "../public/battle-music/se_exp.mp3"
	},
	"/battle-music/se_failure.mp3": {
		"type": "audio/mpeg",
		"etag": "\"ec09-jFCaQiGZlWd/aNJPauSomj5PydA\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 60425,
		"path": "../public/battle-music/se_failure.mp3"
	},
	"/page-previews/cards.jpg": {
		"type": "image/jpeg",
		"etag": "\"be52-JGGcuVZn2jtpggmMoQO8SYPlhC4\"",
		"mtime": "2026-09-05T11:32:52.694Z",
		"size": 48722,
		"path": "../public/page-previews/cards.jpg"
	},
	"/battle-music/se_faint.mp3": {
		"type": "audio/mpeg",
		"etag": "\"8d0c-mvuugHySWlGgfP6JyPlIM5olgSc\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 36108,
		"path": "../public/battle-music/se_faint.mp3"
	},
	"/page-previews/dashboard.jpg": {
		"type": "image/jpeg",
		"etag": "\"9bd1-3aPOTtp6iK5L336kUImXugqwHR8\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 39889,
		"path": "../public/page-previews/dashboard.jpg"
	},
	"/battle-music/mus_vs_gym_leader.mp3": {
		"type": "audio/mpeg",
		"etag": "\"e7127-ie0pRgR82YhiDQuC/dXHJFFUQBs\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 946471,
		"path": "../public/battle-music/mus_vs_gym_leader.mp3"
	},
	"/battle-music/mus_vs_wild.mp3": {
		"type": "audio/mpeg",
		"etag": "\"aa6d7-vCyCFkRcip8hUi5y5TJKUfJtqbM\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 698071,
		"path": "../public/battle-music/mus_vs_wild.mp3"
	},
	"/page-previews/guild.jpg": {
		"type": "image/jpeg",
		"etag": "\"f218-UJoSfokIVBCOcUbVmkWrgr/eHUU\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 61976,
		"path": "../public/page-previews/guild.jpg"
	},
	"/page-previews/journey.jpg": {
		"type": "image/jpeg",
		"etag": "\"19c00-ZgDhRTGAf0owSscZENBz395bH3Q\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 105472,
		"path": "../public/page-previews/journey.jpg"
	},
	"/page-previews/mart.jpg": {
		"type": "image/jpeg",
		"etag": "\"8267-VzvmUdGCS4lDF3gNbdSuAEd/cZ0\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 33383,
		"path": "../public/page-previews/mart.jpg"
	},
	"/page-previews/pets.jpg": {
		"type": "image/jpeg",
		"etag": "\"c852-JHqZeKbxWi8vVtkvn5+HMH3JN0I\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 51282,
		"path": "../public/page-previews/pets.jpg"
	},
	"/page-previews/profile.jpg": {
		"type": "image/jpeg",
		"etag": "\"9db7-4g9MpdH/oBnMKaoWs116DCqjx7c\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 40375,
		"path": "../public/page-previews/profile.jpg"
	},
	"/battle-music/mus_vs_trainer.mp3": {
		"type": "audio/mpeg",
		"etag": "\"178c71-tLjXSvzSSLOY64uiZa+ahtvlegM\"",
		"mtime": "2026-09-05T11:32:52.697Z",
		"size": 1543281,
		"path": "../public/battle-music/mus_vs_trainer.mp3"
	},
	"/battle-music/mus_vs_champion.mp3": {
		"type": "audio/mpeg",
		"etag": "\"136858-22YLZiylYdfUo7M5feN0xCXZt8g\"",
		"mtime": "2026-09-05T11:32:52.696Z",
		"size": 1271896,
		"path": "../public/battle-music/mus_vs_champion.mp3"
	},
	"/page-previews/welcome.jpg": {
		"type": "image/jpeg",
		"etag": "\"f97a-WwC0gSbuUVJ7mYxsRObe0VO09/w\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 63866,
		"path": "../public/page-previews/welcome.jpg"
	},
	"/pokemon-gifs/1.gif": {
		"type": "image/gif",
		"etag": "\"76f9-FGyViPkIr6LIJrlzNZP0Fm1ANMQ\"",
		"mtime": "2026-09-05T11:32:52.694Z",
		"size": 30457,
		"path": "../public/pokemon-gifs/1.gif"
	},
	"/pokemon-gifs/10.gif": {
		"type": "image/gif",
		"etag": "\"63d0-mtX0pKvir5x+cld4r9j/FS3t624\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 25552,
		"path": "../public/pokemon-gifs/10.gif"
	},
	"/pokemon-gifs/100.gif": {
		"type": "image/gif",
		"etag": "\"42d3-XvmOHVs+JoHyQlGA+ZR13wxhuPM\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 17107,
		"path": "../public/pokemon-gifs/100.gif"
	},
	"/pokemon-gifs/101.gif": {
		"type": "image/gif",
		"etag": "\"fdfa-9+wbQoQvp/4Z5VUGiNHGqq53G7A\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 65018,
		"path": "../public/pokemon-gifs/101.gif"
	},
	"/pokemon-gifs/102.gif": {
		"type": "image/gif",
		"etag": "\"a7bd-T/0wEU7ka2pOt2MhAilDVsLKcf0\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 42941,
		"path": "../public/pokemon-gifs/102.gif"
	},
	"/pokemon-gifs/104.gif": {
		"type": "image/gif",
		"etag": "\"75fa-XvC16XTo5FYG5XfBBkBsgXOaUUQ\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 30202,
		"path": "../public/pokemon-gifs/104.gif"
	},
	"/pokemon-gifs/103.gif": {
		"type": "image/gif",
		"etag": "\"11bbb-Gw52HtsRzkojfP/QiFwfyHfApUA\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 72635,
		"path": "../public/pokemon-gifs/103.gif"
	},
	"/pokemon-gifs/105.gif": {
		"type": "image/gif",
		"etag": "\"7de2-jf5CU23+8jyDadZt+ilSEdBPvTk\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 32226,
		"path": "../public/pokemon-gifs/105.gif"
	},
	"/pokemon-gifs/106.gif": {
		"type": "image/gif",
		"etag": "\"6a7d-JdIzig/sDF5eFwZx+6fnDcHtqRE\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 27261,
		"path": "../public/pokemon-gifs/106.gif"
	},
	"/pokemon-gifs/107.gif": {
		"type": "image/gif",
		"etag": "\"4747-7qvEMEhhZp1v3TWqMcP1Lo0o2L4\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 18247,
		"path": "../public/pokemon-gifs/107.gif"
	},
	"/pokemon-gifs/108.gif": {
		"type": "image/gif",
		"etag": "\"61b8-ph1fYn/XZHFO8Kic0hSMz9rjjVM\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 25016,
		"path": "../public/pokemon-gifs/108.gif"
	},
	"/pokemon-gifs/11.gif": {
		"type": "image/gif",
		"etag": "\"7bd3-+rjxRYZAsD07SxlI+sc+3TubANo\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 31699,
		"path": "../public/pokemon-gifs/11.gif"
	},
	"/pokemon-gifs/109.gif": {
		"type": "image/gif",
		"etag": "\"1508f-Ye6eri9sIp3lHPJ9UuzYNops/D4\"",
		"mtime": "2026-09-05T11:32:52.698Z",
		"size": 86159,
		"path": "../public/pokemon-gifs/109.gif"
	},
	"/pokemon-gifs/111.gif": {
		"type": "image/gif",
		"etag": "\"14e20-BlOK44BGPPCjmnlXOnWoq+1BkHc\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 85536,
		"path": "../public/pokemon-gifs/111.gif"
	},
	"/pokemon-gifs/110.gif": {
		"type": "image/gif",
		"etag": "\"4dac1-mHYj8RxO9FbbQPSaMzVgdNPDySk\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 318145,
		"path": "../public/pokemon-gifs/110.gif"
	},
	"/pokemon-gifs/113.gif": {
		"type": "image/gif",
		"etag": "\"c5e5-0QmYnIJKnNR2HrgF+GW49bcXp2Y\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 50661,
		"path": "../public/pokemon-gifs/113.gif"
	},
	"/pokemon-gifs/112.gif": {
		"type": "image/gif",
		"etag": "\"12ed9-XRJNPHRLh+DI3djzbdWGIm+ndkk\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 77529,
		"path": "../public/pokemon-gifs/112.gif"
	},
	"/pokemon-gifs/114.gif": {
		"type": "image/gif",
		"etag": "\"e3c6-kVOQDpgZ0knjVR4G1c5QSblUto8\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 58310,
		"path": "../public/pokemon-gifs/114.gif"
	},
	"/pokemon-gifs/115.gif": {
		"type": "image/gif",
		"etag": "\"16e10-MQopEzyjdtQwpYIGwxWN6TAW81Y\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 93712,
		"path": "../public/pokemon-gifs/115.gif"
	},
	"/pokemon-gifs/116.gif": {
		"type": "image/gif",
		"etag": "\"7a20-jYq1pKEqPSWn7weZpvUn/q7bEXw\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 31264,
		"path": "../public/pokemon-gifs/116.gif"
	},
	"/pokemon-gifs/117.gif": {
		"type": "image/gif",
		"etag": "\"e73c-RCiuPI7+i49BiBZH/iFpV/Q9kxc\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 59196,
		"path": "../public/pokemon-gifs/117.gif"
	},
	"/pokemon-gifs/118.gif": {
		"type": "image/gif",
		"etag": "\"bcbb-8izUqN0F2xoN+/sGad2USqtpFbA\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 48315,
		"path": "../public/pokemon-gifs/118.gif"
	},
	"/pokemon-gifs/119.gif": {
		"type": "image/gif",
		"etag": "\"bf45-CrJ+/k0yoW2Aag2XMJosqBn7Quc\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 48965,
		"path": "../public/pokemon-gifs/119.gif"
	},
	"/pokemon-gifs/120.gif": {
		"type": "image/gif",
		"etag": "\"92f0-LIofKyI/LcPDx1/S+8fLCd3sKuE\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 37616,
		"path": "../public/pokemon-gifs/120.gif"
	},
	"/pokemon-gifs/12.gif": {
		"type": "image/gif",
		"etag": "\"1688d-PPlQmFSymsTmQn7PRBaXCD0DcM4\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 92301,
		"path": "../public/pokemon-gifs/12.gif"
	},
	"/pokemon-gifs/121.gif": {
		"type": "image/gif",
		"etag": "\"d839-viNNYfv9huT9pAO+sxXFG7bmhYE\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 55353,
		"path": "../public/pokemon-gifs/121.gif"
	},
	"/pokemon-gifs/122.gif": {
		"type": "image/gif",
		"etag": "\"12c87-Z4BwKDXaUbSzbnHJpk48ALVzBAA\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 76935,
		"path": "../public/pokemon-gifs/122.gif"
	},
	"/pokemon-gifs/123.gif": {
		"type": "image/gif",
		"etag": "\"14156-fLsMmf9bkqwcVqv+c5fZZCtszco\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 82262,
		"path": "../public/pokemon-gifs/123.gif"
	},
	"/pokemon-gifs/125.gif": {
		"type": "image/gif",
		"etag": "\"bd9f-Aof/JG6ZY6HKCqc2UqoSuPA0S9Q\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 48543,
		"path": "../public/pokemon-gifs/125.gif"
	},
	"/pokemon-gifs/124.gif": {
		"type": "image/gif",
		"etag": "\"123ba-/WTBYUU3mHP5vthCAgW64H2AMUI\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 74682,
		"path": "../public/pokemon-gifs/124.gif"
	},
	"/pokemon-gifs/126.gif": {
		"type": "image/gif",
		"etag": "\"fde5-lJA+StQFIqsAXJGIGyVpaOmQS5Q\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 64997,
		"path": "../public/pokemon-gifs/126.gif"
	},
	"/pokemon-gifs/127.gif": {
		"type": "image/gif",
		"etag": "\"cda2-t+bSYiS3jpkSFz7P0gWa5cm19hs\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 52642,
		"path": "../public/pokemon-gifs/127.gif"
	},
	"/pokemon-gifs/129.gif": {
		"type": "image/gif",
		"etag": "\"47ce-v4H7SUQVA8koijLcTzlmCboEQMk\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 18382,
		"path": "../public/pokemon-gifs/129.gif"
	},
	"/pokemon-gifs/128.gif": {
		"type": "image/gif",
		"etag": "\"eee8-nB0URldu7ZFEIHjWtfxiA4bPgZk\"",
		"mtime": "2026-09-05T11:32:52.699Z",
		"size": 61160,
		"path": "../public/pokemon-gifs/128.gif"
	},
	"/pokemon-gifs/13.gif": {
		"type": "image/gif",
		"etag": "\"6be7-m6s0RV3WzUzduzCiEfz0P7MGP00\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 27623,
		"path": "../public/pokemon-gifs/13.gif"
	},
	"/pokemon-gifs/130.gif": {
		"type": "image/gif",
		"etag": "\"194eb-SASsYpREb4AB0BzhpZL7zVfKSKE\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 103659,
		"path": "../public/pokemon-gifs/130.gif"
	},
	"/pokemon-gifs/133.gif": {
		"type": "image/gif",
		"etag": "\"4cc8-UPCsL4MJuysWwR6n+gRPRMFCkIk\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 19656,
		"path": "../public/pokemon-gifs/133.gif"
	},
	"/pokemon-gifs/132.gif": {
		"type": "image/gif",
		"etag": "\"66c8-z6xcp/yiZnOrwurTvZ6qfLxuqQM\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 26312,
		"path": "../public/pokemon-gifs/132.gif"
	},
	"/pokemon-gifs/131.gif": {
		"type": "image/gif",
		"etag": "\"1a8f5-XEtHK8x5ffq0VA6uF2dNHJxciPE\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 108789,
		"path": "../public/pokemon-gifs/131.gif"
	},
	"/pokemon-gifs/134.gif": {
		"type": "image/gif",
		"etag": "\"11cf6-b97FGsm1sRVsI3P2QJ7wkP2VSTc\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 72950,
		"path": "../public/pokemon-gifs/134.gif"
	},
	"/pokemon-gifs/135.gif": {
		"type": "image/gif",
		"etag": "\"8fc8-J6o0xKBT6Q3XjRVVteK1OKjRbsQ\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 36808,
		"path": "../public/pokemon-gifs/135.gif"
	},
	"/pokemon-gifs/137.gif": {
		"type": "image/gif",
		"etag": "\"5986-OlfrBVHLPFzSX5WbacZOTFdb188\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 22918,
		"path": "../public/pokemon-gifs/137.gif"
	},
	"/pokemon-gifs/136.gif": {
		"type": "image/gif",
		"etag": "\"866f-kJZxPCKKcoEALwIpe+lwoZNJxwA\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 34415,
		"path": "../public/pokemon-gifs/136.gif"
	},
	"/pokemon-gifs/138.gif": {
		"type": "image/gif",
		"etag": "\"cb8a-xH7WxU+bE+0Nh1VHVq6u4QmFhGI\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 52106,
		"path": "../public/pokemon-gifs/138.gif"
	},
	"/pokemon-gifs/140.gif": {
		"type": "image/gif",
		"etag": "\"7aa5-u1Zx24Qa79WB60wh9uppDrSXQHQ\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 31397,
		"path": "../public/pokemon-gifs/140.gif"
	},
	"/pokemon-gifs/139.gif": {
		"type": "image/gif",
		"etag": "\"15515-KpHDqCqU/vbB8a+hOCmEegUq8Y4\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 87317,
		"path": "../public/pokemon-gifs/139.gif"
	},
	"/pokemon-gifs/14.gif": {
		"type": "image/gif",
		"etag": "\"c259-JmU0+iX6JITl6CS73c5awd7m7iA\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 49753,
		"path": "../public/pokemon-gifs/14.gif"
	},
	"/pokemon-gifs/141.gif": {
		"type": "image/gif",
		"etag": "\"a070-duDpC3CWHcoJxuFs655XyMgbHjo\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 41072,
		"path": "../public/pokemon-gifs/141.gif"
	},
	"/pokemon-gifs/142.gif": {
		"type": "image/gif",
		"etag": "\"feae-Y9N+kOgnWeIQllIm7nUGY8ugqd0\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 65198,
		"path": "../public/pokemon-gifs/142.gif"
	},
	"/pokemon-gifs/143.gif": {
		"type": "image/gif",
		"etag": "\"1305e-VXbkV2o4k4KqLXvKavt2E4UGBto\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 77918,
		"path": "../public/pokemon-gifs/143.gif"
	},
	"/pokemon-gifs/144.gif": {
		"type": "image/gif",
		"etag": "\"11c08-clX6Xf5oj7qHMctS+rhNjbwS7m0\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 72712,
		"path": "../public/pokemon-gifs/144.gif"
	},
	"/pokemon-gifs/145.gif": {
		"type": "image/gif",
		"etag": "\"c090-T1bO51WpRV9ns7aFkTxldHLV1nM\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 49296,
		"path": "../public/pokemon-gifs/145.gif"
	},
	"/pokemon-gifs/148.gif": {
		"type": "image/gif",
		"etag": "\"ca68-7tfwR9Rfm6kmfcx2dZE+Zi17iXU\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 51816,
		"path": "../public/pokemon-gifs/148.gif"
	},
	"/pokemon-gifs/149.gif": {
		"type": "image/gif",
		"etag": "\"d7ac-Bv+ci7kp1u1Pi3519i03QfqMb4s\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 55212,
		"path": "../public/pokemon-gifs/149.gif"
	},
	"/pokemon-gifs/146.gif": {
		"type": "image/gif",
		"etag": "\"18eb4-+VVRMT2SzFdbSfNG6CuGf1wAae4\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 102068,
		"path": "../public/pokemon-gifs/146.gif"
	},
	"/pokemon-gifs/147.gif": {
		"type": "image/gif",
		"etag": "\"7717-1LWKWV5z1rHXua5C4WEmgJHskZo\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 30487,
		"path": "../public/pokemon-gifs/147.gif"
	},
	"/pokemon-gifs/151.gif": {
		"type": "image/gif",
		"etag": "\"679a-ICWWD6vL9uO+PiIDLQweTwOpab0\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 26522,
		"path": "../public/pokemon-gifs/151.gif"
	},
	"/pokemon-gifs/15.gif": {
		"type": "image/gif",
		"etag": "\"1fb93-7buX5S14OfgpaaayRs93qNKCSTw\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 129939,
		"path": "../public/pokemon-gifs/15.gif"
	},
	"/pokemon-gifs/152.gif": {
		"type": "image/gif",
		"etag": "\"7147-SS88vluOoFPtGql2ALiGZbtRVq8\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 28999,
		"path": "../public/pokemon-gifs/152.gif"
	},
	"/pokemon-gifs/150.gif": {
		"type": "image/gif",
		"etag": "\"1aaad-ar2hWCcrsV6MNZhHhgQJNTAnvh8\"",
		"mtime": "2026-09-05T11:32:52.700Z",
		"size": 109229,
		"path": "../public/pokemon-gifs/150.gif"
	},
	"/pokemon-gifs/153.gif": {
		"type": "image/gif",
		"etag": "\"c151-Ngtkqq3K9JbkMlHq7Br6bsK4mTc\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 49489,
		"path": "../public/pokemon-gifs/153.gif"
	},
	"/pokemon-gifs/155.gif": {
		"type": "image/gif",
		"etag": "\"7150-aIuy2cTzbuIEl1CWfelcrHkg9Jc\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 29008,
		"path": "../public/pokemon-gifs/155.gif"
	},
	"/pokemon-gifs/156.gif": {
		"type": "image/gif",
		"etag": "\"84e6-lua5fb/Tmly/fAY0iv6dC8VUsk0\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 34022,
		"path": "../public/pokemon-gifs/156.gif"
	},
	"/pokemon-gifs/154.gif": {
		"type": "image/gif",
		"etag": "\"1168b-TUfNpI3KLcaV7CEUN6K81Ou76yo\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 71307,
		"path": "../public/pokemon-gifs/154.gif"
	},
	"/pokemon-gifs/157.gif": {
		"type": "image/gif",
		"etag": "\"14454-eIDIkJ1LxZ1eIYpdFsNZMeF1O9Y\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 83028,
		"path": "../public/pokemon-gifs/157.gif"
	},
	"/pokemon-gifs/158.gif": {
		"type": "image/gif",
		"etag": "\"58ac-4dMOntuAm31nz+iWo2cgba0EIT4\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 22700,
		"path": "../public/pokemon-gifs/158.gif"
	},
	"/pokemon-gifs/159.gif": {
		"type": "image/gif",
		"etag": "\"efb7-n11P0hNhdqHRYtgEN3tU3m1FPGg\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 61367,
		"path": "../public/pokemon-gifs/159.gif"
	},
	"/pokemon-gifs/16.gif": {
		"type": "image/gif",
		"etag": "\"392b-u+6ppwGnTLmr2CpMsTK/zGBZic8\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 14635,
		"path": "../public/pokemon-gifs/16.gif"
	},
	"/pokemon-gifs/160.gif": {
		"type": "image/gif",
		"etag": "\"1b2ad-CDvHAB/KSr1/ZKP29dVl3S2S/To\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 111277,
		"path": "../public/pokemon-gifs/160.gif"
	},
	"/pokemon-gifs/161.gif": {
		"type": "image/gif",
		"etag": "\"94e3-vZIPRbdgfBG+klQh2p+mxohVFqc\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 38115,
		"path": "../public/pokemon-gifs/161.gif"
	},
	"/pokemon-gifs/163.gif": {
		"type": "image/gif",
		"etag": "\"93a1-TARhqbfHmhPji8/WCqmkQfB7d4k\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 37793,
		"path": "../public/pokemon-gifs/163.gif"
	},
	"/pokemon-gifs/162.gif": {
		"type": "image/gif",
		"etag": "\"1148f-KT+L+6KZ06N0+8I6aRCaJPLm/bE\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 70799,
		"path": "../public/pokemon-gifs/162.gif"
	},
	"/pokemon-gifs/164.gif": {
		"type": "image/gif",
		"etag": "\"94a2-k4CPbhoS/UxV3goG4LSdQCA4b2k\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 38050,
		"path": "../public/pokemon-gifs/164.gif"
	},
	"/pokemon-gifs/166.gif": {
		"type": "image/gif",
		"etag": "\"78c3-oP8ZnAcu1E7QZIESUwJE1Fn7W98\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 30915,
		"path": "../public/pokemon-gifs/166.gif"
	},
	"/pokemon-gifs/165.gif": {
		"type": "image/gif",
		"etag": "\"7e03-svq/GenCQ3wnjHAsXD0C65vXCaY\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 32259,
		"path": "../public/pokemon-gifs/165.gif"
	},
	"/pokemon-gifs/167.gif": {
		"type": "image/gif",
		"etag": "\"4a09-/yW4BEWJSLvN2gcF0tlnVWWtF7A\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 18953,
		"path": "../public/pokemon-gifs/167.gif"
	},
	"/pokemon-gifs/168.gif": {
		"type": "image/gif",
		"etag": "\"8b0e-QeqASjqWSqGtMwl6VEB4FzQnlkw\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 35598,
		"path": "../public/pokemon-gifs/168.gif"
	},
	"/pokemon-gifs/17.gif": {
		"type": "image/gif",
		"etag": "\"577c-/BF2WcKTP/bBwM1pJX/RJFLrjAk\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 22396,
		"path": "../public/pokemon-gifs/17.gif"
	},
	"/pokemon-gifs/169.gif": {
		"type": "image/gif",
		"etag": "\"59b3-01avR50NMAmnKWgpUVeikqDNmEc\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 22963,
		"path": "../public/pokemon-gifs/169.gif"
	},
	"/pokemon-gifs/170.gif": {
		"type": "image/gif",
		"etag": "\"b0c1-SFL6uURjFgJ3j4l2qBk4OzIYUnw\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 45249,
		"path": "../public/pokemon-gifs/170.gif"
	},
	"/pokemon-gifs/172.gif": {
		"type": "image/gif",
		"etag": "\"6a28-vW3NRE4wLdy3TCwuN3GTyb02PCY\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 27176,
		"path": "../public/pokemon-gifs/172.gif"
	},
	"/pokemon-gifs/173.gif": {
		"type": "image/gif",
		"etag": "\"5ea8-pXJAqX6uRdK9RBvN3/XE5YYHZdM\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 24232,
		"path": "../public/pokemon-gifs/173.gif"
	},
	"/pokemon-gifs/171.gif": {
		"type": "image/gif",
		"etag": "\"ebfe-IE8bOUO6Ld/St8NAp9mLgDvKdLY\"",
		"mtime": "2026-09-05T11:32:52.701Z",
		"size": 60414,
		"path": "../public/pokemon-gifs/171.gif"
	},
	"/pokemon-gifs/174.gif": {
		"type": "image/gif",
		"etag": "\"af39-iPC/73X1IFXADjLzaJvAd23iu48\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 44857,
		"path": "../public/pokemon-gifs/174.gif"
	},
	"/pokemon-gifs/175.gif": {
		"type": "image/gif",
		"etag": "\"7763-u7mR03YwLvpXPEQICKhLRX6gm68\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 30563,
		"path": "../public/pokemon-gifs/175.gif"
	},
	"/pokemon-gifs/177.gif": {
		"type": "image/gif",
		"etag": "\"4501-O5+/o4EC7uhi8Z1dWuTbgzlhZN8\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 17665,
		"path": "../public/pokemon-gifs/177.gif"
	},
	"/pokemon-gifs/176.gif": {
		"type": "image/gif",
		"etag": "\"4c65-9vQcjvJYVChmeqlAaRahx4LtjIA\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 19557,
		"path": "../public/pokemon-gifs/176.gif"
	},
	"/pokemon-gifs/178.gif": {
		"type": "image/gif",
		"etag": "\"6cef-4p6i6z8dgC68B4DQwbXhgj5/VNw\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 27887,
		"path": "../public/pokemon-gifs/178.gif"
	},
	"/pokemon-gifs/179.gif": {
		"type": "image/gif",
		"etag": "\"100af-A/zQlbtSLLrl2AxmorQgred7MfU\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 65711,
		"path": "../public/pokemon-gifs/179.gif"
	},
	"/pokemon-gifs/18.gif": {
		"type": "image/gif",
		"etag": "\"10bba-xsU4/VFe2w6yok6cvWimlpGvcmc\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 68538,
		"path": "../public/pokemon-gifs/18.gif"
	},
	"/pokemon-gifs/180.gif": {
		"type": "image/gif",
		"etag": "\"aee6-I38N2EgeinT1C0iVW++ETYDE64Q\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 44774,
		"path": "../public/pokemon-gifs/180.gif"
	},
	"/pokemon-gifs/181.gif": {
		"type": "image/gif",
		"etag": "\"c3dc-BfB5/+LvYDXjIVimBJfslCTRRvY\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 50140,
		"path": "../public/pokemon-gifs/181.gif"
	},
	"/pokemon-gifs/182.gif": {
		"type": "image/gif",
		"etag": "\"7da6-f532VUrHTXaA9OYgPc1CGb5Y0/I\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 32166,
		"path": "../public/pokemon-gifs/182.gif"
	},
	"/pokemon-gifs/183.gif": {
		"type": "image/gif",
		"etag": "\"83cb-CB7kqQE1SqRPQJTf4jtRVOmMwho\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 33739,
		"path": "../public/pokemon-gifs/183.gif"
	},
	"/pokemon-gifs/184.gif": {
		"type": "image/gif",
		"etag": "\"f7be-Q4N857WeW9nGlyem4LCRMRCRuwE\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 63422,
		"path": "../public/pokemon-gifs/184.gif"
	},
	"/pokemon-gifs/185.gif": {
		"type": "image/gif",
		"etag": "\"cc4c-6RkMefyIX089H4TXsbvwTlL+ffU\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 52300,
		"path": "../public/pokemon-gifs/185.gif"
	},
	"/pokemon-gifs/186.gif": {
		"type": "image/gif",
		"etag": "\"e719-L1bM5p6/kXTCO3CVH1TR6/wpDkc\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 59161,
		"path": "../public/pokemon-gifs/186.gif"
	},
	"/pokemon-gifs/187.gif": {
		"type": "image/gif",
		"etag": "\"80fb-Q8ohSRhN7GmCpK3qzWhjnuTgXss\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 33019,
		"path": "../public/pokemon-gifs/187.gif"
	},
	"/pokemon-gifs/188.gif": {
		"type": "image/gif",
		"etag": "\"6f91-SSAiInmbvcl0XMIGwRaYfswkpz8\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 28561,
		"path": "../public/pokemon-gifs/188.gif"
	},
	"/pokemon-gifs/189.gif": {
		"type": "image/gif",
		"etag": "\"1346d-5HzbwpIu5eq/3fM+I7ChaT9fpPk\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 78957,
		"path": "../public/pokemon-gifs/189.gif"
	},
	"/pokemon-gifs/19.gif": {
		"type": "image/gif",
		"etag": "\"468c-7ToIq1mxRvRJY7r0tX4tApreUzs\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 18060,
		"path": "../public/pokemon-gifs/19.gif"
	},
	"/pokemon-gifs/191.gif": {
		"type": "image/gif",
		"etag": "\"7d52-W+NM5CvGqb4fNi5cLwA+Reniu1s\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 32082,
		"path": "../public/pokemon-gifs/191.gif"
	},
	"/pokemon-gifs/190.gif": {
		"type": "image/gif",
		"etag": "\"699c-hhIiKHE+RidJEvhcL4i+yWblYq4\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 27036,
		"path": "../public/pokemon-gifs/190.gif"
	},
	"/pokemon-gifs/192.gif": {
		"type": "image/gif",
		"etag": "\"7d8d-HHBACqmjXstLD++TiGUpkiSBmew\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 32141,
		"path": "../public/pokemon-gifs/192.gif"
	},
	"/pokemon-gifs/195.gif": {
		"type": "image/gif",
		"etag": "\"11fe3-D7/le+ulfZKiPuhhR9Ru16gkTmA\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 73699,
		"path": "../public/pokemon-gifs/195.gif"
	},
	"/pokemon-gifs/194.gif": {
		"type": "image/gif",
		"etag": "\"bbfe-K0CC4jk+DbudpMoCUE/+1x43r0c\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 48126,
		"path": "../public/pokemon-gifs/194.gif"
	},
	"/pokemon-gifs/196.gif": {
		"type": "image/gif",
		"etag": "\"df70-peQ17k3oAXxAgY1Ze4Wa0o/UxY4\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 57200,
		"path": "../public/pokemon-gifs/196.gif"
	},
	"/pokemon-gifs/197.gif": {
		"type": "image/gif",
		"etag": "\"8b31-mYCrTxUiogLlDZTe+dXuZWxDlQo\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 35633,
		"path": "../public/pokemon-gifs/197.gif"
	},
	"/pokemon-gifs/193.gif": {
		"type": "image/gif",
		"etag": "\"18978-Y6GgCgxdBXgfk7HA/7zUUHEL3F4\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 100728,
		"path": "../public/pokemon-gifs/193.gif"
	},
	"/pokemon-gifs/198.gif": {
		"type": "image/gif",
		"etag": "\"789b-lb+BzyuxT7Ej9s3PtTNJtrtmsXE\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 30875,
		"path": "../public/pokemon-gifs/198.gif"
	},
	"/pokemon-gifs/2.gif": {
		"type": "image/gif",
		"etag": "\"c12d-GZ7ZyJGFlMTLeyR0LHQWpIQ0Vys\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 49453,
		"path": "../public/pokemon-gifs/2.gif"
	},
	"/pokemon-gifs/199.gif": {
		"type": "image/gif",
		"etag": "\"12591-XHJR+c9GAHgKP4imH8nZCPQs/Ow\"",
		"mtime": "2026-09-05T11:32:52.702Z",
		"size": 75153,
		"path": "../public/pokemon-gifs/199.gif"
	},
	"/pokemon-gifs/20.gif": {
		"type": "image/gif",
		"etag": "\"f0de-YgX/WLN+vBEfLjUMPfQI9TDQZXk\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 61662,
		"path": "../public/pokemon-gifs/20.gif"
	},
	"/pokemon-gifs/200.gif": {
		"type": "image/gif",
		"etag": "\"7f79-f5kLVI995AGC2sgTcuBV148X8co\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 32633,
		"path": "../public/pokemon-gifs/200.gif"
	},
	"/pokemon-gifs/201.gif": {
		"type": "image/gif",
		"etag": "\"93c6-aanFUO9EFFhpLCqhKglhSRfr8a8\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 37830,
		"path": "../public/pokemon-gifs/201.gif"
	},
	"/pokemon-gifs/202.gif": {
		"type": "image/gif",
		"etag": "\"10767-SVqUvi+0Mv6i7mjEv2nfZMgDwww\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 67431,
		"path": "../public/pokemon-gifs/202.gif"
	},
	"/pokemon-gifs/203.gif": {
		"type": "image/gif",
		"etag": "\"1e8f5-6zgjVHOSSLyYlHm7JrE2xJNCaQQ\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 125173,
		"path": "../public/pokemon-gifs/203.gif"
	},
	"/pokemon-gifs/204.gif": {
		"type": "image/gif",
		"etag": "\"c8a3-uYuUBvJhONaNgxW/B77wcCzp7sI\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 51363,
		"path": "../public/pokemon-gifs/204.gif"
	},
	"/pokemon-gifs/205.gif": {
		"type": "image/gif",
		"etag": "\"167c0-GccavZq3upHK3bOb5JBsAzVDbT4\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 92096,
		"path": "../public/pokemon-gifs/205.gif"
	},
	"/pokemon-gifs/206.gif": {
		"type": "image/gif",
		"etag": "\"7ca4-pAiv3D05FE3qvC9t4dg5wj8Su3k\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 31908,
		"path": "../public/pokemon-gifs/206.gif"
	},
	"/pokemon-gifs/207.gif": {
		"type": "image/gif",
		"etag": "\"11788-ePJWWnHeWwaxFsOcBOVV4hXFjvc\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 71560,
		"path": "../public/pokemon-gifs/207.gif"
	},
	"/pokemon-gifs/208.gif": {
		"type": "image/gif",
		"etag": "\"2665e-24ttuyFaxuoGAssiG4xSKqP66S8\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 157278,
		"path": "../public/pokemon-gifs/208.gif"
	},
	"/pokemon-gifs/209.gif": {
		"type": "image/gif",
		"etag": "\"9d83-lN1CvlLFYGNJOVJYaToxP3Kfyrc\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 40323,
		"path": "../public/pokemon-gifs/209.gif"
	},
	"/pokemon-gifs/21.gif": {
		"type": "image/gif",
		"etag": "\"39e6-wtweEe7AtPtUVuvuglMQsr121ok\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 14822,
		"path": "../public/pokemon-gifs/21.gif"
	},
	"/pokemon-gifs/210.gif": {
		"type": "image/gif",
		"etag": "\"160ce-bHki0q3VcpLq0cB9AZHmC0/y7O0\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 90318,
		"path": "../public/pokemon-gifs/210.gif"
	},
	"/pokemon-gifs/211.gif": {
		"type": "image/gif",
		"etag": "\"d924-S3LExdXf0oBvXs2c+nX+gVYShVQ\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 55588,
		"path": "../public/pokemon-gifs/211.gif"
	},
	"/pokemon-gifs/212.gif": {
		"type": "image/gif",
		"etag": "\"14627-s10iBmMKkqEbfvZD4jdZrS7mY5o\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 83495,
		"path": "../public/pokemon-gifs/212.gif"
	},
	"/pokemon-gifs/213.gif": {
		"type": "image/gif",
		"etag": "\"b186-hCaUI5JINOXT3/6yA1cuRhgVRuE\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 45446,
		"path": "../public/pokemon-gifs/213.gif"
	},
	"/pokemon-gifs/215.gif": {
		"type": "image/gif",
		"etag": "\"a1f6-gXEKw6U//IjlDzWnVulurQlz9Xs\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 41462,
		"path": "../public/pokemon-gifs/215.gif"
	},
	"/pokemon-gifs/214.gif": {
		"type": "image/gif",
		"etag": "\"132a9-uPUkg/S9jELMw+k2EUQaYW50O14\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 78505,
		"path": "../public/pokemon-gifs/214.gif"
	},
	"/pokemon-gifs/216.gif": {
		"type": "image/gif",
		"etag": "\"96c3-FNkdgll1/2PxdEiEj3zGi85tgpM\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 38595,
		"path": "../public/pokemon-gifs/216.gif"
	},
	"/pokemon-gifs/217.gif": {
		"type": "image/gif",
		"etag": "\"1432f-zwb+SQq1aMUghmvRX+EMnzpuaOw\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 82735,
		"path": "../public/pokemon-gifs/217.gif"
	},
	"/pokemon-gifs/218.gif": {
		"type": "image/gif",
		"etag": "\"cf3a-0mU65X+yHqQoiagOpkdtT8ex2vk\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 53050,
		"path": "../public/pokemon-gifs/218.gif"
	},
	"/pokemon-gifs/219.gif": {
		"type": "image/gif",
		"etag": "\"1327c-L8vRVtJRhBvsEF0j1KOEGdK9VQo\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 78460,
		"path": "../public/pokemon-gifs/219.gif"
	},
	"/pokemon-gifs/220.gif": {
		"type": "image/gif",
		"etag": "\"df1a-Js/bCm4n+iB0t79ThJLhlJ3YIOc\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 57114,
		"path": "../public/pokemon-gifs/220.gif"
	},
	"/pokemon-gifs/22.gif": {
		"type": "image/gif",
		"etag": "\"13f7d-uSL1YI2JCafJET5Me6WD50hWA44\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 81789,
		"path": "../public/pokemon-gifs/22.gif"
	},
	"/pokemon-gifs/221.gif": {
		"type": "image/gif",
		"etag": "\"efb8-GGgb8ceL8wjoKMQCJ9KqiNmO84Q\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 61368,
		"path": "../public/pokemon-gifs/221.gif"
	},
	"/pokemon-gifs/222.gif": {
		"type": "image/gif",
		"etag": "\"e99a-5LUdArQnNGcCyouXwEi58QUuA8c\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 59802,
		"path": "../public/pokemon-gifs/222.gif"
	},
	"/pokemon-gifs/223.gif": {
		"type": "image/gif",
		"etag": "\"8b88-A5GZGy8XAZjv1wdq2cXdx0gUcxI\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 35720,
		"path": "../public/pokemon-gifs/223.gif"
	},
	"/pokemon-gifs/225.gif": {
		"type": "image/gif",
		"etag": "\"988f-kysGSrfs1uoPaSxHl/n7Wqh50ks\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 39055,
		"path": "../public/pokemon-gifs/225.gif"
	},
	"/pokemon-gifs/224.gif": {
		"type": "image/gif",
		"etag": "\"dd24-AH7zm8qpomD/EWgW5E44kB9z4TY\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 56612,
		"path": "../public/pokemon-gifs/224.gif"
	},
	"/pokemon-gifs/226.gif": {
		"type": "image/gif",
		"etag": "\"14760-qa8cZfrkIbkCKYpzd318+Zc3rNA\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 83808,
		"path": "../public/pokemon-gifs/226.gif"
	},
	"/pokemon-gifs/227.gif": {
		"type": "image/gif",
		"etag": "\"fd0c-5Pit015Er59cDKdhQTc3JTaOq4w\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 64780,
		"path": "../public/pokemon-gifs/227.gif"
	},
	"/pokemon-gifs/23.gif": {
		"type": "image/gif",
		"etag": "\"5fe9-aU7EE5LCntqa5UARKMy9kkStNY8\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 24553,
		"path": "../public/pokemon-gifs/23.gif"
	},
	"/pokemon-gifs/229.gif": {
		"type": "image/gif",
		"etag": "\"c416-zNZOVozOQqCSNW6bDvDOQczkvRs\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 50198,
		"path": "../public/pokemon-gifs/229.gif"
	},
	"/pokemon-gifs/228.gif": {
		"type": "image/gif",
		"etag": "\"9697-IkbenYSlIIUqRh/T5HBfRo/et60\"",
		"mtime": "2026-09-05T11:32:52.703Z",
		"size": 38551,
		"path": "../public/pokemon-gifs/228.gif"
	},
	"/pokemon-gifs/230.gif": {
		"type": "image/gif",
		"etag": "\"1168f-ydCfq99fLaiRSVkhJutojRqluLQ\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 71311,
		"path": "../public/pokemon-gifs/230.gif"
	},
	"/pokemon-gifs/231.gif": {
		"type": "image/gif",
		"etag": "\"a91b-28HLpt2O/65GgGz//884zfo1p6k\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 43291,
		"path": "../public/pokemon-gifs/231.gif"
	},
	"/pokemon-gifs/233.gif": {
		"type": "image/gif",
		"etag": "\"de63-wynSO6IOgFXUqn0BK3qcEkWJRjs\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 56931,
		"path": "../public/pokemon-gifs/233.gif"
	},
	"/pokemon-gifs/232.gif": {
		"type": "image/gif",
		"etag": "\"1516b-ixKF7dlpFvrFjV/OPs7YbuFgOSA\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 86379,
		"path": "../public/pokemon-gifs/232.gif"
	},
	"/pokemon-gifs/234.gif": {
		"type": "image/gif",
		"etag": "\"b1a1-fd7n3kiIJEPDbVNMlXzste54PbI\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 45473,
		"path": "../public/pokemon-gifs/234.gif"
	},
	"/pokemon-gifs/235.gif": {
		"type": "image/gif",
		"etag": "\"b76a-EEFz3hPEMqeegif+pRuoxwUljOo\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 46954,
		"path": "../public/pokemon-gifs/235.gif"
	},
	"/pokemon-gifs/236.gif": {
		"type": "image/gif",
		"etag": "\"670b-fviH4brD5ysxauF1r/8h4nLGs/M\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 26379,
		"path": "../public/pokemon-gifs/236.gif"
	},
	"/pokemon-gifs/237.gif": {
		"type": "image/gif",
		"etag": "\"ee5e-0SYp1qZ01yXwidVeQYxXKUF3kgo\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 61022,
		"path": "../public/pokemon-gifs/237.gif"
	},
	"/pokemon-gifs/239.gif": {
		"type": "image/gif",
		"etag": "\"6e1d-soZfPRvieZYGoWnHZejpt9WBGSw\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 28189,
		"path": "../public/pokemon-gifs/239.gif"
	},
	"/pokemon-gifs/238.gif": {
		"type": "image/gif",
		"etag": "\"78a9-P9fEHJO57S0gq1UQtKG4vhu4EvQ\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 30889,
		"path": "../public/pokemon-gifs/238.gif"
	},
	"/pokemon-gifs/240.gif": {
		"type": "image/gif",
		"etag": "\"5fb5-qySRcX5hPr7dDEBp+64CStlJ684\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 24501,
		"path": "../public/pokemon-gifs/240.gif"
	},
	"/pokemon-gifs/242.gif": {
		"type": "image/gif",
		"etag": "\"11fdd-athYD3e9bAcrCS9YR/Paq1fSROg\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 73693,
		"path": "../public/pokemon-gifs/242.gif"
	},
	"/pokemon-gifs/24.gif": {
		"type": "image/gif",
		"etag": "\"177a5-a4MHbdADJ0G3lOKVS4s2zMXVqVo\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 96165,
		"path": "../public/pokemon-gifs/24.gif"
	},
	"/pokemon-gifs/243.gif": {
		"type": "image/gif",
		"etag": "\"14e33-9yI6VFK0LjyQnNyKriYy+8XZSio\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 85555,
		"path": "../public/pokemon-gifs/243.gif"
	},
	"/pokemon-gifs/241.gif": {
		"type": "image/gif",
		"etag": "\"12c23-WzGSJgEbo+FT1AJ0E31ewXF6tBM\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 76835,
		"path": "../public/pokemon-gifs/241.gif"
	},
	"/pokemon-gifs/245.gif": {
		"type": "image/gif",
		"etag": "\"17914-XZtAS/RCN9xZWsDCyyLp/cc2Mgw\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 96532,
		"path": "../public/pokemon-gifs/245.gif"
	},
	"/pokemon-gifs/244.gif": {
		"type": "image/gif",
		"etag": "\"20d0d-Y3Ri501uCSflARaLEihDkwHVMmU\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 134413,
		"path": "../public/pokemon-gifs/244.gif"
	},
	"/pokemon-gifs/247.gif": {
		"type": "image/gif",
		"etag": "\"107a0-xhYbt+9ueOLjkgq1wSYIKhg+AaM\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 67488,
		"path": "../public/pokemon-gifs/247.gif"
	},
	"/pokemon-gifs/246.gif": {
		"type": "image/gif",
		"etag": "\"5e42-nNItNYT4zJiyvEtVLHJ/1nf6K0A\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 24130,
		"path": "../public/pokemon-gifs/246.gif"
	},
	"/pokemon-gifs/248.gif": {
		"type": "image/gif",
		"etag": "\"18e0f-ntoG6qmntSi/vpmrfLThrrFeujc\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 101903,
		"path": "../public/pokemon-gifs/248.gif"
	},
	"/pokemon-gifs/25.gif": {
		"type": "image/gif",
		"etag": "\"6c27-v999P7WpZjn1EBAwai2h9S46z1s\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 27687,
		"path": "../public/pokemon-gifs/25.gif"
	},
	"/pokemon-gifs/249.gif": {
		"type": "image/gif",
		"etag": "\"22f10-F1ElfatYV1+upzy87KVILmcGOo8\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 143120,
		"path": "../public/pokemon-gifs/249.gif"
	},
	"/pokemon-gifs/250.gif": {
		"type": "image/gif",
		"etag": "\"1e4dd-Weyqc1QvP0VUzPuu5AzwdRSUU9E\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 124125,
		"path": "../public/pokemon-gifs/250.gif"
	},
	"/pokemon-gifs/253.gif": {
		"type": "image/gif",
		"etag": "\"c7a6-0zp1K/EETeIouN+bmUo7WWn47Ag\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 51110,
		"path": "../public/pokemon-gifs/253.gif"
	},
	"/pokemon-gifs/252.gif": {
		"type": "image/gif",
		"etag": "\"6f7e-VpfWVUqSSTHS3pm8yZ5mUNetmV0\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 28542,
		"path": "../public/pokemon-gifs/252.gif"
	},
	"/pokemon-gifs/251.gif": {
		"type": "image/gif",
		"etag": "\"e4fa-76YAaUGLVFSwU4Egn/ovCRhaB/k\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 58618,
		"path": "../public/pokemon-gifs/251.gif"
	},
	"/pokemon-gifs/254.gif": {
		"type": "image/gif",
		"etag": "\"15347-9lTsTiL0QjbIRnHousGaPcPTlww\"",
		"mtime": "2026-09-05T11:32:52.704Z",
		"size": 86855,
		"path": "../public/pokemon-gifs/254.gif"
	},
	"/pokemon-gifs/255.gif": {
		"type": "image/gif",
		"etag": "\"76da-5mES/ZS3AM+qoPKqOpHp1RZZW7w\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 30426,
		"path": "../public/pokemon-gifs/255.gif"
	},
	"/pokemon-gifs/257.gif": {
		"type": "image/gif",
		"etag": "\"fe94-tn+LJbnj4yOl1tOxskiVTpsauqo\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 65172,
		"path": "../public/pokemon-gifs/257.gif"
	},
	"/pokemon-gifs/258.gif": {
		"type": "image/gif",
		"etag": "\"8e1c-CqJevQR1QpjyW1F6kZ6W8GNt93Q\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 36380,
		"path": "../public/pokemon-gifs/258.gif"
	},
	"/pokemon-gifs/256.gif": {
		"type": "image/gif",
		"etag": "\"72f5-gyz8xjL6pS/xOqMQYe1JRun4bO0\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 29429,
		"path": "../public/pokemon-gifs/256.gif"
	},
	"/pokemon-gifs/259.gif": {
		"type": "image/gif",
		"etag": "\"c5a7-7CxAxOfOm7CSEI+xHFfcavSQJ1c\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 50599,
		"path": "../public/pokemon-gifs/259.gif"
	},
	"/pokemon-gifs/26.gif": {
		"type": "image/gif",
		"etag": "\"8d45-hVlXdaAXsyx4OGQijjk4+b1gV3I\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 36165,
		"path": "../public/pokemon-gifs/26.gif"
	},
	"/pokemon-gifs/261.gif": {
		"type": "image/gif",
		"etag": "\"6cc2-EkYe9Af2kBR6mhYSHD8QOpWVn/I\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 27842,
		"path": "../public/pokemon-gifs/261.gif"
	},
	"/pokemon-gifs/262.gif": {
		"type": "image/gif",
		"etag": "\"e681-rnLiTWUczzp/tggXfYKWR9cYNtk\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 59009,
		"path": "../public/pokemon-gifs/262.gif"
	},
	"/pokemon-gifs/263.gif": {
		"type": "image/gif",
		"etag": "\"a2e9-heZomCPeDyU+OA06cagR468kbl0\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 41705,
		"path": "../public/pokemon-gifs/263.gif"
	},
	"/pokemon-gifs/260.gif": {
		"type": "image/gif",
		"etag": "\"1a6ad-7j+D2+R5t7EyfKwNQOHogOn68jY\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 108205,
		"path": "../public/pokemon-gifs/260.gif"
	},
	"/pokemon-gifs/264.gif": {
		"type": "image/gif",
		"etag": "\"b379-Z20iMRi8w5JPipEwTBN2e6o7tcY\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 45945,
		"path": "../public/pokemon-gifs/264.gif"
	},
	"/pokemon-gifs/265.gif": {
		"type": "image/gif",
		"etag": "\"8135-Zg8IPGiAouanTPD7LGrhQop9huc\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 33077,
		"path": "../public/pokemon-gifs/265.gif"
	},
	"/pokemon-gifs/266.gif": {
		"type": "image/gif",
		"etag": "\"cb5c-ZgdazSpd3S7q8Vn5oeAVDV+9CDQ\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 52060,
		"path": "../public/pokemon-gifs/266.gif"
	},
	"/pokemon-gifs/267.gif": {
		"type": "image/gif",
		"etag": "\"18dbb-k7LOrtNKr/yW4sEsgvuttRy05Gg\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 101819,
		"path": "../public/pokemon-gifs/267.gif"
	},
	"/pokemon-gifs/268.gif": {
		"type": "image/gif",
		"etag": "\"ae80-b1T7MEb1YNJJfSLxAN+Yhr30/SE\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 44672,
		"path": "../public/pokemon-gifs/268.gif"
	},
	"/pokemon-gifs/269.gif": {
		"type": "image/gif",
		"etag": "\"adae-Q0iT8qsxCvQ/cyzxPuwgP8YI92U\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 44462,
		"path": "../public/pokemon-gifs/269.gif"
	},
	"/pokemon-gifs/270.gif": {
		"type": "image/gif",
		"etag": "\"21c5-Klwm4QWRm9LeOP4pUKnKUU8eb8Q\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 8645,
		"path": "../public/pokemon-gifs/270.gif"
	},
	"/pokemon-gifs/27.gif": {
		"type": "image/gif",
		"etag": "\"5906-JEBMtG6iWQHonhrrrHD451qcFx0\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 22790,
		"path": "../public/pokemon-gifs/27.gif"
	},
	"/pokemon-gifs/272.gif": {
		"type": "image/gif",
		"etag": "\"1890b-+R0g8Ga+uq1axhy1fWjejMw6DHA\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 100619,
		"path": "../public/pokemon-gifs/272.gif"
	},
	"/pokemon-gifs/271.gif": {
		"type": "image/gif",
		"etag": "\"ad1c-uDdaCcuPAKRehFa6C360jJVF2fQ\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 44316,
		"path": "../public/pokemon-gifs/271.gif"
	},
	"/pokemon-gifs/274.gif": {
		"type": "image/gif",
		"etag": "\"710e-beroZtshk7ftAb8fkZnWXq4SYjg\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 28942,
		"path": "../public/pokemon-gifs/274.gif"
	},
	"/pokemon-gifs/273.gif": {
		"type": "image/gif",
		"etag": "\"3b33-wjCgapj5tc5KOcjNK7Hpq98dzL8\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 15155,
		"path": "../public/pokemon-gifs/273.gif"
	},
	"/pokemon-gifs/275.gif": {
		"type": "image/gif",
		"etag": "\"142af-wX3SFXFeWos5mV7Yhay7eIZxYdg\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 82607,
		"path": "../public/pokemon-gifs/275.gif"
	},
	"/pokemon-gifs/276.gif": {
		"type": "image/gif",
		"etag": "\"5431-gPoWCQqJrcmrQZyosn66R05Kl0c\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 21553,
		"path": "../public/pokemon-gifs/276.gif"
	},
	"/pokemon-gifs/277.gif": {
		"type": "image/gif",
		"etag": "\"43aa-yv3/8YfKPbKkuT9ZlEjnKS+xMgw\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 17322,
		"path": "../public/pokemon-gifs/277.gif"
	},
	"/pokemon-gifs/278.gif": {
		"type": "image/gif",
		"etag": "\"8c35-nlqWcHB1PSRHTLbnlbUL2D/PIEc\"",
		"mtime": "2026-09-05T11:32:52.705Z",
		"size": 35893,
		"path": "../public/pokemon-gifs/278.gif"
	},
	"/pokemon-gifs/279.gif": {
		"type": "image/gif",
		"etag": "\"7815-1HVZ0iSzAtNK/G7ei+BI0eA4OeU\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 30741,
		"path": "../public/pokemon-gifs/279.gif"
	},
	"/pokemon-gifs/28.gif": {
		"type": "image/gif",
		"etag": "\"d077-X1oCIFTUhwNVceWBsa5HY9SAzgY\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 53367,
		"path": "../public/pokemon-gifs/28.gif"
	},
	"/pokemon-gifs/281.gif": {
		"type": "image/gif",
		"etag": "\"728d-6z6r1Mk+XVOg2eBCZC2x4QnT5ZY\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 29325,
		"path": "../public/pokemon-gifs/281.gif"
	},
	"/pokemon-gifs/280.gif": {
		"type": "image/gif",
		"etag": "\"7771-t2SD+OuNYuvYydx6rzZK07yXw2I\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 30577,
		"path": "../public/pokemon-gifs/280.gif"
	},
	"/pokemon-gifs/282.gif": {
		"type": "image/gif",
		"etag": "\"10f12-FA3CPGIZq3ON/Cdz2vkNIO/RNJs\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 69394,
		"path": "../public/pokemon-gifs/282.gif"
	},
	"/pokemon-gifs/283.gif": {
		"type": "image/gif",
		"etag": "\"9009-ySnztxYXrPV9BgAomjhBykVhPYQ\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 36873,
		"path": "../public/pokemon-gifs/283.gif"
	},
	"/pokemon-gifs/284.gif": {
		"type": "image/gif",
		"etag": "\"d2fb-ukNiPjEm3Y6SZjMcJ1N4gJtgpX4\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 54011,
		"path": "../public/pokemon-gifs/284.gif"
	},
	"/pokemon-gifs/285.gif": {
		"type": "image/gif",
		"etag": "\"659d-G0BcIcYSRYQBAuX8E3cgb3roLKE\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 26013,
		"path": "../public/pokemon-gifs/285.gif"
	},
	"/pokemon-gifs/286.gif": {
		"type": "image/gif",
		"etag": "\"92d6-A1MdPUoht0HME49zrEuAaol8iSg\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 37590,
		"path": "../public/pokemon-gifs/286.gif"
	},
	"/pokemon-gifs/287.gif": {
		"type": "image/gif",
		"etag": "\"c987-UrZYKHHY9GR2TA4NDrIo/ShBvMU\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 51591,
		"path": "../public/pokemon-gifs/287.gif"
	},
	"/pokemon-gifs/288.gif": {
		"type": "image/gif",
		"etag": "\"10ce3-Vgm2lZVWW203omp5s3hkm6I76TU\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 68835,
		"path": "../public/pokemon-gifs/288.gif"
	},
	"/pokemon-gifs/29.gif": {
		"type": "image/gif",
		"etag": "\"924f-Olx46TfB7aLPLFt/anqc7b5AjZQ\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 37455,
		"path": "../public/pokemon-gifs/29.gif"
	},
	"/pokemon-gifs/289.gif": {
		"type": "image/gif",
		"etag": "\"2bf2e-lwNs1CSecpCw7jGKno3qG/3bWAQ\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 180014,
		"path": "../public/pokemon-gifs/289.gif"
	},
	"/pokemon-gifs/290.gif": {
		"type": "image/gif",
		"etag": "\"5fe5-xaUHsheiEHzDCjxqoMNCNGTybEE\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 24549,
		"path": "../public/pokemon-gifs/290.gif"
	},
	"/pokemon-gifs/291.gif": {
		"type": "image/gif",
		"etag": "\"9323-VZb9oDAlAFID+N5PdfejwhHEc10\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 37667,
		"path": "../public/pokemon-gifs/291.gif"
	},
	"/pokemon-gifs/292.gif": {
		"type": "image/gif",
		"etag": "\"97b6-bDNayUY9kJCOc3c6J7b6FI9zOuA\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 38838,
		"path": "../public/pokemon-gifs/292.gif"
	},
	"/pokemon-gifs/293.gif": {
		"type": "image/gif",
		"etag": "\"7c1a-7sCJZVsHHsRLJiYUv/rWK36OrNk\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 31770,
		"path": "../public/pokemon-gifs/293.gif"
	},
	"/pokemon-gifs/296.gif": {
		"type": "image/gif",
		"etag": "\"792f-CXBjs2fjlzj4kFjDi1cJArsGPfw\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 31023,
		"path": "../public/pokemon-gifs/296.gif"
	},
	"/pokemon-gifs/294.gif": {
		"type": "image/gif",
		"etag": "\"154da-/iGYo/iOG3qmNsUiAzJQK9JhFeE\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 87258,
		"path": "../public/pokemon-gifs/294.gif"
	},
	"/pokemon-gifs/297.gif": {
		"type": "image/gif",
		"etag": "\"1adfc-vaJaRhPtIw6EH0r13AEBuceaovY\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 110076,
		"path": "../public/pokemon-gifs/297.gif"
	},
	"/pokemon-gifs/295.gif": {
		"type": "image/gif",
		"etag": "\"226e8-nII2gCPFQPrbH3BFLDLJfYdlGr8\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 141032,
		"path": "../public/pokemon-gifs/295.gif"
	},
	"/pokemon-gifs/298.gif": {
		"type": "image/gif",
		"etag": "\"4d5e-jSmRYmmS5MZcWqXLc/GFPcYD01A\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 19806,
		"path": "../public/pokemon-gifs/298.gif"
	},
	"/pokemon-gifs/299.gif": {
		"type": "image/gif",
		"etag": "\"efb0-cp8z+9/0Qxw0Jk9c7DfwXZ337cc\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 61360,
		"path": "../public/pokemon-gifs/299.gif"
	},
	"/pokemon-gifs/300.gif": {
		"type": "image/gif",
		"etag": "\"6702-jODlrlcyaYZP5XCdlnlzQVSXLmw\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 26370,
		"path": "../public/pokemon-gifs/300.gif"
	},
	"/pokemon-gifs/3.gif": {
		"type": "image/gif",
		"etag": "\"1b5c3-UqXkk5qDc3wT/wwHpk8pQaDyDK4\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 112067,
		"path": "../public/pokemon-gifs/3.gif"
	},
	"/pokemon-gifs/30.gif": {
		"type": "image/gif",
		"etag": "\"7d1d-PA6SIRxc9SqVPGNj4OHjKmo3FNI\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 32029,
		"path": "../public/pokemon-gifs/30.gif"
	},
	"/pokemon-gifs/302.gif": {
		"type": "image/gif",
		"etag": "\"68e8-Ff2eASWERfgeXWDhtcwtvKDzUWU\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 26856,
		"path": "../public/pokemon-gifs/302.gif"
	},
	"/pokemon-gifs/303.gif": {
		"type": "image/gif",
		"etag": "\"8663-J9C/bIQ1AbDD6t8VntgmsynC7cE\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 34403,
		"path": "../public/pokemon-gifs/303.gif"
	},
	"/pokemon-gifs/301.gif": {
		"type": "image/gif",
		"etag": "\"ef8b-7RXi/h73ZEgvnNUxa9XTerXdAFM\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 61323,
		"path": "../public/pokemon-gifs/301.gif"
	},
	"/pokemon-gifs/304.gif": {
		"type": "image/gif",
		"etag": "\"6093-jHK6q1eBxVBOBxsxURgF5th0Ay4\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 24723,
		"path": "../public/pokemon-gifs/304.gif"
	},
	"/pokemon-gifs/305.gif": {
		"type": "image/gif",
		"etag": "\"10a45-Ub+Lhkjyy1smEZzHzkpexFZdfok\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 68165,
		"path": "../public/pokemon-gifs/305.gif"
	},
	"/pokemon-gifs/307.gif": {
		"type": "image/gif",
		"etag": "\"7116-/LXeIBXwKz8dwmP4ecepQHW0vyQ\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 28950,
		"path": "../public/pokemon-gifs/307.gif"
	},
	"/pokemon-gifs/306.gif": {
		"type": "image/gif",
		"etag": "\"1a685-ZcV1U7NMsUptGi9NUjuDlnNU7Qo\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 108165,
		"path": "../public/pokemon-gifs/306.gif"
	},
	"/pokemon-gifs/309.gif": {
		"type": "image/gif",
		"etag": "\"6e4e-ubeZTvkEGVypya4+TEyoL+4DYuI\"",
		"mtime": "2026-09-05T11:32:52.706Z",
		"size": 28238,
		"path": "../public/pokemon-gifs/309.gif"
	},
	"/pokemon-gifs/308.gif": {
		"type": "image/gif",
		"etag": "\"9bc7-nAGE1swWjrzHAtNSwkVpaKqkd1s\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 39879,
		"path": "../public/pokemon-gifs/308.gif"
	},
	"/pokemon-gifs/31.gif": {
		"type": "image/gif",
		"etag": "\"11ea8-DtgSQ9GrYdcY33QImvG+bWcxcRw\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 73384,
		"path": "../public/pokemon-gifs/31.gif"
	},
	"/pokemon-gifs/310.gif": {
		"type": "image/gif",
		"etag": "\"d92d-FguB8bXIBvAwRV98ceR47dVXEqo\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 55597,
		"path": "../public/pokemon-gifs/310.gif"
	},
	"/pokemon-gifs/311.gif": {
		"type": "image/gif",
		"etag": "\"6a38-fFyvko0RqcKJMMyYKgEbMUhSOj0\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 27192,
		"path": "../public/pokemon-gifs/311.gif"
	},
	"/pokemon-gifs/312.gif": {
		"type": "image/gif",
		"etag": "\"6937-HP2uPv8XT2fvychyI1Gb75igDzA\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 26935,
		"path": "../public/pokemon-gifs/312.gif"
	},
	"/pokemon-gifs/313.gif": {
		"type": "image/gif",
		"etag": "\"7b75-xi93YbVua4PGsezw1KPDW/+Twu4\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 31605,
		"path": "../public/pokemon-gifs/313.gif"
	},
	"/pokemon-gifs/314.gif": {
		"type": "image/gif",
		"etag": "\"8523-xq5HjSu36a5s0RmaIiK/a0T6UfI\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 34083,
		"path": "../public/pokemon-gifs/314.gif"
	},
	"/pokemon-gifs/315.gif": {
		"type": "image/gif",
		"etag": "\"dd83-7u2fFqq6/++NgJrFHCWqZVnQRnM\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 56707,
		"path": "../public/pokemon-gifs/315.gif"
	},
	"/pokemon-gifs/316.gif": {
		"type": "image/gif",
		"etag": "\"79d1-uKrlFUk+X4o1M5XQbJTttBMUiwY\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 31185,
		"path": "../public/pokemon-gifs/316.gif"
	},
	"/pokemon-gifs/317.gif": {
		"type": "image/gif",
		"etag": "\"11d1d-g2m1hq3RoypI/lOSUayrbTJdFFc\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 72989,
		"path": "../public/pokemon-gifs/317.gif"
	},
	"/pokemon-gifs/318.gif": {
		"type": "image/gif",
		"etag": "\"dbed-02ONn9Li6v9Gg/0VnXJ7hQIeM60\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 56301,
		"path": "../public/pokemon-gifs/318.gif"
	},
	"/pokemon-gifs/319.gif": {
		"type": "image/gif",
		"etag": "\"f96b-N0ljZSaMu0xMBk172StJz8gwfi0\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 63851,
		"path": "../public/pokemon-gifs/319.gif"
	},
	"/pokemon-gifs/32.gif": {
		"type": "image/gif",
		"etag": "\"949e-tV3yRG+FZvuFw+n5tD8TgOb9BzY\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 38046,
		"path": "../public/pokemon-gifs/32.gif"
	},
	"/pokemon-gifs/322.gif": {
		"type": "image/gif",
		"etag": "\"bb79-KIIONCP1lXOxFHIyG0ibZJ58DAU\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 47993,
		"path": "../public/pokemon-gifs/322.gif"
	},
	"/pokemon-gifs/323.gif": {
		"type": "image/gif",
		"etag": "\"171ff-gE15wVOxZTrGJsHOk638YkTZHYE\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 94719,
		"path": "../public/pokemon-gifs/323.gif"
	},
	"/pokemon-gifs/320.gif": {
		"type": "image/gif",
		"etag": "\"11ade-X9f8brBjnFBzHEH0MOIuLxpDIVo\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 72414,
		"path": "../public/pokemon-gifs/320.gif"
	},
	"/pokemon-gifs/321.gif": {
		"type": "image/gif",
		"etag": "\"39524-RlE5CmTWARuNOIYRCgtbnUbcx1w\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 234788,
		"path": "../public/pokemon-gifs/321.gif"
	},
	"/pokemon-gifs/325.gif": {
		"type": "image/gif",
		"etag": "\"3f50-dbMGJn5gbNULOK+P1YkfC2k6WQQ\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 16208,
		"path": "../public/pokemon-gifs/325.gif"
	},
	"/pokemon-gifs/326.gif": {
		"type": "image/gif",
		"etag": "\"dd5e-pWU6RRAH7Zjczlh/B5KLj61h3bA\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 56670,
		"path": "../public/pokemon-gifs/326.gif"
	},
	"/pokemon-gifs/327.gif": {
		"type": "image/gif",
		"etag": "\"109bf-dCKURQc9D+kHdWh1BKnFWo2NSh0\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 68031,
		"path": "../public/pokemon-gifs/327.gif"
	},
	"/pokemon-gifs/324.gif": {
		"type": "image/gif",
		"etag": "\"48663-GIGUad4ibEPy/u5Q2vtHv74XkeA\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 296547,
		"path": "../public/pokemon-gifs/324.gif"
	},
	"/pokemon-gifs/328.gif": {
		"type": "image/gif",
		"etag": "\"b0c5-GXvEMOtEYE/TG/q7iEB9DInDoj4\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 45253,
		"path": "../public/pokemon-gifs/328.gif"
	},
	"/pokemon-gifs/329.gif": {
		"type": "image/gif",
		"etag": "\"fbd0-/bw87KaVsw/HjcU2PvOp50xpsgg\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 64464,
		"path": "../public/pokemon-gifs/329.gif"
	},
	"/pokemon-gifs/33.gif": {
		"type": "image/gif",
		"etag": "\"c91f-+xfpoGVoI8/g4ZOo6qZrrkagU/o\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 51487,
		"path": "../public/pokemon-gifs/33.gif"
	},
	"/pokemon-gifs/330.gif": {
		"type": "image/gif",
		"etag": "\"ed20-CA/7LZ5vO1V+JVl3dz3iEzJYWW8\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 60704,
		"path": "../public/pokemon-gifs/330.gif"
	},
	"/pokemon-gifs/331.gif": {
		"type": "image/gif",
		"etag": "\"aaa3-w8jxgXQcmZB9FrioD2FqqolXdhQ\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 43683,
		"path": "../public/pokemon-gifs/331.gif"
	},
	"/pokemon-gifs/332.gif": {
		"type": "image/gif",
		"etag": "\"14b29-FxIthqUebgz9qAqpoiIlLSeU1rc\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 84777,
		"path": "../public/pokemon-gifs/332.gif"
	},
	"/pokemon-gifs/333.gif": {
		"type": "image/gif",
		"etag": "\"ee08-8Yz8lYPz9UN1vGxJ9vno9x4gaig\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 60936,
		"path": "../public/pokemon-gifs/333.gif"
	},
	"/pokemon-gifs/335.gif": {
		"type": "image/gif",
		"etag": "\"a7a2-KTCjyS/bRBGejubL5OU9gJsvhqk\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 42914,
		"path": "../public/pokemon-gifs/335.gif"
	},
	"/pokemon-gifs/334.gif": {
		"type": "image/gif",
		"etag": "\"148d5-8lJ1J1+Kwt1HJmp40aqQIAqsDpU\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 84181,
		"path": "../public/pokemon-gifs/334.gif"
	},
	"/pokemon-gifs/337.gif": {
		"type": "image/gif",
		"etag": "\"1231b-JpUKR9I2DYie/WDnNaaDOOFNUFs\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 74523,
		"path": "../public/pokemon-gifs/337.gif"
	},
	"/pokemon-gifs/336.gif": {
		"type": "image/gif",
		"etag": "\"1212c-LRS/hTFHy880w1FLSw5wxwUnldc\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 74028,
		"path": "../public/pokemon-gifs/336.gif"
	},
	"/pokemon-gifs/339.gif": {
		"type": "image/gif",
		"etag": "\"6999-EkY20KjQ3z3kzxrEiL6id8txeiQ\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 27033,
		"path": "../public/pokemon-gifs/339.gif"
	},
	"/pokemon-gifs/338.gif": {
		"type": "image/gif",
		"etag": "\"181a0-1QyCFm9au60ZvagAmHywIRkWq4I\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 98720,
		"path": "../public/pokemon-gifs/338.gif"
	},
	"/pokemon-gifs/340.gif": {
		"type": "image/gif",
		"etag": "\"b5f5-d/bFx1BdSPqNNb9UAPX4sIY4mL4\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 46581,
		"path": "../public/pokemon-gifs/340.gif"
	},
	"/pokemon-gifs/341.gif": {
		"type": "image/gif",
		"etag": "\"76ea-monLekD2DdxqJB4sf49TmYkog50\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 30442,
		"path": "../public/pokemon-gifs/341.gif"
	},
	"/pokemon-gifs/34.gif": {
		"type": "image/gif",
		"etag": "\"2e1c8-s6Ebu/X2RiXe29eEnhvHgB7sEp0\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 188872,
		"path": "../public/pokemon-gifs/34.gif"
	},
	"/pokemon-gifs/342.gif": {
		"type": "image/gif",
		"etag": "\"1a8f8-Yj0MjA+U2U1geaVhrq+W1uJbJeY\"",
		"mtime": "2026-09-05T11:32:52.707Z",
		"size": 108792,
		"path": "../public/pokemon-gifs/342.gif"
	},
	"/pokemon-gifs/343.gif": {
		"type": "image/gif",
		"etag": "\"91e0-ZDPT+IM6YF/ouSfzuhUJQzgEoz0\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 37344,
		"path": "../public/pokemon-gifs/343.gif"
	},
	"/pokemon-gifs/344.gif": {
		"type": "image/gif",
		"etag": "\"173ef-bIVHSxdjq6uab9ABijd2H8h6jH4\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 95215,
		"path": "../public/pokemon-gifs/344.gif"
	},
	"/pokemon-gifs/345.gif": {
		"type": "image/gif",
		"etag": "\"16fa2-U2/qW8sHMPsb9dwCPKs07a+3QmU\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 94114,
		"path": "../public/pokemon-gifs/345.gif"
	},
	"/pokemon-gifs/346.gif": {
		"type": "image/gif",
		"etag": "\"1152f-EOPMr4OFnIp7QaWXciUUUR8q5QE\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 70959,
		"path": "../public/pokemon-gifs/346.gif"
	},
	"/pokemon-gifs/347.gif": {
		"type": "image/gif",
		"etag": "\"78c2-v0JWDzg/kJnlACcPiNtVFcyGdB8\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 30914,
		"path": "../public/pokemon-gifs/347.gif"
	},
	"/pokemon-gifs/35.gif": {
		"type": "image/gif",
		"etag": "\"60c8-fbKfZoyV40PksUF0Ex4jh9VLHMQ\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 24776,
		"path": "../public/pokemon-gifs/35.gif"
	},
	"/pokemon-gifs/348.gif": {
		"type": "image/gif",
		"etag": "\"187a3-+G0MsRi6scK01WD0T6Gl96hAnoY\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 100259,
		"path": "../public/pokemon-gifs/348.gif"
	},
	"/pokemon-gifs/349.gif": {
		"type": "image/gif",
		"etag": "\"8e96-05klMthu5zegIqMLM8CbhaZzoRs\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 36502,
		"path": "../public/pokemon-gifs/349.gif"
	},
	"/pokemon-gifs/350.gif": {
		"type": "image/gif",
		"etag": "\"158af-eTfND+vzpR1BhSSkZVxfgTufp6E\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 88239,
		"path": "../public/pokemon-gifs/350.gif"
	},
	"/pokemon-gifs/351.gif": {
		"type": "image/gif",
		"etag": "\"61c7-UioqTuMnoj3epVqpJjvRxDbx96o\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 25031,
		"path": "../public/pokemon-gifs/351.gif"
	},
	"/pokemon-gifs/352.gif": {
		"type": "image/gif",
		"etag": "\"e164-UeTmA7tY5ZxbeY7roq3nneQ2dzw\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 57700,
		"path": "../public/pokemon-gifs/352.gif"
	},
	"/pokemon-gifs/353.gif": {
		"type": "image/gif",
		"etag": "\"7e1c-g8TDWcEDfyczrCTMTfb8qg/vfPc\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 32284,
		"path": "../public/pokemon-gifs/353.gif"
	},
	"/pokemon-gifs/354.gif": {
		"type": "image/gif",
		"etag": "\"c0b6-1mOetfvZeeAzWS07WkN1Iq7sOXU\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 49334,
		"path": "../public/pokemon-gifs/354.gif"
	},
	"/pokemon-gifs/355.gif": {
		"type": "image/gif",
		"etag": "\"ac3e-dFmqDCbh7Pivo5W/PbAgrCh2PQs\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 44094,
		"path": "../public/pokemon-gifs/355.gif"
	},
	"/pokemon-gifs/356.gif": {
		"type": "image/gif",
		"etag": "\"136c2-zBfZZtvh6j7n0UjzdTSspJAnbtE\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 79554,
		"path": "../public/pokemon-gifs/356.gif"
	},
	"/pokemon-gifs/358.gif": {
		"type": "image/gif",
		"etag": "\"844d-PjWRwAGNrTvXETM8QZ2uLDQT9aM\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 33869,
		"path": "../public/pokemon-gifs/358.gif"
	},
	"/pokemon-gifs/357.gif": {
		"type": "image/gif",
		"etag": "\"2f597-YRsX+xrgCD49QnWks60Dgf20oLk\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 193943,
		"path": "../public/pokemon-gifs/357.gif"
	},
	"/pokemon-gifs/359.gif": {
		"type": "image/gif",
		"etag": "\"f9db-LW9+qV3YGElXNsrgidnu2uHwgEo\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 63963,
		"path": "../public/pokemon-gifs/359.gif"
	},
	"/pokemon-gifs/36.gif": {
		"type": "image/gif",
		"etag": "\"a4a3-RYl2SpQXexdNiGhYtHvikqCPev0\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 42147,
		"path": "../public/pokemon-gifs/36.gif"
	},
	"/pokemon-gifs/360.gif": {
		"type": "image/gif",
		"etag": "\"6d00-EhUuJPN+7NtDx1BspcVSAOUrhVg\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 27904,
		"path": "../public/pokemon-gifs/360.gif"
	},
	"/pokemon-gifs/361.gif": {
		"type": "image/gif",
		"etag": "\"8723-CeR6BNhX8ahXlOKtFsUufqkDwxs\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 34595,
		"path": "../public/pokemon-gifs/361.gif"
	},
	"/pokemon-gifs/363.gif": {
		"type": "image/gif",
		"etag": "\"560c-CnCAXyizIt9OLpN0PnymIkLgwKE\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 22028,
		"path": "../public/pokemon-gifs/363.gif"
	},
	"/pokemon-gifs/362.gif": {
		"type": "image/gif",
		"etag": "\"186d2-vPSDW6VyjEH9R8vSHIHE+qY18QY\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 100050,
		"path": "../public/pokemon-gifs/362.gif"
	},
	"/pokemon-gifs/364.gif": {
		"type": "image/gif",
		"etag": "\"a6dc-HVdrLGU0REe9Bxs9BxWFiab0awg\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 42716,
		"path": "../public/pokemon-gifs/364.gif"
	},
	"/pokemon-gifs/365.gif": {
		"type": "image/gif",
		"etag": "\"15d63-L+prehisdtIif5JpDz84eOutGYM\"",
		"mtime": "2026-09-05T11:32:52.708Z",
		"size": 89443,
		"path": "../public/pokemon-gifs/365.gif"
	},
	"/pokemon-gifs/366.gif": {
		"type": "image/gif",
		"etag": "\"aedc-Gy+VuFdOtCQx5T/WmDfgM0Ov9Wk\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 44764,
		"path": "../public/pokemon-gifs/366.gif"
	},
	"/pokemon-gifs/367.gif": {
		"type": "image/gif",
		"etag": "\"dcbb-x7zy9kvbwW6YVddfRiUCcusiaVQ\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 56507,
		"path": "../public/pokemon-gifs/367.gif"
	},
	"/pokemon-gifs/368.gif": {
		"type": "image/gif",
		"etag": "\"11a73-X9OBoMB+/aqGoxtef/HmGo90dZU\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 72307,
		"path": "../public/pokemon-gifs/368.gif"
	},
	"/pokemon-gifs/370.gif": {
		"type": "image/gif",
		"etag": "\"61b0-/BlAfbQ/H6GTEEcZEMlNDLYNAnQ\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 25008,
		"path": "../public/pokemon-gifs/370.gif"
	},
	"/pokemon-gifs/37.gif": {
		"type": "image/gif",
		"etag": "\"7753-IMZ70U4onJS3+qOrouPPIxBPPgM\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 30547,
		"path": "../public/pokemon-gifs/37.gif"
	},
	"/pokemon-gifs/371.gif": {
		"type": "image/gif",
		"etag": "\"4895-ze1nqXWG+ttHK98wiuvRiLgB0eI\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 18581,
		"path": "../public/pokemon-gifs/371.gif"
	},
	"/pokemon-gifs/369.gif": {
		"type": "image/gif",
		"etag": "\"18983-frlWslc4jsQLBISkiPXaAOzjb4g\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 100739,
		"path": "../public/pokemon-gifs/369.gif"
	},
	"/pokemon-gifs/372.gif": {
		"type": "image/gif",
		"etag": "\"fa2e-+QDQ+OzMy8gHdEcq4Q6Gkuvpd20\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 64046,
		"path": "../public/pokemon-gifs/372.gif"
	},
	"/pokemon-gifs/374.gif": {
		"type": "image/gif",
		"etag": "\"7dad-u2vAyzrn/gc5sVs2qlBZGBNboGE\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 32173,
		"path": "../public/pokemon-gifs/374.gif"
	},
	"/pokemon-gifs/375.gif": {
		"type": "image/gif",
		"etag": "\"16ab9-DCNDn782Bgn1unKwGgACYmZlCM0\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 92857,
		"path": "../public/pokemon-gifs/375.gif"
	},
	"/pokemon-gifs/373.gif": {
		"type": "image/gif",
		"etag": "\"1cc69-F37H7ohVC7FTdDuLtyDpHVdsPrI\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 117865,
		"path": "../public/pokemon-gifs/373.gif"
	},
	"/pokemon-gifs/376.gif": {
		"type": "image/gif",
		"etag": "\"26ca9-0WE+hSu586MZDxVbvZ247Gk45KU\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 158889,
		"path": "../public/pokemon-gifs/376.gif"
	},
	"/pokemon-gifs/377.gif": {
		"type": "image/gif",
		"etag": "\"22e01-E/n9MuTjeuuIsU+6krsTawcgX84\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 142849,
		"path": "../public/pokemon-gifs/377.gif"
	},
	"/pokemon-gifs/379.gif": {
		"type": "image/gif",
		"etag": "\"1befb-xsycNfpyhtWER//5hAE3JtSQ9Eg\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 114427,
		"path": "../public/pokemon-gifs/379.gif"
	},
	"/pokemon-gifs/378.gif": {
		"type": "image/gif",
		"etag": "\"241f7-63onQgMQxEs82NFW09HKhLGIeno\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 147959,
		"path": "../public/pokemon-gifs/378.gif"
	},
	"/pokemon-gifs/38.gif": {
		"type": "image/gif",
		"etag": "\"19a61-h05rsrPAj6SW4DAhViQMyVliU7A\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 105057,
		"path": "../public/pokemon-gifs/38.gif"
	},
	"/pokemon-gifs/380.gif": {
		"type": "image/gif",
		"etag": "\"11800-FV+YaMZW9PwxS5s58C0EHxPrA6c\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 71680,
		"path": "../public/pokemon-gifs/380.gif"
	},
	"/pokemon-gifs/381.gif": {
		"type": "image/gif",
		"etag": "\"1aa38-dtVbGqzA4kAZobzcI+Ov6TpldDw\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 109112,
		"path": "../public/pokemon-gifs/381.gif"
	},
	"/pokemon-gifs/382.gif": {
		"type": "image/gif",
		"etag": "\"184e9-lXP6nf6Y99AnkydJouuiG1vb138\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 99561,
		"path": "../public/pokemon-gifs/382.gif"
	},
	"/pokemon-gifs/383.gif": {
		"type": "image/gif",
		"etag": "\"1dc28-lQRoyVkIeeDbKSXnnY2KlD8Mwxg\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 121896,
		"path": "../public/pokemon-gifs/383.gif"
	},
	"/pokemon-gifs/384.gif": {
		"type": "image/gif",
		"etag": "\"304a1-UbfxnXQUQ+T9xl3svuFfS5JnEa4\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 197793,
		"path": "../public/pokemon-gifs/384.gif"
	},
	"/pokemon-gifs/385.gif": {
		"type": "image/gif",
		"etag": "\"abd2-fbqmzY7n+9DN+ZNaFYGU3SynCok\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 43986,
		"path": "../public/pokemon-gifs/385.gif"
	},
	"/pokemon-gifs/387.gif": {
		"type": "image/gif",
		"etag": "\"7786-azAlL3eiMRgzlAOa6Ik6olNyPzw\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 30598,
		"path": "../public/pokemon-gifs/387.gif"
	},
	"/pokemon-gifs/386.gif": {
		"type": "image/gif",
		"etag": "\"15455-sMU0o/iw1q2dzQi5Gjw/L5gOJLU\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 87125,
		"path": "../public/pokemon-gifs/386.gif"
	},
	"/pokemon-gifs/388.gif": {
		"type": "image/gif",
		"etag": "\"12dc1-D125gQJzKrIvokE2xMRtuWhfkoQ\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 77249,
		"path": "../public/pokemon-gifs/388.gif"
	},
	"/pokemon-gifs/389.gif": {
		"type": "image/gif",
		"etag": "\"1fb00-Dg4JcZRNNM0pRsvW93tLjqQJa/I\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 129792,
		"path": "../public/pokemon-gifs/389.gif"
	},
	"/pokemon-gifs/39.gif": {
		"type": "image/gif",
		"etag": "\"7d1d-ZPl4B9EbvcCgIBa3UzRvENOR4lA\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 32029,
		"path": "../public/pokemon-gifs/39.gif"
	},
	"/pokemon-gifs/391.gif": {
		"type": "image/gif",
		"etag": "\"7e5c-YvQ28bcSU2MUCs964IK6bSIrxHs\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 32348,
		"path": "../public/pokemon-gifs/391.gif"
	},
	"/pokemon-gifs/390.gif": {
		"type": "image/gif",
		"etag": "\"5af1-wvgY/A0HBJGTybeVNzvkOMOh1Tg\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 23281,
		"path": "../public/pokemon-gifs/390.gif"
	},
	"/pokemon-gifs/393.gif": {
		"type": "image/gif",
		"etag": "\"79c3-d//jRWE6yya/6/5oTRCo9R1ermA\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 31171,
		"path": "../public/pokemon-gifs/393.gif"
	},
	"/pokemon-gifs/394.gif": {
		"type": "image/gif",
		"etag": "\"b319-pZPxE7gczXwSt1DRjBVaN60BIe4\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 45849,
		"path": "../public/pokemon-gifs/394.gif"
	},
	"/pokemon-gifs/392.gif": {
		"type": "image/gif",
		"etag": "\"107bc-yXOQXHGxc2K2UY7g6p4behfMbTg\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 67516,
		"path": "../public/pokemon-gifs/392.gif"
	},
	"/pokemon-gifs/397.gif": {
		"type": "image/gif",
		"etag": "\"4d39-MlxXbmT3OpkG0Wx2Seh6zBj6aFk\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 19769,
		"path": "../public/pokemon-gifs/397.gif"
	},
	"/pokemon-gifs/396.gif": {
		"type": "image/gif",
		"etag": "\"3017-+KdcaYs8dhYZqVOtQB8A5ds8es0\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 12311,
		"path": "../public/pokemon-gifs/396.gif"
	},
	"/pokemon-gifs/395.gif": {
		"type": "image/gif",
		"etag": "\"16b1f-B8vuBdiwSm6hK4wCelL17kCXi4Y\"",
		"mtime": "2026-09-05T11:32:52.709Z",
		"size": 92959,
		"path": "../public/pokemon-gifs/395.gif"
	},
	"/pokemon-gifs/398.gif": {
		"type": "image/gif",
		"etag": "\"c9b2-gucWw10wus1HZF0w2U2yDibkXoU\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 51634,
		"path": "../public/pokemon-gifs/398.gif"
	},
	"/pokemon-gifs/399.gif": {
		"type": "image/gif",
		"etag": "\"80fb-wSmJM8cmL98SAadfGLHVdcsDsxY\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 33019,
		"path": "../public/pokemon-gifs/399.gif"
	},
	"/pokemon-gifs/4.gif": {
		"type": "image/gif",
		"etag": "\"c194-gqcc+Y2BIMLNl5flyw3xV1Y6xBY\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 49556,
		"path": "../public/pokemon-gifs/4.gif"
	},
	"/pokemon-gifs/40.gif": {
		"type": "image/gif",
		"etag": "\"f2e4-R2iuqH12DKzT/A4dSyoyy3xSQco\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 62180,
		"path": "../public/pokemon-gifs/40.gif"
	},
	"/pokemon-gifs/400.gif": {
		"type": "image/gif",
		"etag": "\"abc6-T44SE5OzGMYIlgzJ6kjC5p+U8Ew\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 43974,
		"path": "../public/pokemon-gifs/400.gif"
	},
	"/pokemon-gifs/401.gif": {
		"type": "image/gif",
		"etag": "\"af1e-Tf+vCwOJh4Uv539unxXdWZrFKi0\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 44830,
		"path": "../public/pokemon-gifs/401.gif"
	},
	"/pokemon-gifs/402.gif": {
		"type": "image/gif",
		"etag": "\"b753-bcNPxy0vmbMOxGcCOrbyjp2EDp4\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 46931,
		"path": "../public/pokemon-gifs/402.gif"
	},
	"/pokemon-gifs/403.gif": {
		"type": "image/gif",
		"etag": "\"7e32-FWp8/4/flDkQD4giCMs7Dhgt4Vo\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 32306,
		"path": "../public/pokemon-gifs/403.gif"
	},
	"/pokemon-gifs/404.gif": {
		"type": "image/gif",
		"etag": "\"ec20-3WIVBb2Pp6SqJM7B6YZeWVbWbHQ\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 60448,
		"path": "../public/pokemon-gifs/404.gif"
	},
	"/pokemon-gifs/406.gif": {
		"type": "image/gif",
		"etag": "\"726a-cKZrHuDSETxOYbDv1nI6HS8z7CA\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 29290,
		"path": "../public/pokemon-gifs/406.gif"
	},
	"/pokemon-gifs/407.gif": {
		"type": "image/gif",
		"etag": "\"10a52-YmUhHcVNJ3a9biznDguupDPut0c\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 68178,
		"path": "../public/pokemon-gifs/407.gif"
	},
	"/pokemon-gifs/405.gif": {
		"type": "image/gif",
		"etag": "\"18380-41/DTk10AGavoU3Y/gBSl99MFq8\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 99200,
		"path": "../public/pokemon-gifs/405.gif"
	},
	"/pokemon-gifs/409.gif": {
		"type": "image/gif",
		"etag": "\"11f7d-EXxLCgpV7WsBCIfk6bnkycm8X64\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 73597,
		"path": "../public/pokemon-gifs/409.gif"
	},
	"/pokemon-gifs/41.gif": {
		"type": "image/gif",
		"etag": "\"72b1-MNkmLdkhUm+G9tsARhbJ+zfhb1I\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 29361,
		"path": "../public/pokemon-gifs/41.gif"
	},
	"/pokemon-gifs/408.gif": {
		"type": "image/gif",
		"etag": "\"7430-aRIPJi5e9EeUG5jegRefJfNHet0\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 29744,
		"path": "../public/pokemon-gifs/408.gif"
	},
	"/pokemon-gifs/411.gif": {
		"type": "image/gif",
		"etag": "\"17827-yPA1iHIQrkHa1t7jpsEs77ASoKg\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 96295,
		"path": "../public/pokemon-gifs/411.gif"
	},
	"/pokemon-gifs/410.gif": {
		"type": "image/gif",
		"etag": "\"b095-Safra7fuveRlieApddUMfZ+7TrY\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 45205,
		"path": "../public/pokemon-gifs/410.gif"
	},
	"/pokemon-gifs/412.gif": {
		"type": "image/gif",
		"etag": "\"8173-XbUQeHA0Qy7ByLvjoP8+n0FSYz4\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 33139,
		"path": "../public/pokemon-gifs/412.gif"
	},
	"/pokemon-gifs/413.gif": {
		"type": "image/gif",
		"etag": "\"1153c-9qJ02iBDXYFqk5NXNU4ULt/lUuY\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 70972,
		"path": "../public/pokemon-gifs/413.gif"
	},
	"/pokemon-gifs/414.gif": {
		"type": "image/gif",
		"etag": "\"de03-mufg0V8VtP8UiCbetmZLZ7i34D8\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 56835,
		"path": "../public/pokemon-gifs/414.gif"
	},
	"/pokemon-gifs/415.gif": {
		"type": "image/gif",
		"etag": "\"7164-Q3t+6KIZ+9iRznu8a94o/jD84Q8\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 29028,
		"path": "../public/pokemon-gifs/415.gif"
	},
	"/pokemon-gifs/416.gif": {
		"type": "image/gif",
		"etag": "\"10762-wRrv6dsGSFXomWFvr3/cXOpC89c\"",
		"mtime": "2026-09-05T11:32:52.710Z",
		"size": 67426,
		"path": "../public/pokemon-gifs/416.gif"
	},
	"/pokemon-gifs/417.gif": {
		"type": "image/gif",
		"etag": "\"9732-eyKA3WBOntpQue1EWay3o7F4m2w\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 38706,
		"path": "../public/pokemon-gifs/417.gif"
	},
	"/pokemon-gifs/418.gif": {
		"type": "image/gif",
		"etag": "\"993c-AR4IbLgukj7sQpQEvOXbwk1A0Sw\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 39228,
		"path": "../public/pokemon-gifs/418.gif"
	},
	"/pokemon-gifs/419.gif": {
		"type": "image/gif",
		"etag": "\"ca21-7RhFSh0MSZag54HuIos+Cr1rids\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 51745,
		"path": "../public/pokemon-gifs/419.gif"
	},
	"/pokemon-gifs/420.gif": {
		"type": "image/gif",
		"etag": "\"6707-CpFjTf5q/mfp8gkBQ2vhIM6p2tY\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 26375,
		"path": "../public/pokemon-gifs/420.gif"
	},
	"/pokemon-gifs/42.gif": {
		"type": "image/gif",
		"etag": "\"fa3e-E/Bh9a6mExR/8nDMV69MVcocQ8s\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 64062,
		"path": "../public/pokemon-gifs/42.gif"
	},
	"/pokemon-gifs/421.gif": {
		"type": "image/gif",
		"etag": "\"ea4d-pJmQFw1sJ+xmzXlInmcf0CUbluM\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 59981,
		"path": "../public/pokemon-gifs/421.gif"
	},
	"/pokemon-gifs/422.gif": {
		"type": "image/gif",
		"etag": "\"a21c-j+7wwgr1RYaY/DEnMWmcqErmMAM\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 41500,
		"path": "../public/pokemon-gifs/422.gif"
	},
	"/pokemon-gifs/423.gif": {
		"type": "image/gif",
		"etag": "\"1254e-LNetd38EDNkEyUEhRUCZ7juSEqQ\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 75086,
		"path": "../public/pokemon-gifs/423.gif"
	},
	"/pokemon-gifs/424.gif": {
		"type": "image/gif",
		"etag": "\"1519f-u0kq5q9EMjz0W5NSm0LADNK4wAQ\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 86431,
		"path": "../public/pokemon-gifs/424.gif"
	},
	"/pokemon-gifs/425.gif": {
		"type": "image/gif",
		"etag": "\"8929-k19OMgtHcpnk7ypqwAchStH35+0\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 35113,
		"path": "../public/pokemon-gifs/425.gif"
	},
	"/pokemon-gifs/426.gif": {
		"type": "image/gif",
		"etag": "\"1579c-7wtTP2PpE+pUWNSzoFZ4sOpBkzs\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 87964,
		"path": "../public/pokemon-gifs/426.gif"
	},
	"/pokemon-gifs/427.gif": {
		"type": "image/gif",
		"etag": "\"9163-YnzPpS0Ts9FXG/u475YNrDczPgA\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 37219,
		"path": "../public/pokemon-gifs/427.gif"
	},
	"/pokemon-gifs/428.gif": {
		"type": "image/gif",
		"etag": "\"1031a-gXhxvl2qx/U+9wLdXk139P8tfJk\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 66330,
		"path": "../public/pokemon-gifs/428.gif"
	},
	"/pokemon-gifs/429.gif": {
		"type": "image/gif",
		"etag": "\"13f5b-3VNDB28hbQ5HFuEBaiGtCZGLHBQ\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 81755,
		"path": "../public/pokemon-gifs/429.gif"
	},
	"/pokemon-gifs/43.gif": {
		"type": "image/gif",
		"etag": "\"6d26-8uxUuWs6IHAb5cTSRQT+9P748ow\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 27942,
		"path": "../public/pokemon-gifs/43.gif"
	},
	"/pokemon-gifs/431.gif": {
		"type": "image/gif",
		"etag": "\"c533-XxgO/oXPquuPoZ3Y9mSskOl/H1k\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 50483,
		"path": "../public/pokemon-gifs/431.gif"
	},
	"/pokemon-gifs/430.gif": {
		"type": "image/gif",
		"etag": "\"11341-MCx/9lrbB6HsSLjjKy6o+RDWlpA\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 70465,
		"path": "../public/pokemon-gifs/430.gif"
	},
	"/pokemon-gifs/433.gif": {
		"type": "image/gif",
		"etag": "\"45cf-Qr+a3FTZ3UyliOzCLDQeBnoYPn8\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 17871,
		"path": "../public/pokemon-gifs/433.gif"
	},
	"/pokemon-gifs/432.gif": {
		"type": "image/gif",
		"etag": "\"1ba05-T3SIC9HuwBSqUEc6EF5A1xOCn7s\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 113157,
		"path": "../public/pokemon-gifs/432.gif"
	},
	"/pokemon-gifs/434.gif": {
		"type": "image/gif",
		"etag": "\"8516-4ujqyTGAatg7JvgU/AgbnwdmPJY\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 34070,
		"path": "../public/pokemon-gifs/434.gif"
	},
	"/pokemon-gifs/435.gif": {
		"type": "image/gif",
		"etag": "\"ce7f-YY5wJD6omL4Y4q42WTIp9HFLjQw\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 52863,
		"path": "../public/pokemon-gifs/435.gif"
	},
	"/pokemon-gifs/436.gif": {
		"type": "image/gif",
		"etag": "\"9bc0-UF3qHSqhRkie82feIZ9M2Y93cH8\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 39872,
		"path": "../public/pokemon-gifs/436.gif"
	},
	"/pokemon-gifs/438.gif": {
		"type": "image/gif",
		"etag": "\"5b7c-y4sTPxpjVnBBYhEdcXmzcxuI1hk\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 23420,
		"path": "../public/pokemon-gifs/438.gif"
	},
	"/pokemon-gifs/439.gif": {
		"type": "image/gif",
		"etag": "\"4d7a-8OP+UtQjCV7xJMU6xJxOV+tt0jo\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 19834,
		"path": "../public/pokemon-gifs/439.gif"
	},
	"/pokemon-gifs/437.gif": {
		"type": "image/gif",
		"etag": "\"1948f-IXec+BAf0bB+XqPLuWvYzYsJRMI\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 103567,
		"path": "../public/pokemon-gifs/437.gif"
	},
	"/pokemon-gifs/44.gif": {
		"type": "image/gif",
		"etag": "\"782a-Kq721Tup49oSDjDxCHLnDglJ3a8\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 30762,
		"path": "../public/pokemon-gifs/44.gif"
	},
	"/pokemon-gifs/440.gif": {
		"type": "image/gif",
		"etag": "\"5571-9OTvSj6iI92ZfcKftWl4R7frmNc\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 21873,
		"path": "../public/pokemon-gifs/440.gif"
	},
	"/pokemon-gifs/441.gif": {
		"type": "image/gif",
		"etag": "\"4846-WKAk4EAFs4rTf6lRsoGh5NpQ91U\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 18502,
		"path": "../public/pokemon-gifs/441.gif"
	},
	"/pokemon-gifs/442.gif": {
		"type": "image/gif",
		"etag": "\"1e1e0-MCmUqKpGqu8yMBhyTJd8zjvPFxg\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 123360,
		"path": "../public/pokemon-gifs/442.gif"
	},
	"/pokemon-gifs/443.gif": {
		"type": "image/gif",
		"etag": "\"5b78-bQ2fi6ZZo9NqQwHiIRAf5W25F/E\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 23416,
		"path": "../public/pokemon-gifs/443.gif"
	},
	"/pokemon-gifs/444.gif": {
		"type": "image/gif",
		"etag": "\"9983-FWclNiT8X7WzKn1M2dVIi2aCA2A\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 39299,
		"path": "../public/pokemon-gifs/444.gif"
	},
	"/pokemon-gifs/446.gif": {
		"type": "image/gif",
		"etag": "\"b261-PLHZmuHxJVAYjyJFeOffaJzrhlQ\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 45665,
		"path": "../public/pokemon-gifs/446.gif"
	},
	"/pokemon-gifs/447.gif": {
		"type": "image/gif",
		"etag": "\"4eea-kdPCxjAgTZ5YE9kTQCqV8cUdYxI\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 20202,
		"path": "../public/pokemon-gifs/447.gif"
	},
	"/pokemon-gifs/445.gif": {
		"type": "image/gif",
		"etag": "\"1ee9b-8gezMQjLLhMy0+qUjUWvuD1QTlA\"",
		"mtime": "2026-09-05T11:32:52.711Z",
		"size": 126619,
		"path": "../public/pokemon-gifs/445.gif"
	},
	"/pokemon-gifs/449.gif": {
		"type": "image/gif",
		"etag": "\"100b1-EgSw8PR6ErcNbQADoxbh2rRBlYE\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 65713,
		"path": "../public/pokemon-gifs/449.gif"
	},
	"/pokemon-gifs/45.gif": {
		"type": "image/gif",
		"etag": "\"5346-B0jUWcfrcbOhwzFbKCriAvWUj9o\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 21318,
		"path": "../public/pokemon-gifs/45.gif"
	},
	"/pokemon-gifs/448.gif": {
		"type": "image/gif",
		"etag": "\"f830-Kvd+3r9XgzPvc9u9t0nvn3GMUgA\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 63536,
		"path": "../public/pokemon-gifs/448.gif"
	},
	"/pokemon-gifs/450.gif": {
		"type": "image/gif",
		"etag": "\"12be8-kr46/17ReGZtjj7Utve+N2ZVSU0\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 76776,
		"path": "../public/pokemon-gifs/450.gif"
	},
	"/pokemon-gifs/451.gif": {
		"type": "image/gif",
		"etag": "\"c7f4-fvgiUKu/mXGfq/qirSKB4Ng6d8c\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 51188,
		"path": "../public/pokemon-gifs/451.gif"
	},
	"/pokemon-gifs/453.gif": {
		"type": "image/gif",
		"etag": "\"8561-+rcZ3F5NQ6axDS+7d3pRoabaJ3c\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 34145,
		"path": "../public/pokemon-gifs/453.gif"
	},
	"/pokemon-gifs/454.gif": {
		"type": "image/gif",
		"etag": "\"44c4-a1nRrcG+9Re/rgBRj/mki68vqvs\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 17604,
		"path": "../public/pokemon-gifs/454.gif"
	},
	"/pokemon-gifs/452.gif": {
		"type": "image/gif",
		"etag": "\"25590-HLCxKWYT/e9G0eX5PkPdryPp120\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 152976,
		"path": "../public/pokemon-gifs/452.gif"
	},
	"/pokemon-gifs/455.gif": {
		"type": "image/gif",
		"etag": "\"12d4f-Hg9TijEx1x4vNyQF4kXiMGsBnXA\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 77135,
		"path": "../public/pokemon-gifs/455.gif"
	},
	"/pokemon-gifs/456.gif": {
		"type": "image/gif",
		"etag": "\"89ae-NwhHx0Z+A02N7eSKw7eX6qLSreo\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 35246,
		"path": "../public/pokemon-gifs/456.gif"
	},
	"/pokemon-gifs/457.gif": {
		"type": "image/gif",
		"etag": "\"10eb5-PH7IQVv6VLj14Z0QBocndYDVJsY\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 69301,
		"path": "../public/pokemon-gifs/457.gif"
	},
	"/pokemon-gifs/458.gif": {
		"type": "image/gif",
		"etag": "\"cb3f-KJvQP38//t2l8E2i8FNam6qj9Do\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 52031,
		"path": "../public/pokemon-gifs/458.gif"
	},
	"/pokemon-gifs/459.gif": {
		"type": "image/gif",
		"etag": "\"175c5-14oB+4l6dDM5+wKXGG2HZyc3XdY\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 95685,
		"path": "../public/pokemon-gifs/459.gif"
	},
	"/pokemon-gifs/46.gif": {
		"type": "image/gif",
		"etag": "\"636c-XSwI/jaMAN+AriSmurM2coeMDzo\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 25452,
		"path": "../public/pokemon-gifs/46.gif"
	},
	"/pokemon-gifs/460.gif": {
		"type": "image/gif",
		"etag": "\"1960e-0BwYAkHcUo7yqc+g7xUG0a9JTXU\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 103950,
		"path": "../public/pokemon-gifs/460.gif"
	},
	"/pokemon-gifs/461.gif": {
		"type": "image/gif",
		"etag": "\"8584-5uiji9pnShGUHfA8qo0dvQq+mq4\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 34180,
		"path": "../public/pokemon-gifs/461.gif"
	},
	"/pokemon-gifs/462.gif": {
		"type": "image/gif",
		"etag": "\"138a3-pKWPIPFmPi8BYVCz8NnQPFujg8Y\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 80035,
		"path": "../public/pokemon-gifs/462.gif"
	},
	"/pokemon-gifs/463.gif": {
		"type": "image/gif",
		"etag": "\"bac6-EikzQHAuOBXnp3aF9ILpk5Ilv6M\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 47814,
		"path": "../public/pokemon-gifs/463.gif"
	},
	"/pokemon-gifs/464.gif": {
		"type": "image/gif",
		"etag": "\"24a2f-cAmy6XHbJC+rhrgBQnRo2hXvz9U\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 150063,
		"path": "../public/pokemon-gifs/464.gif"
	},
	"/pokemon-gifs/465.gif": {
		"type": "image/gif",
		"etag": "\"22f99-SBLQ2379ytQo0SkjD/Ut+5KmIgk\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 143257,
		"path": "../public/pokemon-gifs/465.gif"
	},
	"/pokemon-gifs/466.gif": {
		"type": "image/gif",
		"etag": "\"1e0e1-8ZoAbacj+pia7zgIURv45DXFpZo\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 123105,
		"path": "../public/pokemon-gifs/466.gif"
	},
	"/pokemon-gifs/467.gif": {
		"type": "image/gif",
		"etag": "\"1b179-qfFPu//C18i8ITQ5/Ltjf8KWHvI\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 110969,
		"path": "../public/pokemon-gifs/467.gif"
	},
	"/pokemon-gifs/468.gif": {
		"type": "image/gif",
		"etag": "\"91c0-ZDBYkaVIdjH8Siy5rkbGkHBe6dI\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 37312,
		"path": "../public/pokemon-gifs/468.gif"
	},
	"/pokemon-gifs/469.gif": {
		"type": "image/gif",
		"etag": "\"ed84-q4/IR1wlKufvNBdaQkML1pUxyfk\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 60804,
		"path": "../public/pokemon-gifs/469.gif"
	},
	"/pokemon-gifs/47.gif": {
		"type": "image/gif",
		"etag": "\"f8a9-9hE7t/ULBnmwuirdHplx5ldycKU\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 63657,
		"path": "../public/pokemon-gifs/47.gif"
	},
	"/pokemon-gifs/471.gif": {
		"type": "image/gif",
		"etag": "\"f1c8-Uc4L7KZOaJFszXUFk4wtqx4gFi0\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 61896,
		"path": "../public/pokemon-gifs/471.gif"
	},
	"/pokemon-gifs/470.gif": {
		"type": "image/gif",
		"etag": "\"ba3f-Njy1aYR4gnWbH1lmsvX6dWC2lwc\"",
		"mtime": "2026-09-05T11:32:52.712Z",
		"size": 47679,
		"path": "../public/pokemon-gifs/470.gif"
	},
	"/pokemon-gifs/472.gif": {
		"type": "image/gif",
		"etag": "\"1a8c7-HNVYKeT5wlgqfIrWtSDL5qwqFqQ\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 108743,
		"path": "../public/pokemon-gifs/472.gif"
	},
	"/pokemon-gifs/473.gif": {
		"type": "image/gif",
		"etag": "\"269a7-lmuwGP6T20mfmwcd2SGq7MgeczM\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 158119,
		"path": "../public/pokemon-gifs/473.gif"
	},
	"/pokemon-gifs/474.gif": {
		"type": "image/gif",
		"etag": "\"d91a-VQJyXlkEJa+C5AHfHVjV9nKiAOA\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 55578,
		"path": "../public/pokemon-gifs/474.gif"
	},
	"/pokemon-gifs/475.gif": {
		"type": "image/gif",
		"etag": "\"879d-WJOAZX0v91Ny9jG1oZKpPnDrRcE\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 34717,
		"path": "../public/pokemon-gifs/475.gif"
	},
	"/pokemon-gifs/476.gif": {
		"type": "image/gif",
		"etag": "\"1372c-AHex0Uk4x83GEFD9d/v7pW7FGRU\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 79660,
		"path": "../public/pokemon-gifs/476.gif"
	},
	"/pokemon-gifs/479.gif": {
		"type": "image/gif",
		"etag": "\"89eb-HAwLkL2pZFps0uAP8fkUMs/HcDI\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 35307,
		"path": "../public/pokemon-gifs/479.gif"
	},
	"/pokemon-gifs/478.gif": {
		"type": "image/gif",
		"etag": "\"11b12-YIqnR6KYOKgUeyXGIZ9uXiaQTHU\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 72466,
		"path": "../public/pokemon-gifs/478.gif"
	},
	"/pokemon-gifs/477.gif": {
		"type": "image/gif",
		"etag": "\"23b90-QPRvsAGMqm6qlRLcqxnPhJuoL5c\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 146320,
		"path": "../public/pokemon-gifs/477.gif"
	},
	"/pokemon-gifs/48.gif": {
		"type": "image/gif",
		"etag": "\"b813-7GvX59JXM48kZ996fV4VxG2XAPg\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 47123,
		"path": "../public/pokemon-gifs/48.gif"
	},
	"/pokemon-gifs/480.gif": {
		"type": "image/gif",
		"etag": "\"133cc-dZpuzSv45qFD0j/ht0Du/eKoX/Q\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 78796,
		"path": "../public/pokemon-gifs/480.gif"
	},
	"/pokemon-gifs/481.gif": {
		"type": "image/gif",
		"etag": "\"d970-04F8EDtkLY62XW4AEJIoe1avL6M\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 55664,
		"path": "../public/pokemon-gifs/481.gif"
	},
	"/pokemon-gifs/482.gif": {
		"type": "image/gif",
		"etag": "\"10061-2GApK5maBs/vYqgF3BxDFGwmd70\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 65633,
		"path": "../public/pokemon-gifs/482.gif"
	},
	"/pokemon-gifs/483.gif": {
		"type": "image/gif",
		"etag": "\"5045e-FD2cZgzFGzAvdxE/rWumT0Wx/+w\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 328798,
		"path": "../public/pokemon-gifs/483.gif"
	},
	"/pokemon-gifs/485.gif": {
		"type": "image/gif",
		"etag": "\"1eb6d-6YfAPlI3IvB7SshJMWb38tVJCrI\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 125805,
		"path": "../public/pokemon-gifs/485.gif"
	},
	"/pokemon-gifs/486.gif": {
		"type": "image/gif",
		"etag": "\"39b6e-pyPCh9xiZaL+m3AeFqB0OgC0Xlg\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 236398,
		"path": "../public/pokemon-gifs/486.gif"
	},
	"/pokemon-gifs/484.gif": {
		"type": "image/gif",
		"etag": "\"3587b-qxaHb1smy1EFMtr3yY8JU20ZrX4\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 219259,
		"path": "../public/pokemon-gifs/484.gif"
	},
	"/pokemon-gifs/487.gif": {
		"type": "image/gif",
		"etag": "\"36787-vIbmICIr4L6Oxs7psE+CFKdwzLE\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 223111,
		"path": "../public/pokemon-gifs/487.gif"
	},
	"/pokemon-gifs/489.gif": {
		"type": "image/gif",
		"etag": "\"ece6-Xk3rgn6MtH1lz7LjHXgDz3JVt0Y\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 60646,
		"path": "../public/pokemon-gifs/489.gif"
	},
	"/pokemon-gifs/49.gif": {
		"type": "image/gif",
		"etag": "\"12aa2-awrxv3yVRwbNjGh7espSaqmmsAk\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 76450,
		"path": "../public/pokemon-gifs/49.gif"
	},
	"/pokemon-gifs/488.gif": {
		"type": "image/gif",
		"etag": "\"26815-Id8ZzxQhPJ+m8tDhHhKVx7u9eEA\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 157717,
		"path": "../public/pokemon-gifs/488.gif"
	},
	"/pokemon-gifs/490.gif": {
		"type": "image/gif",
		"etag": "\"7359-uZOcZFXsrzHUYZgvLWab32H61lA\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 29529,
		"path": "../public/pokemon-gifs/490.gif"
	},
	"/pokemon-gifs/491.gif": {
		"type": "image/gif",
		"etag": "\"122e3-1eo6nBDY8wKxZdQheliwfwllteU\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 74467,
		"path": "../public/pokemon-gifs/491.gif"
	},
	"/pokemon-gifs/492.gif": {
		"type": "image/gif",
		"etag": "\"6862-8GQiyORDYcpV+zDHmJi7/UFfNhI\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 26722,
		"path": "../public/pokemon-gifs/492.gif"
	},
	"/pokemon-gifs/494.gif": {
		"type": "image/gif",
		"etag": "\"65b7-C40POZWZYvj5M7qBGv703OsACmw\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 26039,
		"path": "../public/pokemon-gifs/494.gif"
	},
	"/pokemon-gifs/493.gif": {
		"type": "image/gif",
		"etag": "\"2b879-rhh2kTFFumIKwNY2FeR0IFomy0w\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 178297,
		"path": "../public/pokemon-gifs/493.gif"
	},
	"/pokemon-gifs/495.gif": {
		"type": "image/gif",
		"etag": "\"5ef0-BlZKLMn8AWEwZgvNAkVMY15moks\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 24304,
		"path": "../public/pokemon-gifs/495.gif"
	},
	"/pokemon-gifs/496.gif": {
		"type": "image/gif",
		"etag": "\"95f7-j8em1VRZ9HpbUeTABeYhFWL5m6Y\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 38391,
		"path": "../public/pokemon-gifs/496.gif"
	},
	"/pokemon-gifs/497.gif": {
		"type": "image/gif",
		"etag": "\"1a15f-OSASegRvldnvhz1k30YX7brsWiY\"",
		"mtime": "2026-09-05T11:32:52.713Z",
		"size": 106847,
		"path": "../public/pokemon-gifs/497.gif"
	},
	"/pokemon-gifs/498.gif": {
		"type": "image/gif",
		"etag": "\"75cc-tYsSvqztnJ2HtYIhcpUWBc7KgAs\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 30156,
		"path": "../public/pokemon-gifs/498.gif"
	},
	"/pokemon-gifs/499.gif": {
		"type": "image/gif",
		"etag": "\"c8d6-kxaCsVfISjsEsI4CkTcaStFNFk4\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 51414,
		"path": "../public/pokemon-gifs/499.gif"
	},
	"/pokemon-gifs/5.gif": {
		"type": "image/gif",
		"etag": "\"d713-t3TgmGZg7Ae6m3H3JiBmGc1pKwY\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 55059,
		"path": "../public/pokemon-gifs/5.gif"
	},
	"/pokemon-gifs/50.gif": {
		"type": "image/gif",
		"etag": "\"42d8-GlRXWrp95FzY+sWT4nFiZHsLJOQ\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 17112,
		"path": "../public/pokemon-gifs/50.gif"
	},
	"/pokemon-gifs/500.gif": {
		"type": "image/gif",
		"etag": "\"22308-kNCNRm9dy2/XxkoEcDu0Vg55a5s\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 140040,
		"path": "../public/pokemon-gifs/500.gif"
	},
	"/pokemon-gifs/51.gif": {
		"type": "image/gif",
		"etag": "\"16f0e-PoVsWAogxzVXFk+ONGNWqnMT4gY\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 93966,
		"path": "../public/pokemon-gifs/51.gif"
	},
	"/pokemon-gifs/52.gif": {
		"type": "image/gif",
		"etag": "\"912b-DPV4i5EgYZZBT/upRyhvxPHoLRI\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 37163,
		"path": "../public/pokemon-gifs/52.gif"
	},
	"/pokemon-gifs/53.gif": {
		"type": "image/gif",
		"etag": "\"ee2c-/zJB4Fk2jGMiPbWzTG6XP6Mz57M\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 60972,
		"path": "../public/pokemon-gifs/53.gif"
	},
	"/pokemon-gifs/54.gif": {
		"type": "image/gif",
		"etag": "\"7202-0/OcARZKevC+XAZnDSVpmu+gwsE\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 29186,
		"path": "../public/pokemon-gifs/54.gif"
	},
	"/pokemon-gifs/56.gif": {
		"type": "image/gif",
		"etag": "\"5344-uruPT+XgFupy4krvbNJSKnfyYA0\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 21316,
		"path": "../public/pokemon-gifs/56.gif"
	},
	"/pokemon-gifs/55.gif": {
		"type": "image/gif",
		"etag": "\"dc0d-8BfujqiQu8zvWZPkhP0lhkJ1qsQ\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 56333,
		"path": "../public/pokemon-gifs/55.gif"
	},
	"/pokemon-gifs/58.gif": {
		"type": "image/gif",
		"etag": "\"4c42-l4KF2RbHsLVvhfS5ixxC6ZRo4K4\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 19522,
		"path": "../public/pokemon-gifs/58.gif"
	},
	"/pokemon-gifs/57.gif": {
		"type": "image/gif",
		"etag": "\"a8f8-plBgyzvA6WgoZdUt3FNXmL1tKdE\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 43256,
		"path": "../public/pokemon-gifs/57.gif"
	},
	"/pokemon-gifs/59.gif": {
		"type": "image/gif",
		"etag": "\"14578-xOVd40KSwodUl5Qc2kSiC5Q8RfQ\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 83320,
		"path": "../public/pokemon-gifs/59.gif"
	},
	"/pokemon-gifs/6.gif": {
		"type": "image/gif",
		"etag": "\"16112-X3wo4fMRNrf2atXcRg3guGZ5rPY\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 90386,
		"path": "../public/pokemon-gifs/6.gif"
	},
	"/pokemon-gifs/60.gif": {
		"type": "image/gif",
		"etag": "\"6a5a-5JbKCeceyeh4Bms8HS0HEP5hhao\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 27226,
		"path": "../public/pokemon-gifs/60.gif"
	},
	"/pokemon-gifs/61.gif": {
		"type": "image/gif",
		"etag": "\"9b4d-2ZNn1LATvPFL1vwEQcPvCv4qoHk\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 39757,
		"path": "../public/pokemon-gifs/61.gif"
	},
	"/pokemon-gifs/62.gif": {
		"type": "image/gif",
		"etag": "\"a9d1-WxExDsqPz8Cpd9SfpEDtru2dTHc\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 43473,
		"path": "../public/pokemon-gifs/62.gif"
	},
	"/pokemon-gifs/63.gif": {
		"type": "image/gif",
		"etag": "\"f74d-qsYL+eo0FEA9RW9yCfCNNdTcJFc\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 63309,
		"path": "../public/pokemon-gifs/63.gif"
	},
	"/pokemon-gifs/64.gif": {
		"type": "image/gif",
		"etag": "\"11a39-SlHRmBqlyIV8gMHypdjMECwfu1A\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 72249,
		"path": "../public/pokemon-gifs/64.gif"
	},
	"/pokemon-gifs/66.gif": {
		"type": "image/gif",
		"etag": "\"58f4-B5Z9j9fYpU7fQY5/3bjRQKYovwY\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 22772,
		"path": "../public/pokemon-gifs/66.gif"
	},
	"/pokemon-gifs/65.gif": {
		"type": "image/gif",
		"etag": "\"1a3cf-kfBi8iPC7ILciCnLFWqTYF8jock\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 107471,
		"path": "../public/pokemon-gifs/65.gif"
	},
	"/pokemon-gifs/67.gif": {
		"type": "image/gif",
		"etag": "\"d7a6-mhUbLcBNVUjksFy+49bT0vsdgdk\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 55206,
		"path": "../public/pokemon-gifs/67.gif"
	},
	"/pokemon-gifs/68.gif": {
		"type": "image/gif",
		"etag": "\"12992-j63SqNnV9zBNVtr2gRiCWmztE84\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 76178,
		"path": "../public/pokemon-gifs/68.gif"
	},
	"/pokemon-gifs/7.gif": {
		"type": "image/gif",
		"etag": "\"4c09-iy5iF+SEURXXjMb0qn9fI3l4S5w\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 19465,
		"path": "../public/pokemon-gifs/7.gif"
	},
	"/pokemon-gifs/69.gif": {
		"type": "image/gif",
		"etag": "\"7246-Qq18lxW/aF9vnUA24o5BqEhrDBQ\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 29254,
		"path": "../public/pokemon-gifs/69.gif"
	},
	"/pokemon-gifs/70.gif": {
		"type": "image/gif",
		"etag": "\"91d6-cq1ud4PlTnDU0lTKdSxYNvpK0cg\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 37334,
		"path": "../public/pokemon-gifs/70.gif"
	},
	"/pokemon-gifs/71.gif": {
		"type": "image/gif",
		"etag": "\"deb5-DuGv+SyD982GxvzOHDQhMPx21Eg\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 57013,
		"path": "../public/pokemon-gifs/71.gif"
	},
	"/pokemon-gifs/72.gif": {
		"type": "image/gif",
		"etag": "\"8fe6-/X70SMGcWt9be6Ees/P2SFyBuxU\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 36838,
		"path": "../public/pokemon-gifs/72.gif"
	},
	"/pokemon-gifs/73.gif": {
		"type": "image/gif",
		"etag": "\"159b9-fyfcMvh4KuyYdd2haxogzkKqh6A\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 88505,
		"path": "../public/pokemon-gifs/73.gif"
	},
	"/pokemon-gifs/74.gif": {
		"type": "image/gif",
		"etag": "\"80df-v1TiiZajkA480+rEtezm9WgGT/U\"",
		"mtime": "2026-09-05T11:32:52.714Z",
		"size": 32991,
		"path": "../public/pokemon-gifs/74.gif"
	},
	"/pokemon-gifs/75.gif": {
		"type": "image/gif",
		"etag": "\"13bd5-EGtwrsFStR0hW7gRmXxHm/5qim8\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 80853,
		"path": "../public/pokemon-gifs/75.gif"
	},
	"/pokemon-gifs/76.gif": {
		"type": "image/gif",
		"etag": "\"194b2-SBiNtNrF4MTu5w5sI07ZwD//N3g\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 103602,
		"path": "../public/pokemon-gifs/76.gif"
	},
	"/pokemon-gifs/77.gif": {
		"type": "image/gif",
		"etag": "\"13a3b-PRf9DuFZ38IQBOg23MhP17A6eFw\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 80443,
		"path": "../public/pokemon-gifs/77.gif"
	},
	"/pokemon-gifs/78.gif": {
		"type": "image/gif",
		"etag": "\"1adf1-vf3N+N5ByjNTX/Kr8fxU1Afl7BE\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 110065,
		"path": "../public/pokemon-gifs/78.gif"
	},
	"/pokemon-gifs/79.gif": {
		"type": "image/gif",
		"etag": "\"925b-xpAktiMAmtFnHIxfItGP3lUErgQ\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 37467,
		"path": "../public/pokemon-gifs/79.gif"
	},
	"/pokemon-gifs/8.gif": {
		"type": "image/gif",
		"etag": "\"83f3-x7+zkdy2jGS97Fa0tyaXlpdGFeA\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 33779,
		"path": "../public/pokemon-gifs/8.gif"
	},
	"/pokemon-gifs/81.gif": {
		"type": "image/gif",
		"etag": "\"3b3d-cbtS04J0tr9ylc2sHM5h4t+TmPM\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 15165,
		"path": "../public/pokemon-gifs/81.gif"
	},
	"/pokemon-gifs/80.gif": {
		"type": "image/gif",
		"etag": "\"14fdb-YpNd9DZHOM3H+ouzBVrYYww1BCk\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 85979,
		"path": "../public/pokemon-gifs/80.gif"
	},
	"/pokemon-gifs/82.gif": {
		"type": "image/gif",
		"etag": "\"13a70-fLUnPQoPvXSYVjAMrmIrppaLhEE\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 80496,
		"path": "../public/pokemon-gifs/82.gif"
	},
	"/pokemon-gifs/84.gif": {
		"type": "image/gif",
		"etag": "\"80e1-p0e61A+jmcp7lRBTYbnnzCJ4NUg\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 32993,
		"path": "../public/pokemon-gifs/84.gif"
	},
	"/pokemon-gifs/83.gif": {
		"type": "image/gif",
		"etag": "\"65a0-fk/wNHRwgHB5qr0r5t6FTIXi1EE\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 26016,
		"path": "../public/pokemon-gifs/83.gif"
	},
	"/pokemon-gifs/86.gif": {
		"type": "image/gif",
		"etag": "\"8b6a-1erdKWCjpQk61Q73YMNfNZi4VNI\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 35690,
		"path": "../public/pokemon-gifs/86.gif"
	},
	"/pokemon-gifs/85.gif": {
		"type": "image/gif",
		"etag": "\"12e61-l29r4qt1giVhK0aFCdtgks6P71o\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 77409,
		"path": "../public/pokemon-gifs/85.gif"
	},
	"/pokemon-gifs/87.gif": {
		"type": "image/gif",
		"etag": "\"e267-h+V6SCTQ1aAXz0uJdmszr2ah/ow\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 57959,
		"path": "../public/pokemon-gifs/87.gif"
	},
	"/pokemon-gifs/88.gif": {
		"type": "image/gif",
		"etag": "\"128bd-bPJ/KcZT/Ay6LJZgODW3BX3IGFo\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 75965,
		"path": "../public/pokemon-gifs/88.gif"
	},
	"/pokemon-gifs/89.gif": {
		"type": "image/gif",
		"etag": "\"238c8-Sy1K33keg9R4j0QEX5+5auR3XPE\"",
		"mtime": "2026-09-05T11:32:52.715Z",
		"size": 145608,
		"path": "../public/pokemon-gifs/89.gif"
	},
	"/pokemon-gifs/90.gif": {
		"type": "image/gif",
		"etag": "\"d0aa-cQtESTNHXLWORDgAMvRr7QfyZrw\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 53418,
		"path": "../public/pokemon-gifs/90.gif"
	},
	"/pokemon-gifs/9.gif": {
		"type": "image/gif",
		"etag": "\"22baf-yuL5LLXs/QjrDmpaQrXGs3e+sjA\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 142255,
		"path": "../public/pokemon-gifs/9.gif"
	},
	"/pokemon-gifs/91.gif": {
		"type": "image/gif",
		"etag": "\"16000-stM8wnOA2lC9z98+kfnEj3I7nYQ\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 90112,
		"path": "../public/pokemon-gifs/91.gif"
	},
	"/pokemon-gifs/92.gif": {
		"type": "image/gif",
		"etag": "\"b430-oa59/s7bVvDkrFhmOdP3HnCEsn4\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 46128,
		"path": "../public/pokemon-gifs/92.gif"
	},
	"/pokemon-gifs/93.gif": {
		"type": "image/gif",
		"etag": "\"f215-Yhu1EauPWh9X4ZGveYcv49CbRsE\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 61973,
		"path": "../public/pokemon-gifs/93.gif"
	},
	"/pokemon-gifs/94.gif": {
		"type": "image/gif",
		"etag": "\"d0b2-LSPKDulnSIvM86SesTB7feh+D6Q\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 53426,
		"path": "../public/pokemon-gifs/94.gif"
	},
	"/pokemon-gifs/96.gif": {
		"type": "image/gif",
		"etag": "\"e209-22aJ8/+/oYuXu2StKbc1dIq1ddg\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 57865,
		"path": "../public/pokemon-gifs/96.gif"
	},
	"/pokemon-gifs/95.gif": {
		"type": "image/gif",
		"etag": "\"19abf-nqqnWy1ZWjRtMIl4Sen1AOLxxu0\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 105151,
		"path": "../public/pokemon-gifs/95.gif"
	},
	"/pokemon-gifs/97.gif": {
		"type": "image/gif",
		"etag": "\"d6a9-+LzI3dZ3fWXYRIgchjeTO4x4JRg\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 54953,
		"path": "../public/pokemon-gifs/97.gif"
	},
	"/pokemon-gifs/98.gif": {
		"type": "image/gif",
		"etag": "\"77d4-YgNBzd58pxBVrKMBIIUvc+hn0/o\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 30676,
		"path": "../public/pokemon-gifs/98.gif"
	},
	"/pokemon-gifs/99.gif": {
		"type": "image/gif",
		"etag": "\"11d04-adDzJ7BlY9WVJN71PKbqZbwk9rk\"",
		"mtime": "2026-09-05T11:32:52.716Z",
		"size": 72964,
		"path": "../public/pokemon-gifs/99.gif"
	},
	"/assets/battle/gym-championship-stadium.png": {
		"type": "image/png",
		"etag": "\"253d97-DW3g2b9RzKA+OoCl7ml+504buUc\"",
		"mtime": "2026-09-05T11:32:52.694Z",
		"size": 2440599,
		"path": "../public/assets/battle/gym-championship-stadium.png"
	}
};
//#endregion
//#region #nitro/virtual/public-assets-node
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.2.2_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/runtime/internal/static.mjs
var METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br",
	zstd: ".zst"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_ZthqrN = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_ZthqrN
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(static_default)].filter(Boolean);
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.2.2_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.2.2_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.2.2_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/runtime/internal/error/hooks.mjs
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
//#endregion
//#region #nitro/virtual/tracing
var tracingSrvxPlugins = [];
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_jiti@2.7.0_vite@8.2.2_@types+node@22.20.1_jiti@2.7.0_/node_modules/nitro/dist/presets/node/runtime/node-server.mjs
var _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
var port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
var host = process.env.NITRO_HOST || process.env.HOST;
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var nitroApp = useNitroApp();
serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : void 0,
	fetch: nitroApp.fetch,
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();
var node_server_default = {};
//#endregion
export { node_server_default as default };
