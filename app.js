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
    
    // Create type badges
    const types = pokemon.types.map(type => {
        const typeName = type.type.name;
        return `
            <span class="type-badge ${typeName}" style="background-color: ${typeColors[typeName]}">
                <img class="type-icon" src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${typeName}.svg" 
                     alt="${typeName}" onerror="handleTypeIconError(this)">
            </span>
        `;
    }).join('');
    
    card.innerHTML = `
        <img class="pokemon-sprite" src="${primarySpriteUrl}" alt="${pokemon.name}" 
             onerror="this.onerror=null; this.src='${fallbackSpriteUrl}'">
        <p class="pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</p>
        <h2 class="pokemon-name">${pokemon.name}</h2>
        <div class="card-types">${types}</div>
    `;
    
    card.addEventListener('click', () => showPokemonDetails(pokemon));
    pokemonGrid.appendChild(card);
}

function handleTypeIconError(img) {
    img.onerror = null;
    img.style.display = 'none';
    img.parentElement.style.paddingLeft = '0.5rem';
    img.parentElement.style.paddingRight = '0.5rem';
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
    
    if (!filterToggle || !filterPanel) {
        console.error('Filter toggle or panel elements not found');
        return;
    }
    
    filterToggle.addEventListener('click', () => {
        console.log('Filter toggle clicked');
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
        setupFilterToggle();
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

function setupSoundButton(pokemonId) {
    const soundButton = document.querySelector('.sound-btn');
    const audioElement = document.getElementById('pokemonCry');
    
    const pokemonName = getPokemonNameById(pokemonId);
    const cryUrl = `https://play.pokemonshowdown.com/audio/cries/${pokemonName.toLowerCase()}.mp3`;
    audioElement.src = cryUrl;
    
    soundButton.setAttribute('aria-label', `Reproducir el sonido de ${pokemonName}`);
    soundButton.setAttribute('title', `Reproducir el sonido de ${pokemonName}`);
    
    soundButton.addEventListener('click', () => {
        playPokemonCry(audioElement, soundButton);
    });
    
    soundButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            playPokemonCry(audioElement, soundButton);
        }
    });
    
    audioElement.load();
}

function playPokemonCry(audioElement, button) {

    button.classList.add('playing');

    audioElement.play().catch(error => {
        console.error('Error playing Pokémon cry:', error);
        showSoundError(button);
    });

    audioElement.onended = () => {
        button.classList.remove('playing');
    };
    
    audioElement.onerror = () => {
        button.classList.remove('playing');
        showSoundError(button);
    };
}

function showSoundError(button) {
    button.classList.add('error');
    
    setTimeout(() => {
        button.classList.remove('error');
    }, 2000);
}

function getPokemonNameById(id) {
    const pokemon = pokemonData.find(p => p.id === id);
    return pokemon ? pokemon.name : '';
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

async function fetchEvolutionChain(pokemonId) {
    try {
        // First, get the species data which contains the evolution chain URL
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`);
        const speciesData = await speciesResponse.json();
        
        // Then, fetch the evolution chain data
        const evolutionResponse = await fetch(speciesData.evolution_chain.url);
        const evolutionData = await evolutionResponse.json();
        
        // Process and display the evolution chain
        displayEvolutionChain(evolutionData.chain);
    } catch (error) {
        console.error('Error fetching evolution chain:', error);
        document.getElementById('evolutionChain').innerHTML = `
            <div class="evolution-error">
                Error al cargar datos de evolución. Por favor, inténtalo de nuevo más tarde.
            </div>
        `;
    }
}

function displayEvolutionChain(chain) {
    const evolutionChainElement = document.getElementById('evolutionChain');
    
    evolutionChainElement.innerHTML = '';
    
    const evolutionHTML = createEvolutionHTML(chain);
    evolutionChainElement.innerHTML = evolutionHTML;
    
    document.querySelectorAll('.evolution-pokemon').forEach(element => {
        element.addEventListener('click', async () => {
            const pokemonName = element.dataset.name;
            try {
                const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}/`);
                const pokemonData = await response.json();
                showPokemonDetails(pokemonData);
            } catch (error) {
                console.error('Error fetching Pokémon details:', error);
            }
        });
    });
}

