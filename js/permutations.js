// permutations of `arr` taken `r` at a time, in the same order Python's itertools.permutations
// would produce for a list of unique elements (lexicographic by input position)
function permutations(arr, r) {
  const results = [];
  const used = new Array(arr.length).fill(false);

  function extend(current) {
    if (current.length === r) {
      results.push(current.map(i => arr[i]));
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      extend([...current, i]);
      used[i] = false;
    }
  }

  extend([]);
  return results;
}
