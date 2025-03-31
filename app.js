const pokemonGrid = document.querySelector('.pokemon-grid');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const modalContent = document.querySelector('.modal-content');
const closeBtn = document.querySelector('.close');
const POKEMON_COUNT = 151;
let isLoading = false;
let currentRequest = null;
let activeTypeFilters = [];
let currentSortMethod = 'id';
let sortDirection = 'asc';

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
        <div class="pokemon-info-screen">
            <h2 class="pokemon-name">${pokemon.name}</h2>
            <p class="pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</p>
            <div class="pokemon-types">${types}</div>
            <div class="stats-container">${stats}</div>
            <div class="pokemon-info">
                <p><strong>Altura:</strong> ${pokemon.height/10}m</p>
                <p><strong>Peso:</strong> ${pokemon.weight/10}kg</p>
            </div>
        </div>
    `;

    // Update sprite after modal is displayed
    const spriteImg = document.querySelector('.pokedex-screen .pokemon-sprite');
    spriteImg.src = primarySpriteUrl;
    spriteImg.onerror = function() {
        this.onerror = null;
        this.src = fallbackSpriteUrl;
    };

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

const pokemonData = [];
  function setupFilterToggle() {
      const filterToggle = document.getElementById('filterToggle');
      const filterPanel = document.getElementById('filterPanel');
    
      filterToggle.addEventListener('click', () => {
          filterPanel.classList.toggle('active');
        
          // Add a cute animation when opening
          if (filterPanel.classList.contains('active')) {
              filterToggle.style.animation = 'wiggle 0.5s ease';
              setTimeout(() => {
                  filterToggle.style.animation = '';
              }, 500);
          }
      });
  }

  function setupTypeFilters() {
      const typeFiltersContainer = document.querySelector('.type-filters');
    
      // Clear existing filters
      typeFiltersContainer.innerHTML = '';
    
      // Create a button for each type
      Object.keys(typeColors).forEach(type => {
          const typeButton = document.createElement('button');
          typeButton.className = 'type-filter';
          typeButton.dataset.type = type;
          typeButton.textContent = type;
          typeButton.style.backgroundColor = typeColors[type];
        
          // Add click event
          typeButton.addEventListener('click', () => {
              typeButton.classList.toggle('active');
            
              // Update active filters
              if (typeButton.classList.contains('active')) {
                  if (!activeTypeFilters.includes(type)) {
                      activeTypeFilters.push(type);
                  }
              } else {
                  const index = activeTypeFilters.indexOf(type);
                  if (index !== -1) {
                      activeTypeFilters.splice(index, 1);
                  }
              }
            
              // Apply filters immediately
              applyFilters();
          });
        
          typeFiltersContainer.appendChild(typeButton);
      });
  }

  function setupSortButtons() {
      const sortButtons = document.querySelectorAll('.sort-btn');
    
      sortButtons.forEach(button => {
          button.addEventListener('click', () => {
              // Update active button
              sortButtons.forEach(btn => btn.classList.remove('active'));
              button.classList.add('active');
            
              // Update current sort method
              currentSortMethod = button.dataset.sort;
            
              // Apply filters immediately
              applyFilters();
          });
      });
    
      // If you have direction buttons
      const directionButtons = document.querySelectorAll('.direction-btn');
      if (directionButtons.length > 0) {
          directionButtons.forEach(button => {
              button.addEventListener('click', () => {
                  // Update active button
                  directionButtons.forEach(btn => btn.classList.remove('active'));
                  button.classList.add('active');
                
                  // Update sort direction
                  sortDirection = button.dataset.direction;
                
                  // Apply filters immediately
                  applyFilters();
              });
          });
      }
  }

  document.addEventListener('DOMContentLoaded', () => {
      fetchPokemonByGen("1"); // Start with Gen 1
    
      // Set up filter panel and controls
      setupFilterToggle();
      setupTypeFilters();
      setupSortButtons();
      setupSearchInput();
    
      document.getElementById('whosThatPokemon').addEventListener('click', startWhosThatPokemon);
  });
      resetButton.addEventListener('click', () => {
          // Reset all filters
          activeTypeFilters = [];
          document.querySelectorAll('.type-filter').forEach(btn => btn.classList.remove('active'));
        
          // Reset sort to default
          document.querySelectorAll('.sort-btn').forEach(btn => {
              btn.classList.remove('active');
              if (btn.dataset.sort === 'id') btn.classList.add('active');
          });
          currentSortMethod = 'id';
        
          // Reset direction to ascending
          document.querySelectorAll('.direction-btn').forEach(btn => {
              btn.classList.remove('active');
              if (btn.dataset.direction === 'asc') btn.classList.add('active');
          });
          sortDirection = 'asc';
        
          // Reset search input
          searchInput.value = '';
        
          // Apply filters (which will now show all Pokémon)
          applyFilters();
        
          // Close the panel
          filterPanel.classList.remove('active');
      });

  function applyFilters() {
      // Start with all Pokémon from the current generation
      let filteredPokemon = [...pokemonData];
    
      // Apply search filter
      const searchTerm = searchInput.value.toLowerCase();
      if (searchTerm) {
          filteredPokemon = filteredPokemon.filter(pokemon => 
              pokemon.name.toLowerCase().includes(searchTerm) || 
              pokemon.id.toString().includes(searchTerm)
          );
      }
    
      // Apply type filters
      if (activeTypeFilters.length > 0) {
          filteredPokemon = filteredPokemon.filter(pokemon => {
              const pokemonTypes = pokemon.types.map(type => type.type.name);
              return activeTypeFilters.some(type => pokemonTypes.includes(type));
          });
      }
    
      // Apply sorting
      filteredPokemon.sort((a, b) => {
          let valueA, valueB;
        
          switch (currentSortMethod) {
              case 'name':
                  valueA = a.name;
                  valueB = b.name;
                  break;
              case 'height':
                  valueA = a.height;
                  valueB = b.height;
                  break;
              case 'weight':
                  valueA = a.weight;
                  valueB = b.weight;
                  break;
              case 'id':
              default:
                  valueA = a.id;
                  valueB = b.id;
                  break;
          }
        
          if (sortDirection === 'asc') {
              return valueA > valueB ? 1 : -1;
          } else {
              return valueA < valueB ? 1 : -1;
          }
      });
    
      // Update the display
      displayFilteredPokemon(filteredPokemon);
  }

function displayFilteredPokemon(filteredPokemon) {
    // Clear the grid
    pokemonGrid.innerHTML = '';
    
    // Add filtered Pokémon to the grid
    filteredPokemon.forEach(pokemon => {
        createPokemonCard(pokemon);
    });
    
    // Show message if no results
    if (filteredPokemon.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No Pokémon found matching your filters';
        pokemonGrid.appendChild(noResults);
    }
}

async function fetchPokemonByGen(gen) {
    try {
        if (isLoading) return;
        isLoading = true;
        showLoading();
        
        pokemonGrid.innerHTML = '';
        
        // Use the global variable instead of fetching
        let fetchedPokemonData;
        switch(gen) {
            case "1": fetchedPokemonData = gen1Data; break;
            case "2": fetchedPokemonData = gen2Data; break;
            case "3": fetchedPokemonData = gen3Data; break;
            case "4": fetchedPokemonData = gen4Data; break;
            case "5": fetchedPokemonData = gen5Data; break;
            case "6": fetchedPokemonData = gen6Data; break;
            case "7": fetchedPokemonData = gen7Data; break;
            case "8": fetchedPokemonData = gen8Data; break;
            case "9": fetchedPokemonData = gen9Data; break;
            default: fetchedPokemonData = gen1Data;
        }
        
        pokemonData.length = 0;
        pokemonData.push(...fetchedPokemonData);
        
        // Reset filters
        activeTypeFilters = [];
        document.querySelectorAll('.type-filter').forEach(btn => btn.classList.remove('active'));
        searchInput.value = '';
        
        // Reset sort to default
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.sort === 'id') btn.classList.add('active');
        });
        currentSortMethod = 'id';
        
        // Reset direction to ascending
        document.querySelectorAll('.direction-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.direction === 'asc') btn.classList.add('active');
        });
        sortDirection = 'asc';
        
        // Display all Pokémon
        pokemonData.forEach(data => createPokemonCard(data));
        
        // Set up filters if not already done
        setupTypeFilters();
        setupSortButtons();
        setupFilterButtons();
        
    } catch (error) {
        console.error('Error fetching Pokemon:', error);
    } finally {
        hideLoading();
        isLoading = false;
    }
}

function setupSearchInput() {
    searchInput.addEventListener('input', () => {
        // Apply filters as user types
        applyFilters();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPokemonByGen("1"); // Start with Gen 1
    
    // Set up filter panel and controls
    setupFilterToggle();
    setupTypeFilters();
    setupSortButtons();
    setupFilterButtons();
    setupSearchInput();
    
    document.getElementById('whosThatPokemon').addEventListener('click', startWhosThatPokemon);
});
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

  async function fetchAllPokemon() {
      try {
          if (isLoading) return;
          isLoading = true;
          showLoading();
        
          if (allPokemonData.length > 0) {
              // Data already loaded
              hideLoading();
              isLoading = false;
              return;
          }
        
          // Load all generations from local JSON files
          for (let gen = 1; gen <= 9; gen++) {
              const response = await fetch(`data/gen${gen}.json`);
              const genData = await response.json();
              allPokemonData.push(...genData);
          }
        
      } catch (error) {
          console.error('Error fetching Pokemon:', error);
      } finally {
          hideLoading();
          isLoading = false;
      }
  }
const styleSheet = document.createElement('style');
styleSheet.textContent = loadingStyles;
document.head.appendChild(styleSheet);
fetchPokemonByGen(1);

function showLoading() {
    const indicator = document.querySelector('.loading-indicator');
    indicator.style.display = 'block';
}

function hideLoading() {
    const indicator = document.querySelector('.loading-indicator');
    indicator.style.display = 'none';
    isLoading = false;
}

let gameScore = 0;
let highScore = getCookie('highScore') || 0;

const allPokemonData = [];

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? Number(match[2]) : 0;
}

function setHighScore(score) {
    if (score > highScore) {
        highScore = score;
        document.cookie = `highScore=${score};max-age=31536000;path=/`;
        updateScore();
    }
}

async function fetchAllPokemon() {
    try {
        if (isLoading) return;
        isLoading = true;
        showLoading();
        
        if (allPokemonData.length > 0) {
            // Data already loaded
            hideLoading();
            isLoading = false;
            return;
        }
        
        // Use the global variables instead of fetching
        allPokemonData.push(...gen1Data);
        allPokemonData.push(...gen2Data);
        allPokemonData.push(...gen3Data);
        allPokemonData.push(...gen4Data);
        allPokemonData.push(...gen5Data);
        allPokemonData.push(...gen6Data);
        allPokemonData.push(...gen7Data);
        allPokemonData.push(...gen8Data);
        allPokemonData.push(...gen9Data);
        
    } catch (error) {
        console.error('Error fetching Pokemon:', error);
    } finally {
        hideLoading();
        isLoading = false;
    }
}async function startWhosThatPokemon() {
    if (allPokemonData.length === 0) {
        await fetchAllPokemon();
    }
    gameScore = 0;
    updateScore();
    showNextPokemon();
}

function showNextPokemon() {
  const gameModal = document.getElementById('gameModal');
  const mysteryPokemon = document.getElementById('mysteryPokemon');
  const answerOptions = document.getElementById('answerOptions');
  const gameResult = document.getElementById('gameResult');
    
  gameResult.innerHTML = '';
  mysteryPokemon.classList.add('silhouette');
    
  const correctPokemon = allPokemonData[Math.floor(Math.random() * allPokemonData.length)];
  const options = [correctPokemon.name];
    
  while(options.length < 4) {
      const randomPokemon = allPokemonData[Math.floor(Math.random() * allPokemonData.length)].name;
      if(!options.includes(randomPokemon)) {
          options.push(randomPokemon);
      }
  }
    
  const shuffledOptions = options.sort(() => Math.random() - 0.5);
    
  mysteryPokemon.src = correctPokemon.sprites.other['official-artwork'].front_default;
    
  answerOptions.innerHTML = shuffledOptions.map(option => `
      <button class="answer-btn" onclick="checkAnswer('${option}', '${correctPokemon.name}')">
          ${option}
      </button>
  `).join('');
    
  gameModal.style.display = 'block';
}

function updateScore() {
    document.getElementById('gameScore').innerHTML = `
        Puntuación: ${gameScore}<br>
        Mejor Puntuación: ${highScore}
    `;
}

function checkAnswer(selected, correct) {
    const gameResult = document.getElementById('gameResult');
    const mysteryPokemon = document.getElementById('mysteryPokemon');
    const answerButtons = document.querySelectorAll('.answer-btn');

    mysteryPokemon.classList.remove('silhouette');
    answerButtons.forEach(btn => btn.disabled = true);

    if(selected === correct) {
        gameScore += 100;
        setHighScore(gameScore);
        gameResult.innerHTML = `
            <div class="result-popup correct">
                <h2>CORRECTO!</h2>
                <p>¡Es ${correct}!</p>
            </div>`;
    } else {
        gameScore = 0;
        gameResult.innerHTML = `
            <div class="result-popup wrong">
                <h2>¡INCORRECTO!</h2>
                <p>¡Es ${correct}!</p>
                <p>¡Se reinició la puntuación!</p>
            </div>`;
    }

    updateScore();

    setTimeout(() => {
        showNextPokemon();
    }, 1000);
}