function createEvolutionHTML(chain, level = 0) {
    // Get the current Pokémon in the chain
    const pokemon = chain.species;
    const pokemonName = pokemon.name;
    
    // Get evolution details if this isn't the base form
    let evolutionDetails = '';
    if (chain.evolution_details && chain.evolution_details.length > 0) {
        const details = chain.evolution_details[0];
        evolutionDetails = getEvolutionDetails(details);
    }
    
    // Create HTML for this Pokémon
    const spriteUrl = `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokemonName}.png`;
    const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokemonIdFromUrl(pokemon.url)}.png`;
    
    let html = `
        <div class="evolution-stage level-${level}">
            ${level > 0 ? `
                <div class="evolution-arrow">
                    <span class="arrow-icon">→</span>
                    <span class="evolution-detail">${evolutionDetails}</span>
                </div>
            ` : ''}
            <div class="evolution-pokemon" data-name="${pokemonName}">
                <img src="${spriteUrl}" alt="${pokemonName}" 
                     onerror="this.onerror=null; this.src='${fallbackUrl}'">
                <p class="evolution-name">${formatPokemonName(pokemonName)}</p>
            </div>
    `;
    
    // If there are evolutions, recursively add them
    if (chain.evolves_to && chain.evolves_to.length > 0) {
        // Single evolution path
        if (chain.evolves_to.length === 1) {
            html += createEvolutionHTML(chain.evolves_to[0], level + 1);
        } 
        // Multiple evolution paths (branching)
        else if (chain.evolves_to.length > 1) {
            html += `
                <div class="evolution-branches">
                    <div class="evolution-branch-container">
            `;
            
            chain.evolves_to.forEach(evolution => {
                html += `
                    <div class="evolution-branch">
                        ${createEvolutionHTML(evolution, level + 1)}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
    }
    
    html += `</div>`;
    
    return html;
}

function getEvolutionDetails(details) {
    if (!details) return 'Desconocido';
    
    if (details.min_level) {
        return `Nivel ${details.min_level}`;
    } else if (details.item) {
        return `Usa ${formatItemName(details.item.name)}`;
    } else if (details.trigger && details.trigger.name === 'trade') {
        if (details.held_item) {
            return `Intercambiar con ${formatItemName(details.held_item.name)}`;
        }
        return 'Intercambiar';
    } else if (details.min_happiness) {
        if (details.time_of_day) {
            return `Felicidad + ${details.time_of_day === 'day' ? 'Día' : 'Noche'}`;
        }
        return `Felicidad ≥ ${details.min_happiness}`;
    } else if (details.known_move) {
        return `Aprende ${formatMoveName(details.known_move.name)}`;
    } else if (details.location) {
        return `En ${formatLocationName(details.location.name)}`;
    } else if (details.time_of_day) {
        const timeTranslations = {
            'day': 'Día',
            'night': 'Noche'
        };
        return `Durante ${timeTranslations[details.time_of_day] || details.time_of_day}`;
    }
    
    return 'Condición Especial';
}

