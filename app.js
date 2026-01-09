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

    const primarySpriteUrl = `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokemon.name}.png`;

    const fallbackSpriteUrl = pokemon.sprites.other['official-artwork'].front_default;

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

    typeFiltersContainer.innerHTML = '';

    Object.keys(typeColors).forEach(type => {
        const typeButton = document.createElement('button');
        typeButton.className = 'type-filter';
        typeButton.dataset.type = type;
        typeButton.textContent = type;
        typeButton.style.backgroundColor = typeColors[type];

        typeButton.addEventListener('click', () => {
            typeButton.classList.toggle('active');

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

            applyFilters();
        });

        typeFiltersContainer.appendChild(typeButton);
    });
}

function setupSortButtons() {
    const sortButtons = document.querySelectorAll('.sort-btn');

    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            sortButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            currentSortMethod = button.dataset.sort;

            applyFilters();
        });
    });

    const directionButtons = document.querySelectorAll('.direction-btn');
    if (directionButtons.length > 0) {
        directionButtons.forEach(button => {
            button.addEventListener('click', () => {
                directionButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                sortDirection = button.dataset.direction;

                applyFilters();
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPokemonByGen("1");

    setupFilterToggle();
    setupTypeFilters();
    setupSortButtons();
    setupSearchInput();

    document.getElementById('whosThatPokemon').addEventListener('click', startWhosThatPokemon);
});

function applyFilters() {
    let filteredPokemon = [...pokemonData];

    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredPokemon = filteredPokemon.filter(pokemon =>
            pokemon.name.toLowerCase().includes(searchTerm) ||
            pokemon.id.toString().includes(searchTerm)
        );
    }

    if (activeTypeFilters.length > 0) {
        filteredPokemon = filteredPokemon.filter(pokemon => {
            const pokemonTypes = pokemon.types.map(type => type.type.name);
            return activeTypeFilters.some(type => pokemonTypes.includes(type));
        });
    }

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

    displayFilteredPokemon(filteredPokemon);
}

function displayFilteredPokemon(filteredPokemon) {
    pokemonGrid.innerHTML = '';

    filteredPokemon.forEach(pokemon => {
        createPokemonCard(pokemon);
    });

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

        let fetchedPokemonData;
        switch (gen) {
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

        activeTypeFilters = [];
        document.querySelectorAll('.type-filter').forEach(btn => btn.classList.remove('active'));
        searchInput.value = '';

        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.sort === 'id') btn.classList.add('active');
        });
        currentSortMethod = 'id';

        document.querySelectorAll('.direction-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.direction === 'asc') btn.classList.add('active');
        });
        sortDirection = 'asc';

        pokemonData.forEach(data => createPokemonCard(data));

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
        applyFilters();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPokemonByGen("1");

    setupFilterToggle();
    setupTypeFilters();
    setupSortButtons();
    setupSearchInput();
    setupGameModes();

    document.getElementById('whosThatPokemon').addEventListener('click', startWhosThatPokemon);
    document.getElementById('startPokepalabra').addEventListener('click', startPokepalabra);

    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            mainNav.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!mainNav.contains(e.target) && !menuToggle.contains(e.target) && mainNav.classList.contains('active')) {
                menuToggle.classList.remove('active');
                mainNav.classList.remove('active');
            }
        });

        mainNav.querySelectorAll('button').forEach(btn => {
            if (btn.id !== 'filterToggle') {
                btn.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        menuToggle.classList.remove('active');
                        mainNav.classList.remove('active');
                    }
                });
            }
        });
    }

    const toggleModalScrollLock = (isOpen) => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
    };

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                const isVisible = mutation.target.style.display === 'block';
                toggleModalScrollLock(isVisible);
            }
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
    });
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
            hideLoading();
            isLoading = false;
            return;
        }

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
let currentGameMode = 'visual';

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
            hideLoading();
            isLoading = false;
            return;
        }
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
} async function startWhosThatPokemon() {
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

    if (currentGameMode === 'visual') {
        mysteryPokemon.style.display = 'block';
        mysteryPokemon.classList.add('silhouette');
        document.getElementById('audioPlaceholder').style.display = 'none';
    } else {
        mysteryPokemon.style.display = 'none';
        const audioPlaceholder = document.getElementById('audioPlaceholder');
        audioPlaceholder.style.display = 'flex';
        audioPlaceholder.innerHTML = '<i class="fa-solid fa-volume-high game-audio-icon"></i>';
        document.getElementById('audioPlaceholder').classList.remove('playing');
    }

    const correctPokemon = allPokemonData[Math.floor(Math.random() * allPokemonData.length)];
    const options = [correctPokemon.name];

    while (options.length < 4) {
        const randomPokemon = allPokemonData[Math.floor(Math.random() * allPokemonData.length)].name;
        if (!options.includes(randomPokemon)) {
            options.push(randomPokemon);
        }
    }

    const shuffledOptions = options.sort(() => Math.random() - 0.5);

    mysteryPokemon.src = correctPokemon.sprites.other['official-artwork'].front_default;

    if (currentGameMode === 'audio') {
        playGameCry(correctPokemon);
    }

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

    if (currentGameMode === 'audio') {
        mysteryPokemon.style.display = 'block';
        document.getElementById('audioPlaceholder').style.display = 'none';

        const audio = document.getElementById('pokemonCry');
        audio.pause();
        audio.currentTime = 0;
    }

    mysteryPokemon.classList.remove('silhouette');
    answerButtons.forEach(btn => btn.disabled = true);

    if (selected === correct) {
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

function playGameCry(pokemon) {
    const audio = document.getElementById('pokemonCry');
    const audioPlaceholder = document.getElementById('audioPlaceholder');
    const name = pokemon.name.toLowerCase();
    audio.src = `https://play.pokemonshowdown.com/audio/cries/${name}.mp3`;
    audio.volume = 0.5;

    audioPlaceholder.classList.add('playing');

    audio.play().catch(e => console.error("Error playing cry", e));

    audio.onended = () => {
        audioPlaceholder.classList.remove('playing');
    };
}

function setupGameModes() {
    const visualBtn = document.getElementById('visualModeBtn');
    const audioBtn = document.getElementById('audioModeBtn');

    if (!visualBtn || !audioBtn) return;

    visualBtn.addEventListener('click', () => {
        if (currentGameMode === 'visual') return;
        currentGameMode = 'visual';
        visualBtn.classList.add('active');
        audioBtn.classList.remove('active');
        if (document.getElementById('gameModal').style.display === 'block') {
            gameScore = 0;
            updateScore();
            showNextPokemon();
        }
    });

    audioBtn.addEventListener('click', () => {
        if (currentGameMode === 'audio') return;
        currentGameMode = 'audio';
        audioBtn.classList.add('active');
        visualBtn.classList.remove('active');
        if (document.getElementById('gameModal').style.display === 'block') {
            gameScore = 0;
            updateScore();
            showNextPokemon();
        }
    });

    const placeholder = document.getElementById('audioPlaceholder');
    if (placeholder) {
        placeholder.addEventListener('click', () => {
            const audio = document.getElementById('pokemonCry');
            if (audio.src) {
                placeholder.classList.add('playing');
                audio.play().catch(e => console.error(e));
            }
        });
    }
}

async function fetchEvolutionChain(pokemonId) {
    try {
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`);
        const speciesData = await speciesResponse.json();

        const evolutionResponse = await fetch(speciesData.evolution_chain.url);
        const evolutionData = await evolutionResponse.json();

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
    const pokemon = chain.species;
    const pokemonName = pokemon.name;

    let evolutionDetails = '';
    if (chain.evolution_details && chain.evolution_details.length > 0) {
        const details = chain.evolution_details[0];
        evolutionDetails = getEvolutionDetails(details);
    }

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

    if (chain.evolves_to && chain.evolves_to.length > 0) {
        if (chain.evolves_to.length === 1) {
            html += createEvolutionHTML(chain.evolves_to[0], level + 1);
        }
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

function getPokemonIdFromName(name) {
    for (const gen in genRanges) {
        const { start, end } = genRanges[gen];
        for (let i = start; i <= end; i++) {
            const pokemon = pokemonData.find(p => p.id === i);
            if (pokemon && pokemon.name === name) {
                return i;
            }
        }
    }
    return 1;
}

async function fetchPokemonHabitat(pokemonId) {
    try {
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`);
        const speciesData = await speciesResponse.json();
        displayHabitatInfo(speciesData);

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

function displayHabitatInfo(speciesData) {
    const habitatContainer = document.getElementById('pokemonHabitat');

    if (!speciesData.habitat) {
        habitatContainer.innerHTML = `
            <div class="no-habitat">
                No hay información de hábitat disponible para este Pokémon.
            </div>
        `;
        return;
    }

    const habitatName = speciesData.habitat.name;

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

    createHabitatMap(habitatName);
}

function createHabitatMap(habitatName) {
    const mapContainer = document.getElementById('mapContainer');

    mapContainer.innerHTML = '';

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

    mapContainer.style.backgroundColor = mapColor;
    mapContainer.style.backgroundImage = mapBackgrounds[habitatName] || 'none';
    mapContainer.style.backgroundSize = '64px';
    mapContainer.style.backgroundPosition = 'center';
    mapContainer.style.backgroundRepeat = 'no-repeat';

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

        regionElement.addEventListener('click', () => {
            document.querySelectorAll('.map-region').forEach(el => el.classList.remove('active'));
            regionElement.classList.add('active');

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

    const locationsByRegion = {};

    locationData.forEach(location => {
        const locationName = location.location_area.name.replace(/-/g, ' ');
        const regionName = getRegionFromLocation(locationName);

        if (!locationsByRegion[regionName]) {
            locationsByRegion[regionName] = [];
        }

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

    window.pokemonLocationData = locationsByRegion;

    displayAllLocations();
}

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

    for (const region in locationData) {
        const locations = locationData[region];

        locationsHTML += `
            <div class="region-header">${region}</div>
        `;

        locations.forEach(location => {
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

function filterLocationsByRegion(regionName) {
    const locationList = document.getElementById('locationList');
    const locationData = window.pokemonLocationData;

    if (!locationData) {
        return;
    }

    if (regionName === 'All') {
        displayAllLocations();
        return;
    }
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

    filteredLocations.forEach(location => {
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

function getRegionFromLocation(locationName) {
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

    for (const prefix in regionMappings) {
        if (locationName.toLowerCase().includes(prefix)) {
            return regionMappings[prefix];
        }
    }

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

    return 'Other';
}

function capitalizeFirstLetter(string) {
    return string.split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

function showPokemonDetails(pokemon) {
    const pokemonDetails = document.getElementById('pokemon-details');

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

        const percentage = Math.min(100, Math.round((statValue / 255) * 100));

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

    const heightValue = (pokemon.height / 10).toFixed(1);
    const weightValue = (pokemon.weight / 10).toFixed(1);

    const heightPercentage = Math.min(100, Math.round((heightValue / 4) * 100));
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
            <div class="name-container" style="display: flex; align-items: center; justify-content: center; position: relative;">
                <h2 class="pokemon-name" style="margin: 0; display: inline-block; width: auto;">${pokemon.name}</h2>
                <button class="sound-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; margin-left: 0.5rem;">🔊</button>
            </div>
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

    const spriteImg = document.querySelector('.pokedex-screen .pokemon-sprite');
    spriteImg.src = primarySpriteUrl;
    spriteImg.onerror = function () {
        this.onerror = null;
        this.src = fallbackSpriteUrl;
    };

    modal.style.display = 'block';
    modalContent.classList.add('show');

    setupSoundButton(pokemon.id);

    fetchEvolutionChain(pokemon.id);
}

function createRegionFilter(locationData) {
    const regions = Object.keys(locationData);

    if (regions.length <= 1) {
        return;
    }

    const filterContainer = document.createElement('div');
    filterContainer.className = 'region-filter';

    const allButton = document.createElement('button');
    allButton.className = 'region-filter-btn active';
    allButton.textContent = 'Todas las Regiones';
    allButton.addEventListener('click', () => {
        document.querySelectorAll('.region-filter-btn').forEach(btn => btn.classList.remove('active'));
        allButton.classList.add('active');

        displayAllLocations();

        document.querySelectorAll('.map-region').forEach(region => region.classList.remove('active'));
    });

    filterContainer.appendChild(allButton);
    regions.forEach(region => {
        const regionButton = document.createElement('button');
        regionButton.className = 'region-filter-btn';
        regionButton.textContent = region;
        regionButton.addEventListener('click', () => {
            document.querySelectorAll('.region-filter-btn').forEach(btn => btn.classList.remove('active'));
            regionButton.classList.add('active');

            filterLocationsByRegion(region);
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

    const locationsByRegion = {};

    locationData.forEach(location => {
        const locationName = location.location_area.name.replace(/-/g, ' ');
        const regionName = getRegionFromLocation(locationName);

        if (!locationsByRegion[regionName]) {
            locationsByRegion[regionName] = [];
        }

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

    window.pokemonLocationData = locationsByRegion;

    createRegionFilter(locationsByRegion);

    displayAllLocations();

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

    for (const region in locationData) {
        const locations = locationData[region];

        locationsHTML += `
            <div class="region-header">${region}</div>
        `;

        locations.forEach(location => {
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
    const mapContainer = document.getElementById('mapContainer');

    if (!mapContainer) return;

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

        mapContainer.insertBefore(backgroundImg, mapContainer.firstChild);

        document.querySelectorAll('.map-region').forEach(region => {
            region.style.zIndex = '1';
        });
    }
}

function createHabitatMap(habitatName) {
    const mapContainer = document.getElementById('mapContainer');

    mapContainer.innerHTML = '';

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

    mapContainer.style.backgroundColor = mapColor;

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

        regionElement.addEventListener('click', () => {
            document.querySelectorAll('.map-region').forEach(el => el.classList.remove('active'));
            regionElement.classList.add('active');

            filterLocationsByRegion(region.name);

            document.querySelectorAll('.region-filter-btn').forEach(btn => {
                if (btn.textContent === region.name) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    });

    enhanceHabitatMap(habitatName);
}

function filterLocationsByRegion(regionName) {
    const locationList = document.getElementById('locationList');
    const locationData = window.pokemonLocationData;

    if (!locationData) {
        return;
    }

    if (regionName === 'Todas las Regiones') {
        displayAllLocations();
        return;
    }

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

    filteredLocations.forEach(location => {
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
/* --- Poképalabra Logic --- */

const pokepalabraState = {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''),
    status: {}, // letter -> 'pending' | 'correct' | 'incorrect'
    pendingLetters: [], 
    currentLetter: '',
    score: 0,
    timer: 150,
    timerInterval: null,
    isPlaying: false
};

async function startPokepalabra() {
    if (allPokemonData.length === 0) {
        await fetchAllPokemon();
    }

    // Initialize State
    pokepalabraState.letters.forEach(l => pokepalabraState.status[l] = 'pending');
    pokepalabraState.pendingLetters = [...pokepalabraState.letters];
    pokepalabraState.currentLetter = pokepalabraState.pendingLetters[0];
    pokepalabraState.score = 0;
    pokepalabraState.timer = 150;
    pokepalabraState.isPlaying = true;

    // Reset UI
    document.getElementById('pokepalabraModal').style.display = 'block';
    document.getElementById('pokepalabraEndScreen').style.display = 'none';
    document.getElementById('pokepalabraMessage').textContent = '';
    document.getElementById('pokepalabraMessage').className = 'game-message';
    
    updatePokepalabraStats();
    renderRosco();
    updateCentralInterface();
    
    // Start Timer
    if (pokepalabraState.timerInterval) clearInterval(pokepalabraState.timerInterval);
    pokepalabraState.timerInterval = setInterval(() => {
        pokepalabraState.timer--;
        updatePokepalabraStats();
        if (pokepalabraState.timer <= 0) {
            endPokepalabra();
        }
    }, 1000);

    // Bind Controls
    document.getElementById('submitWordBtn').onclick = submitPokepalabraWord;
    document.getElementById('skipWordBtn').onclick = skipPokepalabraWord;
    document.getElementById('pokepalabraInput').onkeydown = (e) => {
        if (e.key === 'Enter') submitPokepalabraWord();
    };
    document.getElementById('restartPokepalabra').onclick = startPokepalabra; // Correctly re-bind
    
    document.getElementById('pokepalabraInput').focus();
}

function renderRosco() {
    const container = document.getElementById('roscoContainer');
    container.innerHTML = '';
    
    const radius = container.offsetWidth / 2 - 20; // 20px buffer
    const centerX = container.offsetWidth / 2;
    const centerY = container.offsetHeight / 2;
    const total = pokepalabraState.letters.length;
    
    pokepalabraState.letters.forEach((letter, index) => {
        const angle = (index * (360 / total)) - 90; // Start at top (-90deg)
        const rad = angle * (Math.PI / 180);
        
        const x = centerX + radius * Math.cos(rad);
        const y = centerY + radius * Math.sin(rad);
        
        const el = document.createElement('div');
        el.className = `letter-circle ${pokepalabraState.status[letter]}`;
        if (letter === pokepalabraState.currentLetter) el.classList.add('active');
        
        el.style.left = `${x - 17.5}px`; // Center the 35px circle
        el.style.top = `${y - 17.5}px`;
        el.textContent = letter;
        
        container.appendChild(el);
    });
}

function updateCentralInterface() {
    document.getElementById('currentLetterIndicator').textContent = pokepalabraState.currentLetter;
    document.getElementById('questionText').textContent = `Empieza por ${pokepalabraState.currentLetter}...`;
    const input = document.getElementById('pokepalabraInput');
    input.value = '';
    input.focus();
}

function updatePokepalabraStats() {
    document.getElementById('pokepalabraScore').textContent = pokepalabraState.score;
    document.getElementById('pokepalabraTimer').textContent = pokepalabraState.timer;
}

function submitPokepalabraWord() {
    if (!pokepalabraState.isPlaying) return;
    
    const input = document.getElementById('pokepalabraInput').value.trim().toLowerCase();
    const currentLetter = pokepalabraState.currentLetter.toLowerCase();
    
    if (!input) return;
    
    // Validation Logic
    // 1. Starts with correct letter?
    // Note: Some Nidoran names start with 'n', so logic handles normalized names mostly.
    // We should simplify: Check if input starts with the letter.
    // Exception: If letter is 'XYZ', might check 'Contains'? No, standard Pasapalabra is 'Empieza', unless specified 'Contiene'.
    // For Pokemon, nearly all letters have starts. Maybe X/Y/Z are scarce depending on Generation.
    // X: Xatu, Xerneas. Y: Yanma. Z: Zubat.
    // So 'Starts with' is fine for all A-Z.
    
    if (!input.startsWith(currentLetter)) {
        showMessage('¡Debe empezar por ' + currentLetter.toUpperCase() + '!', 'wrong');
        return;
    }
    
    // 2. Is it a Pokémon?
    const isValidPokemon = allPokemonData.some(p => p.name.toLowerCase() === input);
    
    if (isValidPokemon) {
        pokepalabraState.status[pokepalabraState.currentLetter] = 'correct';
        pokepalabraState.score += 1;
        showMessage('¡Correcto!', 'correct');
    } else {
        pokepalabraState.status[pokepalabraState.currentLetter] = 'incorrect';
        showMessage('¡Incorrecto! No es un Pokémon válido.', 'wrong');
    }
    
    advanceTurn();
}

function skipPokepalabraWord() {
    if (!pokepalabraState.isPlaying) return;
    // Leave status as pending, move letter to end of queue if desired, or just cycle.
    // Standard Pasapalabra: Moves to next, comes back later.
    // We iterate through 'letters'. We need a way to track the queue.
    // Implementation: We look for the NEXT pending letter in the alphabet wrapper.
    showMessage('Pasapalabra', '');
    advanceTurn(true);
}

function advanceTurn(skipped = false) {
    if (!skipped) {
        // If answered (right or wrong), remove from pending
        const idx = pokepalabraState.pendingLetters.indexOf(pokepalabraState.currentLetter);
        if (idx > -1) pokepalabraState.pendingLetters.splice(idx, 1);
    } else {
        // If skipped, move current to back of queue? 
        // Or just search for next pending cyclically.
        // Let's just rotate the pending list?
        // Actually, we use 'pendingLetters' as the Queue.
        // If skipped, we shift() and push().
        // If answered, we shift().
        // Wait, 'pendingLetters' order needs to be maintained A-Z for the first run?
        // Pasapalabra goes A->B->...->Z -> A(pending)...
        // So we just find the Next letter in the alphabetic list that is 'pending'.
    }
    
    // Logic to find next letter
    // We need to know the current index in the FULL alphabet to find the next one.
    const fullIdx = pokepalabraState.letters.indexOf(pokepalabraState.currentLetter);
    let nextIdx = (fullIdx + 1) % pokepalabraState.letters.length;
    
    // Find next pending
    let loops = 0;
    while (pokepalabraState.status[pokepalabraState.letters[nextIdx]] !== 'pending' && loops < 26) {
        nextIdx = (nextIdx + 1) % pokepalabraState.letters.length;
        loops++;
    }
    
    if (loops === 26) {
        // No pending letters left
        endPokepalabra();
    } else {
        pokepalabraState.currentLetter = pokepalabraState.letters[nextIdx];
        renderRosco();
        updateCentralInterface();
    }
}

function showMessage(text, type) {
    const msg = document.getElementById('pokepalabraMessage');
    msg.textContent = text;
    msg.className = 'game-message ' + type;
    setTimeout(() => {
        msg.textContent = '';
        msg.className = 'game-message';
    }, 1500);
}

function endPokepalabra() {
    pokepalabraState.isPlaying = false;
    clearInterval(pokepalabraState.timerInterval);
    
    const correct = Object.values(pokepalabraState.status).filter(s => s === 'correct').length;
    const wrong = Object.values(pokepalabraState.status).filter(s => s === 'incorrect').length;
    
    document.getElementById('finalCorrect').textContent = correct;
    document.getElementById('finalWrong').textContent = wrong;
    document.getElementById('pokepalabraEndScreen').style.display = 'block';
}

// Window resize handling for Rosco (optional but good)
window.addEventListener('resize', () => {
    if (document.getElementById('pokepalabraModal').style.display === 'block') {
        renderRosco();
    }
});
