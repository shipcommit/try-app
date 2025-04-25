function sumEvenNumbers(arr) {
  // 'sum' accumulates the numbers added to it
  // 'num' is the value of the number in the current index in the array
  return arr.reduce((sum, num) => {
    // '%' is a modulo operator, and returns the ramaining number after a division
    // If a number returns a number that exceeds that of dividing it by two,
    // then the number is not an even integer and will therefore be skippet.
    // Even numbers are added to the 'sum' because their division by 2
    // does not return any additional number
    return num % 2 === 0 ? sum + num : sum;

    // 0 is the initial value of 'sum'
  }, 0);
}

function anagrams(stringOne, stringTwo) {
  // Remove spaces and convert to lowercase
  const normalizedStringOne = stringOne.replace(/\s/g, '').toLowerCase();
  const normalizedtringTwo = stringTwo.replace(/\s/g, '').toLowerCase();

  // Check if lengths are different to return false immediately when there is an
  // obvious difference between the strings
  if (normalizedStringOne.length !== normalizedtringTwo.length) {
    return false;
  }

  // Sort characters and compare
  return (
    // Convert each string to an array of characters
    // Sort each array of characters
    // Concactinate each array to a string and compare them to see if they are identical or not
    normalizedStringOne.split('').sort().join('') ===
    normalizedtringTwo.split('').sort().join('')
  );
}

// Test functions
console.log('Even numbers, test 1:', sumEvenNumbers([1, 2, 3, 4]));
console.log('Even numbers, test 2:', sumEvenNumbers([2, 2, 4, 4]));

console.log('Anagram, test 1:', anagrams('cat', 'dog'));
console.log('Anagram, test 2:', anagrams('listen', 'silent'));