function formatPokemonName(name) {
    return name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function formatItemName(name) {
    return name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function formatMoveName(name) {
    return name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function formatLocationName(name) {
    return name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function getPokemonIdFromUrl(url) {
    const matches = url.match(/\/(\d+)\/$/);
    return matches ? matches[1] : 1;
}

function getSpecialEvolutionDetails(details) {
    if (!details) return 'Unknown';
    
    if (details.min_level) {
        return `Nivel ${details.min_level}`;
    } else if (details.item) {
        return `Usa ${formatItemName(details.item.name)}`;
    } else if (details.trigger && details.trigger.name === 'trade') {
        if (details.held_item) {
            return `Intercambiar Con ${formatItemName(details.held_item.name)}`;
        }
        return 'Intercambiar';
    } else if (details.min_happiness) {
        if (details.time_of_day) {
            return `Felicidad + ${details.time_of_day}`;
        }
        return `Felicidad ≥ ${details.min_happiness}`;
    } else if (details.known_move) {
        return `Aprende ${formatMoveName(details.known_move.name)}`;
    } else if (details.location) {
        return `En ${formatLocationName(details.location.name)}`;
    } else if (details.time_of_day) {
        return `Durante ${details.time_of_day}`;
    }
    
    return 'Condición Especial';
}

function formatMoveName(name) {
    return name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function formatLocationName(name) {
    return name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Helper function to format Pokémon names
function formatPokemonName(name) {
    return name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Helper function to format item names
function formatItemName(name) {
    return name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Helper function to get Pokémon ID from name (for fallback sprites)
function getPokemonIdFromName(name) {
    // This is a simplified approach - in a real app, you might want to use a mapping
    for (const gen in genRanges) {
        const { start, end } = genRanges[gen];
        for (let i = start; i <= end; i++) {
            const pokemon = pokemonData.find(p => p.id === i);
            if (pokemon && pokemon.name === name) {
                return i;
            }
        }
    }
    return 1; // Default to Bulbasaur if not found
}

async function fetchPokemonHabitat(pokemonId) {
    try {
        // First, get the species data which contains the habitat info
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`);
        const speciesData = await speciesResponse.json();
        
        // Display the habitat information
        displayHabitatInfo(speciesData);
        
        // Then fetch location data
        fetchPokemonLocations(pokemonId);
    } catch (error) {
        console.error('Error fetching habitat data:', error);
        document.getElementById('pokemonHabitat').innerHTML = `
            <div class="no-habitat">
                Failed to load habitat data. Please try again later.
            </div>
        `;
    }
}

// Function to display habitat information
function displayHabitatInfo(speciesData) {
    const habitatContainer = document.getElementById('pokemonHabitat');
    
    // Check if habitat data exists
    if (!speciesData.habitat) {
        habitatContainer.innerHTML = `
            <div class="no-habitat">
                No hay información de hábitat disponible para este Pokémon.
            </div>
        `;
        return;
    }
    
    // Get habitat name and description
    const habitatName = speciesData.habitat.name;
    
    // Map habitat names to Spanish descriptions
    const habitatDescriptions = {
        'cave': 'Ambientes oscuros y rocosos que se encuentran bajo tierra o en montañas.',
        'forest': 'Áreas boscosas con densa cobertura de árboles y sotobosque.',
        'grassland': 'Campos abiertos con abundante hierba y pocos árboles.',
        'mountain': 'Áreas de gran altitud con terreno rocoso y vegetación escasa.',
        'rare': 'Ubicaciones poco comunes que son difíciles de acceder.',
        'rough-terrain': 'Paisajes accidentados con terreno irregular y obstáculos.',
        'sea': 'Entornos oceánicos con agua salada.',
        'urban': 'Ciudades y pueblos construidos por humanos.',
        'waters-edge': 'Áreas donde la tierra se encuentra con el agua, como playas y riberas.',
        'unknown': 'El hábitat de este Pokémon no está bien documentado.'
    };
    
    // Map habitat names to Spanish names
    const habitatNamesSpanish = {
        'cave': 'Cueva',
        'forest': 'Bosque',
        'grassland': 'Pradera',
        'mountain': 'Montaña',
        'rare': 'Raro',
        'rough-terrain': 'Terreno Accidentado',
        'sea': 'Mar',
        'urban': 'Urbano',
        'waters-edge': 'Orilla del Agua',
        'unknown': 'Desconocido'
    };
    
    const habitatDescription = habitatDescriptions[habitatName] || 'Los detalles específicos de este hábitat no están bien documentados.';
    const habitatNameSpanish = habitatNamesSpanish[habitatName] || capitalizeFirstLetter(habitatName);
    
    // Create the habitat info HTML
    habitatContainer.innerHTML = `
        <div class="habitat-info">
            <div>
                <h4 class="habitat-name">Hábitat: ${habitatNameSpanish}</h4>
                <p class="habitat-description">${habitatDescription}</p>
            </div>
            <div class="habitat-map">
                <div class="map-container" id="mapContainer">
                    <!-- Map regions will be added here -->
                </div>
            </div>
            <div class="location-list" id="locationList">
                <div class="loading-locations">Cargando datos de localización...</div>
            </div>
        </div>
    `;
    
    // Create the interactive map
    createHabitatMap(habitatName);
}

// Function to create the interactive habitat map
function createHabitatMap(habitatName) {
    const mapContainer = document.getElementById('mapContainer');
    
    // Clear previous map
    mapContainer.innerHTML = '';
    
    // Set background image based on habitat
    const mapBackgrounds = {
        'cave': 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cave-key.png)',
        'forest': 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/miracle-seed.png)',
        'grassland': 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/meadow-plate.png)',
        'mountain': 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hard-stone.png)',
        'rare': 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/comet-shard.png)',
        'rough-terrain': 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/stone-plate.png)',
        'sea': 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mystic-water.png)',
        'urban': 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/metal-coat.png)',
        'waters-edge': 'url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/wave-incense.png)'
    };
    
    // Set a background color based on habitat
    const habitatColors = {
        'cave': '#4a4a4a',
        'forest': '#2e7d32',
        'grassland': '#7cb342',
        'mountain': '#795548',
        'rare': '#9c27b0',
        'rough-terrain': '#8d6e63',
        'sea': '#1976d2',
        'urban': '#616161',
        'waters-edge': '#0097a7'
    };
    
    const mapColor = habitatColors[habitatName] || '#37474f';
    
    // Set the map background
    mapContainer.style.backgroundColor = mapColor;
    mapContainer.style.backgroundImage = mapBackgrounds[habitatName] || 'none';
    mapContainer.style.backgroundSize = '64px';
    mapContainer.style.backgroundPosition = 'center';
    mapContainer.style.backgroundRepeat = 'no-repeat';
    
    // Define regions based on the Pokémon games
    const regions = [
        { name: 'Kanto', x: 10, y: 10, width: 60, height: 40 },
        { name: 'Johto', x: 80, y: 10, width: 60, height: 40 },
        { name: 'Hoenn', x: 150, y: 10, width: 60, height: 40 },
        { name: 'Sinnoh', x: 220, y: 10, width: 60, height: 40 },
        { name: 'Unova', x: 10, y: 60, width: 60, height: 40 },
        { name: 'Kalos', x: 80, y: 60, width: 60, height: 40 },
        { name: 'Alola', x: 150, y: 60, width: 60, height: 40 },
        { name: 'Galar', x: 220, y: 60, width: 60, height: 40 }
    ];
    
    // Add regions to the map
    regions.forEach(region => {
        const regionElement = document.createElement('div');
        regionElement.className = 'map-region';
        regionElement.dataset.region = region.name;
        regionElement.style.left = `${region.x}px`;
        regionElement.style.top = `${region.y}px`;
        regionElement.style.width = `${region.width}px`;
        regionElement.style.height = `${region.height}px`;
        
        const tooltipElement = document.createElement('div');
        tooltipElement.className = 'map-tooltip';
        tooltipElement.textContent = region.name;
        tooltipElement.style.left = `${region.x + region.width / 2}px`;
        tooltipElement.style.top = `${region.y - 20}px`;
        
        mapContainer.appendChild(regionElement);
        mapContainer.appendChild(tooltipElement);
        
        // Add click event to filter locations by region
        regionElement.addEventListener('click', () => {
            // Toggle active class
            document.querySelectorAll('.map-region').forEach(el => el.classList.remove('active'));
            regionElement.classList.add('active');
            
            // Filter locations by region
            filterLocationsByRegion(region.name);
        });
    });
}

async function fetchPokemonLocations(pokemonId) {
    try {
        const locationResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}/encounters`);
        const locationData = await locationResponse.json();
        
        displayLocationData(locationData);
    } catch (error) {
        console.error('Error fetching location data:', error);
        document.getElementById('locationList').innerHTML = `
            <div class="location-item">
                No specific location data available.
            </div>
        `;
    }
}

// Function to display location data
function displayLocationData(locationData) {
    const locationList = document.getElementById('locationList');
    
    if (!locationData || locationData.length === 0) {
        locationList.innerHTML = `
            <div class="location-item">
                No specific location data available for this Pokémon.
            </div>
        `;
        return;
    }
    
    // Group locations by region
    const locationsByRegion = {};
    
    locationData.forEach(location => {
        // Extract region from location area
        const locationName = location.location_area.name.replace(/-/g, ' ');
        const regionName = getRegionFromLocation(locationName);
        
        if (!locationsByRegion[regionName]) {
            locationsByRegion[regionName] = [];
        }
        
        // Get encounter details
        const encounterDetails = location.version_details.map(version => {
            return {
                version: version.version.name,
                maxChance: version.max_chance,
                encounterDetails: version.encounter_details.map(detail => ({
                    method: detail.method.name,
                    chance: detail.chance,
                    minLevel: detail.min_level,
                    maxLevel: detail.max_level
                }))
            };
        });
        
        locationsByRegion[regionName].push({
            name: locationName,
            encounterDetails: encounterDetails
        });
    });
    
    // Store the location data for filtering
    window.pokemonLocationData = locationsByRegion;
    
    // Display all locations initially
    displayAllLocations();
}

// Function to display all locations
function displayAllLocations() {
    const locationList = document.getElementById('locationList');
    const locationData = window.pokemonLocationData;
    
    if (!locationData || Object.keys(locationData).length === 0) {
        locationList.innerHTML = `
            <div class="location-item">
                No specific location data available for this Pokémon.
            </div>
        `;
        return;
    }
    
    let locationsHTML = '';
    
    // Loop through each region
    for (const region in locationData) {
        const locations = locationData[region];
        
        locationsHTML += `
            <div class="region-header">${region}</div>
        `;
        
        // Loop through each location in the region
        locations.forEach(location => {
            // Calculate average encounter rate
            let totalChance = 0;
            let versionCount = 0;
            
            location.encounterDetails.forEach(version => {
                totalChance += version.maxChance;
                versionCount++;
            });
            
            const averageRate = versionCount > 0 ? Math.round(totalChance / versionCount) : 'Unknown';
            const rateDisplay = averageRate !== 'Unknown' ? `${averageRate}%` : averageRate;
            
            locationsHTML += `
                <div class="location-item">
                    <span class="location-name">${capitalizeFirstLetter(location.name)}</span>
                    <span class="location-rate">Encounter rate: ${rateDisplay}</span>
                </div>
            `;
        });
    }
    
    locationList.innerHTML = locationsHTML;
}

// Function to filter locations by region
function filterLocationsByRegion(regionName) {
    const locationList = document.getElementById('locationList');
    const locationData = window.pokemonLocationData;
    
    if (!locationData) {
        return;
    }
    
    // If "All" is selected, show all locations
    if (regionName === 'All') {
        displayAllLocations();
        return;
    }
    
    // Filter locations for the selected region
    const filteredLocations = locationData[regionName] || [];
    
    if (filteredLocations.length === 0) {
        locationList.innerHTML = `
            <div class="location-item">
                No locations found in ${regionName} for this Pokémon.
            </div>
        `;
        return;
    }
    
    let locationsHTML = '';
    
    // Loop through each location in the region
    filteredLocations.forEach(location => {
        // Calculate average encounter rate
        let totalChance = 0;
        let versionCount = 0;
        
        location.encounterDetails.forEach(version => {
            totalChance += version.maxChance;
            versionCount++;
        });
        
        const averageRate = versionCount > 0 ? Math.round(totalChance / versionCount) : 'Unknown';
        const rateDisplay = averageRate !== 'Unknown' ? `${averageRate}%` : averageRate;
        
        locationsHTML += `
            <div class="location-item">
                <span class="location-name">${capitalizeFirstLetter(location.name)}</span>
                <span class="location-rate">Encounter rate: ${rateDisplay}</span>
            </div>
        `;
    });
    
    locationList.innerHTML = locationsHTML;
}

// Helper function to get region from location name
function getRegionFromLocation(locationName) {
    // Map location prefixes to regions
    const regionMappings = {
        'kanto': 'Kanto',
        'johto': 'Johto',
        'hoenn': 'Hoenn',
        'sinnoh': 'Sinnoh',
        'unova': 'Unova',
        'kalos': 'Kalos',
        'alola': 'Alola',
        'galar': 'Galar'
    };
    
    // Check if the location name contains any region prefix
    for (const prefix in regionMappings) {
        if (locationName.toLowerCase().includes(prefix)) {
            return regionMappings[prefix];
        }
    }
    
    // Try to determine region from game versions
    if (locationName.includes('red') || locationName.includes('blue') || locationName.includes('yellow')) {
        return 'Kanto';
    } else if (locationName.includes('gold') || locationName.includes('silver') || locationName.includes('crystal')) {
        return 'Johto';
    } else if (locationName.includes('ruby') || locationName.includes('sapphire') || locationName.includes('emerald')) {
        return 'Hoenn';
    } else if (locationName.includes('diamond') || locationName.includes('pearl') || locationName.includes('platinum')) {
        return 'Sinnoh';
    } else if (locationName.includes('black') || locationName.includes('white')) {
        return 'Unova';
    } else if (locationName.includes('x') || locationName.includes('y')) {
        return 'Kalos';
    } else if (locationName.includes('sun') || locationName.includes('moon')) {
        return 'Alola';
    } else if (locationName.includes('sword') || locationName.includes('shield')) {
        return 'Galar';
    }
    
    // Default to "Other" if region can't be determined
    return 'Other';
}

function capitalizeFirstLetter(string) {
    return string.split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

function showPokemonDetails(pokemon) {
    const pokemonDetails = document.getElementById('pokemon-details');
    
    // Create enhanced type badges with icons
    const types = pokemon.types.map(type => {
        const typeName = type.type.name;
        return `
            <span class="type-badge ${typeName}" style="background-color: ${typeColors[typeName]}">
                <img class="type-icon" src="https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${typeName}.svg" 
                     alt="${typeName}" onerror="handleTypeIconError(this)">
                ${typeName}
            </span>
        `;
    }).join('');

    // Create enhanced stats display with progress bars
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
        const statValue = stat.base_stat;
        
        // Calculate percentage for progress bar (max stat value is typically 255)
        const percentage = Math.min(100, Math.round((statValue / 255) * 100));
        
        // Determine color based on stat value
        let statColor;
        if (statValue < 50) statColor = '#f34444';
        else if (statValue < 90) statColor = '#ff7f0f';
        else if (statValue < 120) statColor = '#ffdd57';
        else if (statValue < 150) statColor = '#a0e515';
        else statColor = '#23cd5e';
        
        return `<div class="stat-item">
            <strong>${statName}:</strong>
            <div class="stat-value">${statValue}</div>
            <div class="stat-bar-container">
                <div class="stat-bar" style="width: ${percentage}%; background-color: ${statColor}"></div>
            </div>
        </div>`;
    }).join('');

    // Add height and weight to the stats section with improved styling
    const heightValue = (pokemon.height/10).toFixed(1);
    const weightValue = (pokemon.weight/10).toFixed(1);
    
    // Calculate relative height and weight percentages for visual bars
    // Average height is around 1.5m, max around 20m
    const heightPercentage = Math.min(100, Math.round((heightValue / 4) * 100));
    // Average weight is around 60kg, max around 1000kg
    const weightPercentage = Math.min(100, Math.round((weightValue / 200) * 100));
    
    const physicalStats = `
        <div class="stat-item physical-stat">
            <strong>Altura:</strong>
            <div class="stat-value">${heightValue} m</div>
            <div class="stat-bar-container">
                <div class="stat-bar physical-bar" style="width: ${heightPercentage}%; background-color: #3498db"></div>
            </div>
        </div>
        <div class="stat-item physical-stat">
            <strong>Peso:</strong>
            <div class="stat-value">${weightValue} kg</div>
            <div class="stat-bar-container">
                <div class="stat-bar physical-bar" style="width: ${weightPercentage}%; background-color: #9b59b6"></div>
            </div>
        </div>
    `;

    const primarySpriteUrl = `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokemon.name}.png`;
    const fallbackSpriteUrl = pokemon.sprites.other['official-artwork'].front_default;

    pokemonDetails.innerHTML = `
        <div class="pokemon-info-screen">
            <h2 class="pokemon-name">${pokemon.name}</h2>
            <p class="pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</p>
            <div class="pokemon-types">${types}</div>
            <div class="stats-container">
                ${stats}
                ${physicalStats}
            </div>
            
            <div class="evolution-chain-container">
                <h3>Cadena de Evolución</h3>
                <div id="evolutionChain" class="evolution-chain">
                    <div class="loading-evolution">Cargando datos de la cadena de evolución...</div>
                </div>
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
    
    // Fetch and display evolution chain
    fetchEvolutionChain(pokemon.id);
}

function createRegionFilter(locationData) {
    // Get all available regions
    const regions = Object.keys(locationData);
    
    if (regions.length <= 1) {
        return; // Don't create filter if there's only one region
    }
    
    // Create filter container
    const filterContainer = document.createElement('div');
    filterContainer.className = 'region-filter';
    
    // Add "All" button
    const allButton = document.createElement('button');
    allButton.className = 'region-filter-btn active';
    allButton.textContent = 'Todas las Regiones';
    allButton.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.region-filter-btn').forEach(btn => btn.classList.remove('active'));
        allButton.classList.add('active');
        
        // Show all locations
        displayAllLocations();
        
        // Reset map regions
        document.querySelectorAll('.map-region').forEach(region => region.classList.remove('active'));
    });
    
    filterContainer.appendChild(allButton);
    
    // Add a button for each region
    regions.forEach(region => {
        const regionButton = document.createElement('button');
        regionButton.className = 'region-filter-btn';
        regionButton.textContent = region;
        regionButton.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.region-filter-btn').forEach(btn => btn.classList.remove('active'));
            regionButton.classList.add('active');
            
            // Filter locations by region
            filterLocationsByRegion(region);
            
            // Highlight the corresponding map region
            document.querySelectorAll('.map-region').forEach(el => {
                if (el.dataset.region === region) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
        });
        
        filterContainer.appendChild(regionButton);
    });
    
    // Insert the filter before the location list
    const locationList = document.getElementById('locationList');
    locationList.parentNode.insertBefore(filterContainer, locationList);
}

function displayLocationData(locationData) {
    const locationList = document.getElementById('locationList');
    
    if (!locationData || locationData.length === 0) {
        locationList.innerHTML = `
            <div class="location-item">
                No specific location data available for this Pokémon.
            </div>
        `;
        return;
    }
    
    // Group locations by region
    const locationsByRegion = {};
    
    locationData.forEach(location => {
        // Extract region from location area
        const locationName = location.location_area.name.replace(/-/g, ' ');
        const regionName = getRegionFromLocation(locationName);
        
        if (!locationsByRegion[regionName]) {
            locationsByRegion[regionName] = [];
        }
        
        // Get encounter details
        const encounterDetails = location.version_details.map(version => {
            return {
                version: version.version.name,
                maxChance: version.max_chance,
                encounterDetails: version.encounter_details.map(detail => ({
                    method: detail.method.name,
                    chance: detail.chance,
                    minLevel: detail.min_level,
                    maxLevel: detail.max_level
                }))
            };
        });
        
        locationsByRegion[regionName].push({
            name: locationName,
            encounterDetails: encounterDetails
        });
    });
    
    // Store the location data for filtering
    window.pokemonLocationData = locationsByRegion;
    
    // Create region filter buttons
    createRegionFilter(locationsByRegion);
    
    // Display all locations initially
    displayAllLocations();
    
    // Add a legend to the map
    addMapLegend();
}

function displayAllLocations() {
    const locationList = document.getElementById('locationList');
    const locationData = window.pokemonLocationData;
    
    if (!locationData || Object.keys(locationData).length === 0) {
        locationList.innerHTML = `
            <div class="location-item">
                No hay datos de localización específicos disponibles para este Pokémon.
            </div>
        `;
        return;
    }
    
    let locationsHTML = '';
    
    // Loop through each region
    for (const region in locationData) {
        const locations = locationData[region];
        
        locationsHTML += `
            <div class="region-header">${region}</div>
        `;
        
        // Loop through each location in the region
        locations.forEach(location => {
            // Calculate average encounter rate
            let totalChance = 0;
            let versionCount = 0;
            
            location.encounterDetails.forEach(version => {
                totalChance += version.maxChance;
                versionCount++;
            });
            
            const averageRate = versionCount > 0 ? Math.round(totalChance / versionCount) : 'Desconocido';
            const rateDisplay = averageRate !== 'Desconocido' ? `${averageRate}%` : averageRate;
            
            locationsHTML += `
                <div class="location-item">
                    <span class="location-name">${capitalizeFirstLetter(location.name)}</span>
                    <span class="location-rate">Tasa de encuentro: ${rateDisplay}</span>
                </div>
            `;
        });
    }
    
    locationList.innerHTML = locationsHTML;
}

function addMapLegend() {
    const mapContainer = document.getElementById('mapContainer');
    
    if (!mapContainer) return;
    
    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.textContent = 'Haz clic en una región para filtrar ubicaciones';
    
    mapContainer.appendChild(legend);
}

function enhanceHabitatMap(habitatName) {
    // Get the map container
    const mapContainer = document.getElementById('mapContainer');
    
    if (!mapContainer) return;
    
    // Add a background image based on the habitat
    const habitatImages = {
        'cave': 'https://archives.bulbagarden.net/media/upload/thumb/4/48/ORAS_Cave_of_Origin_Entrance.png/300px-ORAS_Cave_of_Origin_Entrance.png',
        'forest': 'https://archives.bulbagarden.net/media/upload/thumb/f/f6/Viridian_Forest_LGPE.png/300px-Viridian_Forest_LGPE.png',
        'grassland': 'https://archives.bulbagarden.net/media/upload/thumb/d/d0/Route_1_SWSH.png/300px-Route_1_SWSH.png',
        'mountain': 'https://archives.bulbagarden.net/media/upload/thumb/9/9d/Mt_Coronet_Summit_DPPt.png/300px-Mt_Coronet_Summit_DPPt.png',
        'rare': 'https://archives.bulbagarden.net/media/upload/thumb/e/ec/Cerulean_Cave_1F_LGPE.png/300px-Cerulean_Cave_1F_LGPE.png',
        'rough-terrain': 'https://archives.bulbagarden.net/media/upload/thumb/7/7a/Victory_Road_1F_ORAS.png/300px-Victory_Road_1F_ORAS.png',
        'sea': 'https://archives.bulbagarden.net/media/upload/thumb/8/87/Sea_Mauville_ORAS.png/300px-Sea_Mauville_ORAS.png',
        'urban': 'https://archives.bulbagarden.net/media/upload/thumb/0/09/Lumiose_City_XY.png/300px-Lumiose_City_XY.png',
        'waters-edge': 'https://archives.bulbagarden.net/media/upload/thumb/b/b1/Undella_Town_Summer_B2W2.png/300px-Undella_Town_Summer_B2W2.png'
    };
    
    const habitatImage = habitatImages[habitatName];
    
    if (habitatImage) {
        // Create a background image element
        const backgroundImg = document.createElement('img');
        backgroundImg.src = habitatImage;
        backgroundImg.className = 'habitat-background';
        backgroundImg.style.position = 'absolute';
        backgroundImg.style.top = '0';
        backgroundImg.style.left = '0';
        backgroundImg.style.width = '100%';
        backgroundImg.style.height = '100%';
        backgroundImg.style.objectFit = 'cover';
        backgroundImg.style.opacity = '0.7';
        backgroundImg.style.zIndex = '0';
        
        // Insert the background image as the first child
        mapContainer.insertBefore(backgroundImg, mapContainer.firstChild);
        
        // Make sure map regions are above the background
        document.querySelectorAll('.map-region').forEach(region => {
            region.style.zIndex = '1';
        });
    }
}

function createHabitatMap(habitatName) {
    const mapContainer = document.getElementById('mapContainer');
    
    // Clear previous map
    mapContainer.innerHTML = '';
    
    // Set background color based on habitat
    const habitatColors = {
        'cave': '#4a4a4a',
        'forest': '#2e7d32',
        'grassland': '#7cb342',
        'mountain': '#795548',
        'rare': '#9c27b0',
        'rough-terrain': '#8d6e63',
        'sea': '#1976d2',
        'urban': '#616161',
        'waters-edge': '#0097a7'
    };
    
    const mapColor = habitatColors[habitatName] || '#37474f';
    
    // Set the map background
    mapContainer.style.backgroundColor = mapColor;
    
    // Define regions based on the Pokémon games
    const regions = [
        { name: 'Kanto', x: 10, y: 10, width: 60, height: 40 },
        { name: 'Johto', x: 80, y: 10, width: 60, height: 40 },
        { name: 'Hoenn', x: 150, y: 10, width: 60, height: 40 },
        { name: 'Sinnoh', x: 220, y: 10, width: 60, height: 40 },
        { name: 'Unova', x: 10, y: 60, width: 60, height: 40 },
        { name: 'Kalos', x: 80, y: 60, width: 60, height: 40 },
        { name: 'Alola', x: 150, y: 60, width: 60, height: 40 },
        { name: 'Galar', x: 220, y: 60, width: 60, height: 40 }
    ];
    
    // Add regions to the map
    regions.forEach(region => {
        const regionElement = document.createElement('div');
        regionElement.className = 'map-region';
        regionElement.dataset.region = region.name;
        regionElement.style.left = `${region.x}px`;
        regionElement.style.top = `${region.y}px`;
        regionElement.style.width = `${region.width}px`;
        regionElement.style.height = `${region.height}px`;
        
        const tooltipElement = document.createElement('div');
        tooltipElement.className = 'map-tooltip';
        tooltipElement.textContent = region.name;
        tooltipElement.style.left = `${region.x + region.width / 2}px`;
        tooltipElement.style.top = `${region.y - 20}px`;
        
        mapContainer.appendChild(regionElement);
        mapContainer.appendChild(tooltipElement);
        
        // Add click event to filter locations by region
        regionElement.addEventListener('click', () => {
            // Toggle active class
            document.querySelectorAll('.map-region').forEach(el => el.classList.remove('active'));
            regionElement.classList.add('active');
            
            // Filter locations by region
            filterLocationsByRegion(region.name);
            
            // Update region filter buttons if they exist
            document.querySelectorAll('.region-filter-btn').forEach(btn => {
                if (btn.textContent === region.name) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    });
    
    // Enhance the map with a background image
    enhanceHabitatMap(habitatName);
}

function filterLocationsByRegion(regionName) {
    const locationList = document.getElementById('locationList');
    const locationData = window.pokemonLocationData;
    
    if (!locationData) {
        return;
    }
    
    // If "All" is selected, show all locations
    if (regionName === 'Todas las Regiones') {
        displayAllLocations();
        return;
    }
    
    // Filter locations for the selected region
    const filteredLocations = locationData[regionName] || [];
    
    if (filteredLocations.length === 0) {
        locationList.innerHTML = `
            <div class="location-item">
                No se encontraron ubicaciones en ${regionName} para este Pokémon.
            </div>
        `;
        return;
    }
    
    let locationsHTML = '';
    
    // Loop through each location in the region
    filteredLocations.forEach(location => {
        // Calculate average encounter rate
        let totalChance = 0;
        let versionCount = 0;
        
        location.encounterDetails.forEach(version => {
            totalChance += version.maxChance;
            versionCount++;
        });
        
        const averageRate = versionCount > 0 ? Math.round(totalChance / versionCount) : 'Desconocido';
        const rateDisplay = averageRate !== 'Desconocido' ? `${averageRate}%` : averageRate;
        
        locationsHTML += `
            <div class="location-item">
                <span class="location-name">${capitalizeFirstLetter(location.name)}</span>
                <span class="location-rate">Tasa de encuentro: ${rateDisplay}</span>
            </div>
        `;
    });
    
    locationList.innerHTML = locationsHTML;
}