import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { g as isRedirect, h as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as TSS_SERVER_FUNCTION, i as createServerFn, o as getServerFnById } from "./server-B39CcLPg.mjs";
import { a as objectType, i as numberType, n as enumType, o as stringType, r as literalType, t as discriminatedUnionType } from "../_libs/zod.mjs";
import { q as Database, v as RefreshCw } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ConnectionNotice-PK1BS1rQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getSession = createServerFn({ method: "GET" }).handler(createSsrRpc("6836eef4d148aaac1a55f89e238e45dc97e54cc8193ef7e202509924decb4a16"));
var phoneLogin = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	countryCode: stringType().min(1).max(4),
	phoneNumber: stringType().min(5).max(18),
	password: stringType().min(8).max(128)
}).parse(data)).handler(createSsrRpc("f62609a11f40c9befeba022aa935f8dd53446030a89c8ae2d456f9d269233be7"));
var verifyPhone = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	countryCode: stringType().min(1).max(4),
	phoneNumber: stringType().min(5).max(18),
	code: stringType().regex(/^\d{6}$/)
}).parse(data)).handler(createSsrRpc("622ca3899aa8d5f41c5224b3985b390553dc6b5434214e00f162b62a846b70e7"));
var requestPasswordReset = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	countryCode: stringType().min(1).max(4),
	phoneNumber: stringType().min(5).max(18),
	password: stringType().min(8).max(128)
}).parse(data)).handler(createSsrRpc("4f3472ab04048cd878f638ac96aa26d7461c0e6a1008d6b44f1587db0e5f25e6"));
var resetPassword = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	countryCode: stringType().min(1).max(4),
	phoneNumber: stringType().min(5).max(18),
	code: stringType().regex(/^\d{6}$/)
}).parse(data)).handler(createSsrRpc("d5e1a27384f5d6f874f9298d9a372aabeffb72dd91e94120db9a00668126295e"));
var startDiscordAccountLink = createServerFn({ method: "POST" }).handler(createSsrRpc("1073ae4766354363c81c7a4ae398ef882004578aae3052c0fcfa265adce5cc2f"));
createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	code: stringType().min(1).max(2048),
	state: stringType().min(1).max(256)
}).parse(data)).handler(createSsrRpc("0bb31ab9933d9b669f9c7485ea7b0ea8948fee25ed54f4c66edcf66ee8546fe6"));
var finishDiscordCallback = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	code: stringType().min(1).max(2048),
	state: stringType().min(1).max(256)
}).parse(data)).handler(createSsrRpc("25aca3dff326305115b01c2bb1f19fb276ab668574cfee6787a863af25ebcbce"));
var startDiscordWebsiteLogin = createServerFn({ method: "POST" }).handler(createSsrRpc("39bc358a06b7e402791c700c7a3369343c92ca1b6d0f35f8b8b7bd087a4e09b3"));
var finishDiscordWebsiteLogin = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	code: stringType().min(1).max(2048),
	state: stringType().min(1).max(256)
}).parse(data)).handler(createSsrRpc("d97fcdf7fbc26bf649e6d0991c60217dfa2d9f37fc5789cea08713f63ddd8494"));
var fetchDiscordLinkStatus = createServerFn({ method: "GET" }).handler(createSsrRpc("5854fedddf7991a554652f744d803b14fa8d6a725f2052f10dafc29c9b3daf78"));
var removeDiscordAccountLink = createServerFn({ method: "POST" }).handler(createSsrRpc("e392a307e86ab97aa2c77da4a4cd3619c568ce2c5190b3312d1cd4da234ad621"));
var logout = createServerFn({ method: "POST" }).handler(createSsrRpc("f713a3a2cd6883bcbd2fd1593e04505a23b34ee631bfae8c4e5ef8c00cf13e73"));
var fetchShopItems = createServerFn({ method: "GET" }).handler(createSsrRpc("1aec6568e42c8d81d85d157573d3da10702f7ba068e1d997138a818bf3e11e4c"));
createServerFn({ method: "GET" }).handler(createSsrRpc("5d5d361e3d9a4391944cd0c9b56f76b763e068b2e398bc6781c0684d553d9409"));
var fetchXpLeaderboard = createServerFn({ method: "GET" }).handler(createSsrRpc("1993df90e8d4a607cd751108d9363c982b3d4ce6022c12bc195f7a44fb2ff244"));
var fetchCoinsLeaderboard = createServerFn({ method: "GET" }).handler(createSsrRpc("f93261eba76e3294c5a5cfcae0b90be467960f8ec0240435ac4e5631252f6cab"));
var fetchCardsLeaderboard = createServerFn({ method: "GET" }).handler(createSsrRpc("4cd72bcb0978d20781688246bd247e5aa67a9817cb91b5074b136abd3b49deff"));
var fetchPokemonLeaderboard = createServerFn({ method: "GET" }).handler(createSsrRpc("db64a5fd4d5353bde81525314d101d15af3841b68e6224ba57a22e6f57f16804"));
var fetchGymsLeaderboard = createServerFn({ method: "GET" }).handler(createSsrRpc("28c1c7c18c27712b2dd461a6875bc1fb52099d837ba43091f0529d3096045d2d"));
var fetchMyCards = createServerFn({ method: "GET" }).inputValidator((data) => objectType({ scope: enumType(["mine", "global"]).default("mine") }).parse(data ?? {})).handler(createSsrRpc("9787a93b03832dea7441331c48c3cef92dd05e6c3f9b3371af2cd13acbea1ce1"));
var fetchCardMarket = createServerFn({ method: "GET" }).handler(createSsrRpc("4d30d905ee0efe96081f2cd930a1db00fd644ec7d554fc536fedf72abe605882"));
var buyCardListing = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ listingId: stringType().min(1).max(128) }).parse(data)).handler(createSsrRpc("ef7b43844a040dee2b16d9b72bd6a5da48d39a7a34a554a4ddaf485e886a1d62"));
var fetchMyPets = createServerFn({ method: "GET" }).handler(createSsrRpc("b65a90caceb7b2464f8d2f14ba05431c3e12d371c3941ac88306d2501476129c"));
var feedMyPet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ petId: stringType().min(1).max(16) }).parse(data)).handler(createSsrRpc("610bd6d4e9d941f3c949470342d6d72127647782fd2684647a69d16649e122fb"));
var playWithPet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ petId: stringType().min(1).max(16) }).parse(data)).handler(createSsrRpc("f8ac1b72407a64567274bd1095780486b6570860f6afecde8f21e28d8a493911"));
var hatchMyPet = createServerFn({ method: "POST" }).handler(createSsrRpc("3333ca49f7cb1ebeca41a691cc07cd50e0e516b4c814acf81013d776612dfba5"));
var selectMyPet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ petId: stringType().min(1).max(16) }).parse(data)).handler(createSsrRpc("5b8d4d8f1a17b390b6b104279567809d8192e471d8186eb3e2f3677f367082b2"));
var releaseMyPet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ petId: stringType().min(1).max(16) }).parse(data)).handler(createSsrRpc("0f55ff827cdd6c5ff47b25f0b6532928164a40c6a9afb7feef82295e3e8f9133"));
var buyPetCareItem = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	itemKey: enumType([
		"kibble",
		"meal",
		"toy",
		"exppotion",
		"revival",
		"berry",
		"energy",
		"deluxemeal",
		"grooming",
		"friendship",
		"superxp",
		"goldenmeal"
	]),
	petId: stringType().min(1).max(16)
}).parse(data)).handler(createSsrRpc("4ebc10a1dc1b7018fb7b141b1749a49ded7250c6ea9e9fb4865bf3bf090a819a"));
var saveProfile = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	name: stringType().min(2).max(32),
	bio: stringType().max(240),
	title: stringType().max(40),
	avatar: stringType().max(24),
	banner: stringType().max(24),
	avatarImage: stringType().max(15e5).optional(),
	avatarVideo: stringType().max(5e6).optional(),
	background: stringType().max(15e5).optional()
}).parse(data)).handler(createSsrRpc("b5f85ed8a6bf55b24cb2884887d93bfa0a35b639491af1f5c3effa34702c7c1e"));
createServerFn({ method: "POST" }).inputValidator((data) => objectType({ starterId: stringType().max(40) }).parse(data)).handler(createSsrRpc("5aac3408ca04e549f687a95d0e1d3810bf41c97b8c05f1ca45323f5385f1de97"));
var claimDailyReward = createServerFn({ method: "POST" }).handler(createSsrRpc("a66209e368ce7395b19bf65b257160b634c2414f563f3715ec20e367c78f3280"));
var purchaseItem = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	itemId: stringType().max(40),
	qty: numberType().int().min(1).max(99)
}).parse(data)).handler(createSsrRpc("daef23f9b57c40f8641d1293c1bdc32dcf6a0ed2d57e9f21003b6d82409b9b04"));
var fetchGuilds = createServerFn({ method: "GET" }).handler(createSsrRpc("51ed73c754504060570b808d30c7130772cc8d025e254bf2cc40b13cdc2af559"));
var requestJoinGuild = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ guildId: stringType().max(40) }).parse(data)).handler(createSsrRpc("74ead4daf4efecca72c1376fdedeb56f201bf49202cdd317f3e1a441d8553e65"));
var requestLeaveGuild = createServerFn({ method: "POST" }).handler(createSsrRpc("96b0853847d8af81d03eaa3883275c1922a70d4412285b60aafb71a4d542c8c5"));
var charterGuild = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	name: stringType().min(3).max(32),
	tag: stringType().min(2).max(5),
	description: stringType().max(200)
}).parse(data)).handler(createSsrRpc("65ff2667aa530c1d545c6897ac7316654b8b6d313f020e5e86822311a94b8d8b"));
var upgradeMyGuild = createServerFn({ method: "POST" }).handler(createSsrRpc("5e7a87b75cd54c986bb9b8e97c5a3a58a8b60bba09627292be922b5b5eb050d0"));
var updateGuildSettings = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	description: stringType().max(200).optional(),
	iconUrl: stringType().url().optional(),
	bannerUrl: stringType().url().optional()
}).parse(data)).handler(createSsrRpc("0a520bd6a3049f8faf5faeeb07df79bb9c97fa39dd8c9a63e50496ea94ec51c5"));
var flipCoin = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	wager: numberType().int().min(50).max(1e9),
	pick: enumType(["heads", "tails"])
}).parse(data)).handler(createSsrRpc("0daaf786d75c79d19077d87a46a45f376ce7877212ab04be2c3f6956afe1b271"));
var spinSlots = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ wager: numberType().int().min(50).max(1e9) }).parse(data)).handler(createSsrRpc("566baf114ba4bab1140ee56b0d2b9d86aa0cd8670884cce7e7f4d258707a3107"));
var placeBet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ wager: numberType().int().min(10).max(1e9) }).parse(data)).handler(createSsrRpc("184e9333955d8e763429b4f5ea085d31be11f640ebe8c4dd8d33169e8747e6af"));
var throwDice = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	wager: numberType().int().min(50).max(5e8),
	guess: numberType().int().min(1).max(6)
}).parse(data)).handler(createSsrRpc("86fcf5aaafe62c70b6400b56ade956dc5f85aa6040b9ada599b7e1d01c051476"));
var spinRoulette = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	wager: numberType().int().min(100).max(1e9),
	color: enumType([
		"red",
		"black",
		"green"
	])
}).parse(data)).handler(createSsrRpc("2784a1094b5031f4d24dac6d3d1cdc0c403abbad3106f66bd0a09a7a4b3527a5"));
var setLead = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ pokemonId: stringType().min(1).max(64) }).parse(data)).handler(createSsrRpc("9bd63b34e7e6939929e7e763603ecd67f79841aa69ca3fe08ac96c3aa4561b23"));
var reorderParty = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	first: numberType().int().min(1).max(6),
	second: numberType().int().min(1).max(6)
}).parse(data)).handler(createSsrRpc("be33a69bf39bad39d77dafef25e4305248977d124299563ece0469590b3bd98d"));
var movePartyPokemon = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	pokemonId: stringType().min(1).max(64),
	destination: enumType(["party", "pc"])
}).parse(data)).handler(createSsrRpc("6f093b4b7084d226c16e8344e79d302e7d309934361f04de7409db4445d01a95"));
var fetchBattleRooms = createServerFn({ method: "GET" }).handler(createSsrRpc("f816020cf03ec6615216de357af7ddb383be5e7988aec288c3c4fbb5b55d2be5"));
var openBattleRoom = createServerFn({ method: "POST" }).handler(createSsrRpc("4332567f9d8e9e8d440d82c26d32a3e9a893e033db196ef120e0fad65f9ccaee"));
var fetchGyms = createServerFn({ method: "GET" }).handler(createSsrRpc("f9a19616b1a2f5f2c3e4895efa2284a3b2689ea414b2771bf0f9e76744e7d170"));
var openGymRoom = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ gymId: stringType().min(1).max(40) }).parse(data)).handler(createSsrRpc("6b2f3daee2225e48474eb179c10c8f0755ea6fbecdf625b7e352624c9ae012b8"));
var fetchBattleRoom = createServerFn({ method: "GET" }).inputValidator((data) => objectType({ roomId: stringType().min(1).max(64) }).parse(data)).handler(createSsrRpc("026830a16afdeec8ea8d9def3ebf4077bfcbb2669a6a83cda81cc7a181bf1b17"));
var applyBattleAction = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	roomId: stringType().min(1).max(64),
	action: discriminatedUnionType("type", [
		objectType({ type: literalType("ready") }),
		objectType({
			type: literalType("move"),
			moveIndex: numberType().int().min(0).max(10)
		}),
		objectType({
			type: literalType("switch"),
			pokemonIndex: numberType().int().min(0).max(5)
		}),
		objectType({
			type: literalType("item"),
			item: enumType([
				"potion",
				"superpotion",
				"hyperpotion",
				"revive",
				"fullrestore"
			])
		}),
		objectType({ type: literalType("forfeit") })
	])
}).parse(data)).handler(createSsrRpc("10af32fa82009baab8fd37231f2b8d7edbaaa02d7cb76b3277d6ac5a1ce600bf"));
var sessionKey = ["aidoru", "session"];
var SESSION_SNAPSHOT_KEY = "aidoru.session.snapshot";
function readSessionSnapshot() {
	if (typeof window === "undefined") return void 0;
	try {
		const raw = window.sessionStorage.getItem(SESSION_SNAPSHOT_KEY);
		return raw ? JSON.parse(raw) : void 0;
	} catch {
		return;
	}
}
function useSession() {
	const fetchSession = useServerFn(getSession);
	const query = useQuery({
		queryKey: sessionKey,
		queryFn: () => Promise.race([fetchSession(), new Promise((_, reject) => {
			window.setTimeout(() => reject(/* @__PURE__ */ new Error("Session request timed out. Please refresh and try again.")), 12e3);
		})]),
		initialData: readSessionSnapshot,
		initialDataUpdatedAt: 0,
		staleTime: 1e4,
		refetchOnWindowFocus: true,
		retryOnMount: true,
		retry: (failureCount, error) => {
			if ((error instanceof Error ? error.message : "").includes("not configured")) return false;
			return failureCount < 3;
		},
		retryDelay: (attempt) => Math.min(1e3 * 2 ** attempt, 5e3)
	});
	(0, import_react.useEffect)(() => {
		if (query.data === void 0 || typeof window === "undefined") return;
		try {
			if (query.data) window.sessionStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(query.data));
			else window.sessionStorage.removeItem(SESSION_SNAPSHOT_KEY);
		} catch {}
	}, [query.data]);
	return query;
}
/** Writes a fresh user object returned by a mutation into the session cache. */
function useSessionWriter() {
	const queryClient = useQueryClient();
	return (user) => queryClient.setQueryData(sessionKey, user);
}
function useLogout() {
	const queryClient = useQueryClient();
	const signOut = useServerFn(logout);
	return useMutation({
		mutationFn: () => signOut(),
		onSuccess: async () => {
			await queryClient.cancelQueries();
			queryClient.setQueryData(sessionKey, null);
			queryClient.clear();
		}
	});
}
/**
* Soft, multi-layered pastel gradient blur field used behind every screen.
* Purely decorative; all values come from design tokens.
*/
var ART = [
	{
		src: {
			version: 1,
			asset_id: "cd4ca1ba-6bac-44e4-9ea7-ab2619d3ec14",
			project_id: "bc58e5dc-daef-4f0c-b949-09964e3606b5",
			url: "/__l5e/assets-v1/cd4ca1ba-6bac-44e4-9ea7-ab2619d3ec14/bg-1.jpg",
			r2_key: "a/v1/bc58e5dc-daef-4f0c-b949-09964e3606b5/cd4ca1ba-6bac-44e4-9ea7-ab2619d3ec14/bg-1.jpg",
			original_filename: "bg-1.jpg",
			size: 48722,
			content_type: "image/jpeg",
			created_at: "2026-08-09T02:21:33Z"
		}.url,
		className: "left-[-6%] top-[2%] w-[38vw] max-w-[320px] rotate-[-6deg]"
	},
	{
		src: {
			version: 1,
			asset_id: "fd67b8ba-25e1-43f3-b282-947c609e23c3",
			project_id: "bc58e5dc-daef-4f0c-b949-09964e3606b5",
			url: "/__l5e/assets-v1/fd67b8ba-25e1-43f3-b282-947c609e23c3/bg-2.jpg",
			r2_key: "a/v1/bc58e5dc-daef-4f0c-b949-09964e3606b5/fd67b8ba-25e1-43f3-b282-947c609e23c3/bg-2.jpg",
			original_filename: "bg-2.jpg",
			size: 72693,
			content_type: "image/jpeg",
			created_at: "2026-08-09T02:21:36Z"
		}.url,
		className: "right-[-4%] top-[6%] w-[34vw] max-w-[300px] rotate-[5deg]"
	},
	{
		src: {
			version: 1,
			asset_id: "e4ea0008-8eaf-49ba-a7d1-03a141bfb4fd",
			project_id: "bc58e5dc-daef-4f0c-b949-09964e3606b5",
			url: "/__l5e/assets-v1/e4ea0008-8eaf-49ba-a7d1-03a141bfb4fd/bg-8.jpg",
			r2_key: "a/v1/bc58e5dc-daef-4f0c-b949-09964e3606b5/e4ea0008-8eaf-49ba-a7d1-03a141bfb4fd/bg-8.jpg",
			original_filename: "bg-8.jpg",
			size: 34843,
			content_type: "image/jpeg",
			created_at: "2026-08-09T02:21:48Z"
		}.url,
		className: "left-[8%] top-[38%] w-[30vw] max-w-[260px] rotate-[3deg]"
	},
	{
		src: {
			version: 1,
			asset_id: "33104f36-3aa6-437f-b1c5-995d93886c31",
			project_id: "bc58e5dc-daef-4f0c-b949-09964e3606b5",
			url: "/__l5e/assets-v1/33104f36-3aa6-437f-b1c5-995d93886c31/bg-4.jpg",
			r2_key: "a/v1/bc58e5dc-daef-4f0c-b949-09964e3606b5/33104f36-3aa6-437f-b1c5-995d93886c31/bg-4.jpg",
			original_filename: "bg-4.jpg",
			size: 46655,
			content_type: "image/jpeg",
			created_at: "2026-08-09T02:21:58Z"
		}.url,
		className: "right-[6%] top-[40%] w-[28vw] max-w-[240px] rotate-[-4deg]"
	},
	{
		src: {
			version: 1,
			asset_id: "bca4d35c-9eed-455c-a66b-f2f68102efae",
			project_id: "bc58e5dc-daef-4f0c-b949-09964e3606b5",
			url: "/__l5e/assets-v1/bca4d35c-9eed-455c-a66b-f2f68102efae/bg-7.jpg",
			r2_key: "a/v1/bc58e5dc-daef-4f0c-b949-09964e3606b5/bca4d35c-9eed-455c-a66b-f2f68102efae/bg-7.jpg",
			original_filename: "bg-7.jpg",
			size: 42419,
			content_type: "image/jpeg",
			created_at: "2026-08-09T02:21:45Z"
		}.url,
		className: "left-[-4%] bottom-[2%] w-[32vw] max-w-[280px] rotate-[4deg]"
	},
	{
		src: {
			version: 1,
			asset_id: "54046226-095f-4dcb-a0d5-f4d344781efb",
			project_id: "bc58e5dc-daef-4f0c-b949-09964e3606b5",
			url: "/__l5e/assets-v1/54046226-095f-4dcb-a0d5-f4d344781efb/bg-6.jpg",
			r2_key: "a/v1/bc58e5dc-daef-4f0c-b949-09964e3606b5/54046226-095f-4dcb-a0d5-f4d344781efb/bg-6.jpg",
			original_filename: "bg-6.jpg",
			size: 56078,
			content_type: "image/jpeg",
			created_at: "2026-08-09T02:21:43Z"
		}.url,
		className: "right-[-6%] bottom-[0%] w-[36vw] max-w-[300px] rotate-[-5deg]"
	},
	{
		src: {
			version: 1,
			asset_id: "cd77f798-8631-486e-b6be-032dfc235e91",
			project_id: "bc58e5dc-daef-4f0c-b949-09964e3606b5",
			url: "/__l5e/assets-v1/cd77f798-8631-486e-b6be-032dfc235e91/bg-3.jpg",
			r2_key: "a/v1/bc58e5dc-daef-4f0c-b949-09964e3606b5/cd77f798-8631-486e-b6be-032dfc235e91/bg-3.jpg",
			original_filename: "bg-3.jpg",
			size: 80718,
			content_type: "image/jpeg",
			created_at: "2026-08-09T02:21:38Z"
		}.url,
		className: "left-[38%] top-[-8%] w-[26vw] max-w-[220px] rotate-[2deg]"
	},
	{
		src: {
			version: 1,
			asset_id: "f805862c-2213-407d-a0d5-ee0f198eda40",
			project_id: "bc58e5dc-daef-4f0c-b949-09964e3606b5",
			url: "/__l5e/assets-v1/f805862c-2213-407d-a0d5-ee0f198eda40/bg-5.jpg",
			r2_key: "a/v1/bc58e5dc-daef-4f0c-b949-09964e3606b5/f805862c-2213-407d-a0d5-ee0f198eda40/bg-5.jpg",
			original_filename: "bg-5.jpg",
			size: 87239,
			content_type: "image/jpeg",
			created_at: "2026-08-09T02:21:41Z"
		}.url,
		className: "left-[42%] bottom-[-6%] w-[26vw] max-w-[220px] rotate-[-3deg]"
	}
];
function AuroraField() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"aria-hidden": true,
		className: "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-background" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 opacity-70",
				style: { maskImage: "radial-gradient(ellipse at 50% 45%, transparent 18%, black 85%)" },
				children: ART.map((art) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: art.src,
					alt: "",
					loading: "lazy",
					className: `absolute rounded-[2rem] saturate-110 ${art.className}`
				}, art.src))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-background/35 absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "animate-aurora absolute -top-[22%] -left-[14%] h-[70vh] w-[70vh] rounded-full opacity-55 blur-[130px]",
				style: { background: "radial-gradient(circle, var(--pastel-lilac), transparent 68%)" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "animate-aurora absolute top-[8%] right-[-16%] h-[62vh] w-[62vh] rounded-full opacity-45 blur-[140px]",
				style: {
					background: "radial-gradient(circle, var(--neon-cyan), transparent 66%)",
					animationDelay: "-8s"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "animate-aurora absolute bottom-[-22%] left-[18%] h-[76vh] w-[76vh] rounded-full opacity-40 blur-[150px]",
				style: {
					background: "radial-gradient(circle, var(--neon-pink), transparent 64%)",
					animationDelay: "-15s"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "animate-aurora absolute bottom-[6%] right-[8%] h-[48vh] w-[48vh] rounded-full opacity-35 blur-[120px]",
				style: {
					background: "radial-gradient(circle, var(--pastel-mint), transparent 70%)",
					animationDelay: "-4s"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 opacity-[0.07]",
				style: {
					backgroundImage: "linear-gradient(var(--pastel-lilac) 1px, transparent 1px), linear-gradient(90deg, var(--pastel-lilac) 1px, transparent 1px)",
					backgroundSize: "68px 68px",
					maskImage: "radial-gradient(ellipse at 50% 20%, black, transparent 78%)"
				}
			}),
			[
				{
					left: "12%",
					top: "28%",
					size: 6,
					delay: "0s"
				},
				{
					left: "78%",
					top: "18%",
					size: 4,
					delay: "-2s"
				},
				{
					left: "62%",
					top: "62%",
					size: 7,
					delay: "-4s"
				},
				{
					left: "28%",
					top: "74%",
					size: 5,
					delay: "-6s"
				},
				{
					left: "88%",
					top: "48%",
					size: 4,
					delay: "-1s"
				},
				{
					left: "42%",
					top: "12%",
					size: 5,
					delay: "-5s"
				}
			].map((mote, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "animate-drift bg-pastel-mint absolute rounded-full blur-[1px]",
				style: {
					left: mote.left,
					top: mote.top,
					width: mote.size,
					height: mote.size,
					animationDelay: mote.delay
				}
			}, i))
		]
	});
}
function isConfigurationError(error) {
	const message = error instanceof Error ? error.message : String(error ?? "");
	return message.includes("Database connection is not configured") || /MONGO(?:DB)?_URI.*not configured/i.test(message);
}
function ConnectionNotice({ onRetry, error }) {
	const configurationMissing = isConfigurationError(error);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex min-h-screen items-center justify-center px-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuroraField, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass-strong relative max-w-lg rounded-3xl p-8 text-center md:p-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "bg-gradient-brand mx-auto grid size-12 place-items-center rounded-full",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { className: "size-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono-ui text-neon-cyan mt-5 text-[10px] tracking-[0.24em] uppercase",
					children: configurationMissing ? "Database configuration required" : "Database temporarily unavailable"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display mt-2 text-2xl font-bold",
					children: configurationMissing ? "AIDORU needs its data connection" : "AIDORU is reconnecting"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground mt-3 text-sm leading-relaxed",
					children: configurationMissing ? "The deployment is missing MONGO_URI. Add it to every running service instance, restart the deployment, and try again." : "MongoDB is configured, but this request could not reach it. The service will retry transient failures; try again in a moment if needed."
				}),
				onRetry && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: onRetry,
					className: "connection-retry-button bg-gradient-brand text-foreground mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "size-4" }), " Try again"]
				})
			]
		})]
	});
}
//#endregion
export { useSession as $, placeBet as A, saveProfile as B, finishDiscordWebsiteLogin as C, openBattleRoom as D, movePartyPokemon as E, reorderParty as F, spinSlots as G, sessionKey as H, requestJoinGuild as I, throwDice as J, startDiscordAccountLink as K, requestLeaveGuild as L, purchaseItem as M, releaseMyPet as N, openGymRoom as O, removeDiscordAccountLink as P, useServerFn as Q, requestPasswordReset as R, finishDiscordCallback as S, hatchMyPet as T, setLead as U, selectMyPet as V, spinRoulette as W, upgradeMyGuild as X, updateGuildSettings as Y, useLogout as Z, fetchMyCards as _, charterGuild as a, fetchShopItems as b, fetchBattleRoom as c, fetchCardsLeaderboard as d, useSessionWriter as et, fetchCoinsLeaderboard as f, fetchGymsLeaderboard as g, fetchGyms as h, buyPetCareItem as i, playWithPet as j, phoneLogin as k, fetchBattleRooms as l, fetchGuilds as m, applyBattleAction as n, claimDailyReward as o, fetchDiscordLinkStatus as p, startDiscordWebsiteLogin as q, buyCardListing as r, feedMyPet as s, ConnectionNotice as t, verifyPhone as tt, fetchCardMarket as u, fetchMyPets as v, flipCoin as w, fetchXpLeaderboard as x, fetchPokemonLeaderboard as y, resetPassword as z };
