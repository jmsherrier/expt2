// mulberry32: small, well-tested seeded pseudo-random generator, returns a function that yields
// floats in [0,1), same call signature as Math.random
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// fisher-yates shuffle using a seeded rng function (rng() must return a float in [0,1))
function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// indices that would sort arr ascending, ties broken by original index -- mirrors the greedy
// "give the extra trial to whichever session currently holds the fewest" balancing idiom
function argsortAscending(arr) {
  return arr.map((_, i) => i).sort((a, b) => arr[a] - arr[b]);
}
