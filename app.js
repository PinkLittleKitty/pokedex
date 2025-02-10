const pokemonGrid = document.querySelector('.pokemon-grid');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const modalContent = document.querySelector('.modal-content');
const closeBtn = document.querySelector('.close');
const POKEMON_COUNT = 151;
let isLoading = false;
let currentRequest = null;

const typeColors = {
    normal: '#A8A878',
    fire: '#F08030',
    water: '#6890F0',
    electric: '#F8D030',
    grass: '#78C850',
    ice: '#98D8D8',
    fighting: '#C03028',
    poison: '#A040A0',
    ground: '#E0C068',
    flying: '#A890F0',
    psychic: '#F85888',
    bug: '#A8B820',
    rock: '#B8A038',
    ghost: '#705898',
    dragon: '#7038F8',
    dark: '#705848',
    steel: '#B8B8D0',
    fairy: '#EE99AC'
};

async function fetchPokemonData() {
    for (let i = 1; i <= POKEMON_COUNT; i++) {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
        const data = await response.json();
        createPokemonCard(data);
    }
}

function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.classList.add('pokemon-card');
    
    // Primary sprite URL from pokesprite
    const primarySpriteUrl = `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokemon.name}.png`;
    
    // Fallback sprite URL from PokeAPI official artwork
    const fallbackSpriteUrl = pokemon.sprites.other['official-artwork'].front_default;
    
    card.innerHTML = `
        <img class="pokemon-sprite" src="${primarySpriteUrl}" alt="${pokemon.name}" 
             onerror="this.onerror=null; this.src='${fallbackSpriteUrl}'">
        <p class="pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</p>
        <h2 class="pokemon-name">${pokemon.name}</h2>
    `;
    
    card.addEventListener('click', () => showPokemonDetails(pokemon));
    pokemonGrid.appendChild(card);
}

function showPokemonDetails(pokemon) {
    const pokemonDetails = document.getElementById('pokemon-details');
    const types = pokemon.types.map(type => 
        `<span class="type-badge" style="background-color: ${typeColors[type.type.name]}">${type.type.name}</span>`
    ).join('');

    const stats = pokemon.stats.map(stat => {
        const statTranslations = {
            'hp': 'PS',
            'attack': 'Ataque',
            'defense': 'Defensa',
            'special-attack': 'Ataque Especial',
            'special-defense': 'Defensa Especial',
            'speed': 'Velocidad'
        };
        const statName = statTranslations[stat.stat.name] || stat.stat.name;
        return `<div class="stat-item">
            <strong>${statName}:</strong>
            <div class="stat-value">${stat.base_stat}</div>
        </div>`;
    }).join('');

    const primarySpriteUrl = `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokemon.name}.png`;
    const fallbackSpriteUrl = pokemon.sprites.other['official-artwork'].front_default;

    pokemonDetails.innerHTML = `
        <img class="pokemon-sprite" src="${primarySpriteUrl}" alt="${pokemon.name}"
            onerror="this.onerror=null; this.src='${fallbackSpriteUrl}'">
        <h2 class="pokemon-name">${pokemon.name}</h2>
        <p class="pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</p>
        <div class="pokemon-types">${types}</div>
        <div class="stats-container">${stats}</div>
        <div class="pokemon-info">
            <p><strong>Altura:</strong> ${pokemon.height/10}m</p>
            <p><strong>Peso:</strong> ${pokemon.weight/10}kg</p>
        </div>
    `;

    modal.style.display = 'block';
    modalContent.classList.add('show');
}

closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

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
let currentGen = 1;

async function fetchPokemonByGen(gen) {
    try {
        if (isLoading) return;
        isLoading = true;
        showLoading();
        
        pokemonGrid.innerHTML = '';
        const { start, end } = genRanges[gen];
        
        const promises = [];
        for (let i = start; i <= end; i++) {
            promises.push(
                fetch(`https://pokeapi.co/api/v2/pokemon/${i}`)
                    .then(response => response.json())
            );
        }
        
        const pokemonData = await Promise.all(promises);
        pokemonData.forEach(data => createPokemonCard(data));
        
    } catch (error) {
        console.error('Error fetching Pokemon:', error);
    } finally {
        hideLoading();
        isLoading = false;
    }
}

document.querySelectorAll('.gen-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const selectedGen = e.target.dataset.gen;
        document.querySelectorAll('.gen-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentGen = parseInt(selectedGen);
        fetchPokemonByGen(selectedGen);
    });
});

const loadingStyles = `
.loading-indicator {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}`;

const styleSheet = document.createElement('style');
styleSheet.textContent = loadingStyles;
document.head.appendChild(styleSheet);// Initialize with Gen 1
fetchPokemonByGen(1);

// Update search to work with current generation
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const pokemonCards = document.querySelectorAll('.pokemon-card');
    
    pokemonCards.forEach(card => {
        const name = card.querySelector('.pokemon-name').textContent.toLowerCase();
        const number = parseInt(card.querySelector('.pokemon-number').textContent.slice(1));
        const { start, end } = genRanges[currentGen];
        
        // Only show cards from current generation that match search
        const matchesSearch = name.includes(searchTerm);
        const inCurrentGen = number >= start && number <= end;
        card.style.display = matchesSearch && inCurrentGen ? 'block' : 'none';
    });
});

fetchPokemonData();

function showLoading() {
    const indicator = document.querySelector('.loading-indicator');
    indicator.style.display = 'block';
}

function hideLoading() {
    const indicator = document.querySelector('.loading-indicator');
    indicator.style.display = 'none';
    isLoading = false;
}
