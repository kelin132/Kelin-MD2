import test from "node:test";
import assert from "node:assert/strict";
import { fetchByName, fetchRandom, getImageMessage, normalizePokemon } from "../lib/pokemon/api.mjs";

test("normalizes the provider's stats and resolves its relative image URL", () => {
  const pokemon = normalizePokemon({
    id: 821,
    name: "rookidee",
    types: ["flying"],
    imageUrl: "/api/pokemon/821/image",
    stats: {
      hp: 38,
      attack: 47,
      defense: 35,
      "special-attack": 33,
      "special-defense": 35,
      speed: 57,
    },
  });

  assert.equal(pokemon.pokedexId, 821);
  assert.deepEqual(pokemon.types, ["flying"]);
  assert.equal(pokemon.baseHp, 38);
  assert.equal(pokemon.baseAttack, 47);
  assert.equal(pokemon.baseSpAtk, 33);
  assert.equal(pokemon.imageUrl, "https://pokeapi.eclipse.name.ng/api/pokemon/821/image");
});

test("fetches random Pokémon through the supplied provider endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  globalThis.fetch = async (url) => {
    requestUrl = String(url);
    return new Response(JSON.stringify({
      id: 821,
      name: "rookidee",
      types: ["flying"],
      imageUrl: "/api/pokemon/821/image",
      stats: { hp: 38, attack: 47, defense: 35, speed: 57 },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const pokemon = await fetchRandom();
    assert.equal(requestUrl, "https://pokeapi.eclipse.name.ng/api/pokemon/random");
    assert.equal(pokemon.name, "rookidee");
    assert.equal(pokemon.imageUrl, "https://pokeapi.eclipse.name.ng/api/pokemon/821/image");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("downloads a Pokémon image using the provider's resolved absolute URL", async () => {
  const originalFetch = globalThis.fetch;
  const expectedImage = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]);
  let requestUrl;
  globalThis.fetch = async (url) => {
    requestUrl = String(url);
    return new Response(expectedImage, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  };

  try {
    const image = await getImageMessage({
      pokedexId: 821,
      imageUrl: "https://pokeapi.eclipse.name.ng/api/pokemon/821/image",
      frontSpriteUrl: null,
    });
    assert.equal(requestUrl, "https://pokeapi.eclipse.name.ng/api/pokemon/821/image");
    assert.deepEqual(image.image, expectedImage);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("searches by name first and fetches detailed stats by the returned ID", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    requests.push(requestUrl);
    const payload = requestUrl.endsWith("?search=pikachu")
      ? {
          items: [
            { id: 25, name: "pikachu", types: ["electric"] },
            { id: 10080, name: "pikachu-rock-star", types: ["electric"] },
          ],
        }
      : {
          id: 25,
          name: "pikachu",
          types: ["electric"],
          imageUrl: "/api/pokemon/25/image",
          stats: { hp: 35, attack: 55, defense: 40, speed: 90 },
        };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const pokemon = await fetchByName("pikachu");
    assert.deepEqual(requests, [
      "https://pokeapi.eclipse.name.ng/api/pokemon?search=pikachu",
      "https://pokeapi.eclipse.name.ng/api/pokemon/25",
    ]);
    assert.equal(pokemon.pokedexId, 25);
    assert.equal(pokemon.baseAttack, 55);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
