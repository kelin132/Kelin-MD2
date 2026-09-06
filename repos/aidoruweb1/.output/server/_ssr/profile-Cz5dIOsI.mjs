import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { m as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as rankFromLevel, i as formatCompactCoins, l as trainerLevelProgress, r as formatCoins } from "./game-qTZOZDmK.mjs";
import { M as Landmark, O as Link2, P as ImageUp, X as Coins, g as Save, o as Unlink, rt as Backpack, s as Trophy, t as X, tt as Camera, u as Sparkles } from "../_libs/lucide-react.mjs";
import { $ as useSession, B as saveProfile, K as startDiscordAccountLink, P as removeDiscordAccountLink, Q as useServerFn, S as finishDiscordCallback, b as fetchShopItems, et as useSessionWriter, p as fetchDiscordLinkStatus } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { r as UserAvatar, t as AppShell } from "./AppShell-BjZxzV-O.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as motion } from "../_libs/motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-Cz5dIOsI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
async function compressGalleryImage(file, options) {
	if (!file.type.startsWith("image/")) throw new Error("Please choose an image from your gallery.");
	const source = await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(/* @__PURE__ */ new Error("The selected image could not be read."));
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.readAsDataURL(file);
	});
	const image = await new Promise((resolve, reject) => {
		const element = new Image();
		element.onerror = () => reject(/* @__PURE__ */ new Error("The selected image could not be decoded."));
		element.onload = () => resolve(element);
		element.src = source;
	});
	const scale = Math.min(1, options.maxWidth / image.naturalWidth, options.maxHeight / image.naturalHeight);
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
	canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Your browser could not prepare that image.");
	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	let result = canvas.toDataURL("image/jpeg", .78);
	if (result.length > 14e5) result = canvas.toDataURL("image/jpeg", .62);
	if (result.length > 15e5) throw new Error("That image is too large. Please choose a smaller gallery image.");
	return result;
}
function ProfilePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiscordCallback, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Profile",
		subtitle: "Your trainer identity and live Pokémon records only.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileBody, {})
	})] });
}
function DiscordCallback() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const writeSession = useSessionWriter();
	const finish = useServerFn(finishDiscordCallback);
	(0, import_react.useEffect)(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		const state = params.get("state");
		if (params.get("discord") !== "callback" || !code || !state) return;
		finish({ data: {
			code,
			state
		} }).then((result) => {
			window.history.replaceState({}, "", window.location.pathname);
			if (result.kind === "login") {
				writeSession(result.user);
				toast.success(`Welcome back, ${result.user.name}`);
				navigate({
					to: "/dashboard",
					replace: true
				});
				return;
			}
			queryClient.invalidateQueries({ queryKey: ["aidoru", "discord-link"] });
			toast.success("Discord account linked.");
		}).catch((error) => {
			window.history.replaceState({}, "", window.location.pathname);
			toast.error(error.message || "Discord sign-in failed.");
		});
	}, []);
	return null;
}
function ProfileBody() {
	const { data: user } = useSession();
	const writeSession = useSessionWriter();
	const save = useServerFn(saveProfile);
	const [background, setBackground] = (0, import_react.useState)(user?.profileBackground ?? "");
	const [avatarImage, setAvatarImage] = (0, import_react.useState)(user?.avatarUrl ?? "");
	const [avatarVideo, setAvatarVideo] = (0, import_react.useState)(user?.avatarVideoUrl ?? "");
	const [uploading, setUploading] = (0, import_react.useState)(null);
	const avatarInputRef = (0, import_react.useRef)(null);
	const backgroundInputRef = (0, import_react.useRef)(null);
	const videoInputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		setBackground(user.profileBackground ?? "");
		setAvatarImage(user.avatarUrl ?? "");
		setAvatarVideo(user.avatarVideoUrl ?? "");
	}, [
		user?.id,
		user?.profileBackground,
		user?.avatarUrl,
		user?.avatarVideoUrl
	]);
	const saveMutation = useMutation({
		mutationFn: () => save({ data: {
			name: user?.name ?? "Player",
			bio: user?.bio ?? "",
			title: user?.title ?? "Player",
			avatar: user?.avatar ?? "default",
			banner: user?.banner ?? "aurora",
			avatarImage: avatarImage.trim(),
			avatarVideo: avatarVideo.trim(),
			background: background.trim()
		} }),
		onSuccess: (next) => {
			writeSession(next);
			toast.success("Profile appearance synced successfully.");
		},
		onError: (error) => toast.error(error.message)
	});
	const handleImageChange = async (event, type) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		setUploading(type);
		try {
			const image = await compressGalleryImage(file, type === "avatar" ? {
				maxWidth: 900,
				maxHeight: 900
			} : {
				maxWidth: 1280,
				maxHeight: 900
			});
			if (type === "avatar") setAvatarImage(image);
			else setBackground(image);
			toast.success(`${type === "avatar" ? "Profile image" : "Profile background"} ready. Press Save changes to apply it.`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "That image could not be prepared.");
		} finally {
			setUploading(null);
		}
	};
	const handleVideoChange = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		if (file.size > 5e6) {
			toast.error("Video is too large (max 5MB).");
			return;
		}
		if (!file.type.startsWith("video/")) {
			toast.error("Please select a video file.");
			return;
		}
		setUploading("video");
		try {
			const reader = new FileReader();
			const videoData = await new Promise((resolve, reject) => {
				reader.onload = () => resolve(reader.result);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});
			setAvatarVideo(videoData);
			toast.success("Profile video ready. Press Save changes to apply it.");
		} catch (error) {
			toast.error("Could not read video file.");
		} finally {
			setUploading(null);
		}
	};
	const fetchItems = useServerFn(fetchShopItems);
	const itemsQuery = useQuery({
		queryKey: ["aidoru", "items"],
		queryFn: fetchItems,
		retry: false
	});
	const fetchDiscordStatus = useServerFn(fetchDiscordLinkStatus);
	const startDiscord = useServerFn(startDiscordAccountLink);
	const removeDiscord = useServerFn(removeDiscordAccountLink);
	const discordQuery = useQuery({
		queryKey: ["aidoru", "discord-link"],
		queryFn: fetchDiscordStatus,
		retry: false
	});
	const discordLinkMutation = useMutation({
		mutationFn: async () => {
			const { authorizationUrl } = await startDiscord({});
			window.location.assign(authorizationUrl);
		},
		onError: (error) => toast.error(error.message || "Could not start Discord linking.")
	});
	const discordUnlinkMutation = useMutation({
		mutationFn: () => removeDiscord({}),
		onSuccess: () => {
			discordQuery.refetch();
			toast.success("Discord account unlinked.");
		},
		onError: (error) => toast.error(error.message || "Could not unlink Discord.")
	});
	if (!user) return null;
	const progress = trainerLevelProgress(user.trainerLevel, user.trainerXp);
	const itemMap = new Map((itemsQuery.data ?? []).map((item) => [item.id, item]));
	const bag = user.trainerInventory.length > 0 ? user.trainerInventory : user.inventory;
	const totalBagItems = bag.reduce((sum, entry) => sum + entry.qty, 0);
	const profileStyle = { "--profile-background": background ? `url(${background})` : "none" };
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "profile-page space-y-6 pb-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "profile-card hof-panel",
				style: profileStyle,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "profile-card-cover",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "profile-card-cover-overlay" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => backgroundInputRef.current?.click(),
							disabled: Boolean(uploading) || saveMutation.isPending,
							className: "profile-cover-edit",
							"aria-label": "Edit profile background",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "profile-card-cover-mark",
							"aria-hidden": "true"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "profile-card-body",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "profile-identity-row",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "profile-avatar-wrap",
								children: [avatarVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
									src: avatarVideo,
									autoPlay: true,
									loop: true,
									muted: true,
									playsInline: true,
									className: "profile-avatar-image object-cover size-full rounded-full"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserAvatar, {
									name: user.name,
									src: avatarImage || user.avatarUrl,
									className: "profile-avatar",
									imageClassName: "profile-avatar-image"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => avatarInputRef.current?.click(),
									disabled: Boolean(uploading) || saveMutation.isPending,
									className: "profile-avatar-edit",
									"aria-label": "Edit profile image",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-4" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "profile-identity-copy min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "profile-eyebrow",
										children: "AIDORU TRAINER PROFILE"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "profile-name truncate",
											children: user.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "text-white/40 hover:text-white",
											onClick: () => toast.info("Name editing coming soon! Please use the bot for now."),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-3.5" })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "profile-bio",
											children: user.bio || "Your profile is synced from your live trainer data."
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "mt-1 text-white/40 hover:text-white",
											onClick: () => toast.info("Bio editing coming soon! Please use the bot for now."),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-3.5" })
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "profile-heart",
								"aria-hidden": "true",
								children: "♡"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "profile-chip-row",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "profile-chip profile-chip-primary",
								children: "WHATSAPP LINKED"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "profile-chip",
								children: user.title
							}),
							user.guildName && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "profile-chip",
								children: user.guildName
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hof-panel flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid size-11 shrink-0 place-items-center rounded-2xl border border-indigo-300/25 bg-indigo-400/10 text-indigo-200",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2, { className: "size-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hof-kicker",
							children: "Shared bot identity"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "hof-heading mt-1 text-2xl",
							children: "Discord account"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted-foreground",
							children: discordQuery.data?.linked ? `Connected as ${discordQuery.data.discordUsername ?? "Discord user"}. Discord commands reuse this WhatsApp trainer.` : "Connect Discord to reuse this WhatsApp trainer account in AKIRA-DISCORD."
						})
					] })]
				}), discordQuery.data?.linked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => discordUnlinkMutation.mutate(),
					disabled: discordUnlinkMutation.isPending,
					className: "hof-button-secondary inline-flex items-center gap-2 px-4 py-2 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Unlink, { className: "size-3.5" }), discordUnlinkMutation.isPending ? "Unlinking…" : "Unlink Discord"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => discordLinkMutation.mutate(),
					disabled: discordLinkMutation.isPending || discordQuery.isLoading,
					className: "hof-button inline-flex items-center gap-2 px-4 py-2 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2, { className: "size-3.5" }), discordLinkMutation.isPending ? "Opening Discord…" : "Link Discord"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "profile-editor hof-panel p-5 sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Personalize your trainer card"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-3xl",
								children: "Profile appearance"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 max-w-2xl text-sm text-muted-foreground",
								children: "Choose images from your gallery. Your avatar and cover are compressed locally before they are saved to your live profile."
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => saveMutation.mutate(),
							disabled: saveMutation.isPending || Boolean(uploading),
							className: "hof-button inline-flex items-center justify-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }),
								" ",
								saveMutation.isPending ? "Saving…" : "Save changes"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 grid gap-4 lg:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppearanceUploadCard, {
								title: "Profile image",
								description: "The circular image shown over your profile cover.",
								image: avatarImage,
								fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserAvatar, {
									name: user.name,
									src: user.avatarUrl,
									className: "size-20"
								}),
								onChoose: () => avatarInputRef.current?.click(),
								onRemove: () => setAvatarImage(""),
								busy: uploading === "avatar"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppearanceUploadCard, {
								title: "Profile video",
								description: "A short moving video (max 10s, 5MB) for your profile.",
								image: avatarVideo,
								isVideo: true,
								fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "profile-background-empty flex items-center justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-8 opacity-20" })
								}),
								onChoose: () => videoInputRef.current?.click(),
								onRemove: () => setAvatarVideo(""),
								busy: uploading === "video"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppearanceUploadCard, {
								title: "Profile background",
								description: "The cover artwork displayed behind your trainer identity.",
								image: background,
								fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "profile-background-empty",
									children: [
										"AIDORU",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"COVER"
									]
								}),
								onChoose: () => backgroundInputRef.current?.click(),
								onRemove: () => setBackground(""),
								busy: uploading === "background",
								wide: true
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: avatarInputRef,
						type: "file",
						accept: "image/*",
						onChange: (event) => handleImageChange(event, "avatar"),
						className: "hidden",
						disabled: Boolean(uploading) || saveMutation.isPending
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: videoInputRef,
						type: "file",
						accept: "video/*",
						onChange: handleVideoChange,
						className: "hidden",
						disabled: Boolean(uploading) || saveMutation.isPending
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: backgroundInputRef,
						type: "file",
						accept: "image/*",
						onChange: (event) => handleImageChange(event, "background"),
						className: "hidden",
						disabled: Boolean(uploading) || saveMutation.isPending
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "profile-metrics-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileMetric, {
						icon: Coins,
						label: "Wallet",
						value: formatCompactCoins(user.coins),
						detail: `${formatCoins(user.coins)} coins`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileMetric, {
						icon: Landmark,
						label: "Bank",
						value: formatCompactCoins(user.bank),
						detail: `${formatCoins(user.bank)} coins`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileMetric, {
						icon: Sparkles,
						label: `Level ${progress.level}`,
						value: `${progress.percent}%`,
						detail: `${formatCoins(progress.current)} / ${formatCoins(progress.needed)} XP`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileMetric, {
						icon: Trophy,
						label: "Rank",
						value: rankFromLevel(progress.level),
						detail: `${user.streak} day streak`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-6 xl:grid-cols-[1.1fr_0.9fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hof-panel p-5 sm:p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-end justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Live trainer inventory"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-3xl",
								children: "Your bag"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Backpack, { className: "size-6 text-cyan-300" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-xs text-muted-foreground",
							children: [
								totalBagItems,
								" item",
								totalBagItems === 1 ? "" : "s",
								" in the Pokémon trainer bag from WhatsApp."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 grid gap-3 sm:grid-cols-2",
							children: [bag.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground",
								children: "Your trainer bag is empty. Use the Pokémon Mart in WhatsApp or on AIDORU."
							}), bag.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InventoryCard, {
								entry,
								item: itemMap.get(entry.itemId)
							}, entry.itemId))]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hof-panel p-5 sm:p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hof-kicker",
							children: "Battle party"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "hof-heading mt-1 text-3xl",
							children: "Your Pokémon"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-6 text-cyan-300" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2",
						children: [(user.partyPokemon.length > 0 ? user.partyPokemon : user.pokemon.slice(0, 6)).map((pokemon) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
							whileHover: { y: -3 },
							className: "hof-image overflow-hidden rounded-2xl border border-white/10 p-2 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: pokemon.imageUrl,
									alt: pokemon.displayName,
									loading: "lazy",
									className: "mx-auto aspect-square w-full object-contain"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "truncate font-display text-base font-semibold",
									children: pokemon.nickname || pokemon.displayName
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "font-mono-ui text-[10px] text-cyan-200",
									children: [
										"LV ",
										pokemon.level,
										pokemon.shiny ? " · SHINY" : ""
									]
								})
							]
						}, pokemon.id)), user.partyPokemon.length === 0 && user.pokemon.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "col-span-full text-sm text-muted-foreground",
							children: "No Pokémon yet. Start your journey in WhatsApp."
						})]
					})]
				})]
			})
		]
	});
}
function AppearanceUploadCard({ title, description, image, fallback, onChoose, onRemove, busy, wide = false, isVideo = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `profile-upload-card ${wide ? "profile-upload-card-wide" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "profile-upload-preview",
			children: image ? isVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				src: image,
				autoPlay: true,
				loop: true,
				muted: true,
				playsInline: true,
				className: "size-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: image,
				alt: `${title} preview`
			}) : fallback
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-xl font-bold",
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs leading-5 text-muted-foreground",
					children: description
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: onChoose,
						disabled: busy,
						className: "hof-button inline-flex items-center gap-2 px-3 py-2 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageUp, { className: "size-3.5" }), busy ? "Preparing…" : "Choose from gallery"]
					}), image && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: onRemove,
						disabled: busy,
						className: "hof-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3" }), "Remove"]
					})]
				})
			]
		})]
	});
}
function ProfileMetric({ icon: Icon, label, value, detail }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "profile-metric rounded-xl border border-white/10 bg-black/15 px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-xs text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-3.5 text-cyan-300" }), label]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 truncate font-display text-2xl font-bold",
				children: value
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 truncate font-mono-ui text-[9px] text-muted-foreground",
				children: detail
			})
		]
	});
}
function InventoryCard({ entry, item }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "hof-image grid size-14 shrink-0 place-items-center rounded-xl p-2",
			children: item?.imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: item.imageUrl,
				alt: item.name,
				loading: "lazy",
				className: "size-10 object-contain"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono-ui text-xs text-cyan-200",
				children: "ITEM"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "truncate font-display text-lg font-semibold",
				children: item?.name ?? entry.itemId
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "hof-label",
				children: ["Quantity ", entry.qty]
			})]
		})]
	});
}
//#endregion
export { ProfilePage as component };
