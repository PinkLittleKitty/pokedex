const fs = require('fs');
const fetch = require('node-fetch');

const genRanges = {
    1: { start: 1, end: 151 },
    2: { start: 152, end: 251 },
    3: { start: 252, end: 386 },
    4: { start: 387, end: 493 },
    5: { start: 494, end: 649 },
    6: { start: 650, end: 721 },
    7: { start: 722, end: 809 },
    8: { start: 810, end: 905 },
    9: { start: 906, end: 1010 }
};

async function fetchPokemonByGen(gen) {
    console.log(`Fetching Generation ${gen}...`);
    const { start, end } = genRanges[gen];
    
    const promises = [];
    for (let i = start; i <= end; i++) {
        promises.push(
            fetch(`https://pokeapi.co/api/v2/pokemon/${i}`)
                .then(response => response.json())
        );
    }
    
    const pokemonData = await Promise.all(promises);
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
    }
    
    // Write the data to a JavaScript file instead of JSON
    fs.writeFileSync(
        `./data/gen${gen}.js`, 
        `const gen${gen}Data = ${JSON.stringify(pokemonData)};`
    );
    
    console.log(`Generation ${gen} data saved to data/gen${gen}.js`);
}

async function fetchAllGenerations() {
    for (let gen = 1; gen <= 9; gen++) {
        await fetchPokemonByGen(gen);
    }
    console.log('All generations fetched and saved!');
}

fetchAllGenerations().catch(error => console.error('Error:', error));