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

async function showPokemonDetails(pokemon) {
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
            <div class="pokemon-header">
                <h2 class="pokemon-name">${pokemon.name}</h2>
                <p class="pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</p>
                <button class="sound-btn" data-pokemon-id="${pokemon.id}" aria-label="Play Pokémon Cry">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                        <path fill="none" d="M0 0h24v24H0z"/>
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
            <div class="pokemon-types">${types}</div>
            <div class="stats-container">${stats}</div>
            <div class="pokemon-info">
                <p><strong>Altura:</strong> ${pokemon.height/10}m</p>
                <p><strong>Peso:</strong> ${pokemon.weight/10}kg</p>
            </div>
            <div class="evolution-chain-container">
                <h3>Evolution Chain</h3>
                <div id="evolutionChain" class="evolution-chain">
                    <div class="loading-evolution">Loading evolution data...</div>
                </div>
            </div>
        </div>
        <audio id="pokemonCry" preload="none"></audio>
    `;

    const spriteImg = document.querySelector('.pokedex-screen .pokemon-sprite');
    spriteImg.src = primarySpriteUrl;
    spriteImg.onerror = function() {
        this.onerror = null;
        this.src = fallbackSpriteUrl;
    };

    modal.style.display = 'block';
    modalContent.classList.add('show');
    
    fetchEvolutionChain(pokemon.id);
    
    setupSoundButton(pokemon.id);
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
                Failed to load evolution data. Please try again later.
            </div>
        `;
    }
}

function displayEvolutionChain(chain) {
    const evolutionChainElement = document.getElementById('evolutionChain');
    
    // Clear loading message
    evolutionChainElement.innerHTML = '';
    
    // Create the evolution chain HTML
    const evolutionHTML = createEvolutionHTML(chain);
    evolutionChainElement.innerHTML = evolutionHTML;
    
    // Add click events to evolution sprites
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
        evolutionDetails = getSpecialEvolutionDetails(details);
    }
    
    // Create HTML for this Pokémon
    const spriteUrl = `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokemonName}.png`;
    const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokemonIdFromName(pokemonName)}.png`;
    
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