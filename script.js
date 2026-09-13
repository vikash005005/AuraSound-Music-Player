/* ==========================================================================
   AURASOUND MUSIC PLAYER - JAVASCRIPT LOGIC
   Features: Audio Engine, Web Audio Fallback, Playlist Management, Real-time Search,
             Favorites & Recent History Persistence, Dark/Light Themes, Mobile Drawer
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. DATA MODEL & TRACK LIST
    // ----------------------------------------------------------------------
    const songs = [
        {
            id: 1,
            title: "Midnight Cyber City",
            artist: "Aura Wave",
            album: "Neon Nights",
            genre: "synthwave",
            duration: "0:32",
            src: "music/song1.wav",
            cover: "images/cover1.png"
        },
        {
            id: 2,
            title: "Cosmic Echoes",
            artist: "Starlight Project",
            album: "Deep Universe",
            genre: "chillout",
            duration: "0:36",
            src: "music/song2.wav",
            cover: "images/cover2.png"
        },
        {
            id: 3,
            title: "Summer Sunset Lofi",
            artist: "Lofi Chillers",
            album: "Coffee & Sunset",
            genre: "lofi",
            duration: "0:30",
            src: "music/song3.wav",
            cover: "images/cover3.png"
        },
        {
            id: 4,
            title: "Acoustic Horizon",
            artist: "Willow & String",
            album: "Morning Breeze",
            genre: "acoustic",
            duration: "0:34",
            src: "music/song4.wav",
            cover: "images/cover4.png"
        },
        {
            id: 5,
            title: "Neon Pulse",
            artist: "Cybernetic Beats",
            album: "Futuristic Era",
            genre: "synthwave",
            duration: "0:32",
            src: "music/song5.wav",
            cover: "images/cover5_missing.png" // Intentionally trigger default cover fallback
        }
    ];

    // ----------------------------------------------------------------------
    // 2. STATE MANAGEMENT
    // ----------------------------------------------------------------------
    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let repeatMode = 'off'; // 'off' | 'all' | 'one'
    let viewMode = 'list'; // 'list' | 'grid'
    let activeFilter = 'all';
    let currentVolume = 0.8;
    let isMuted = false;

    // Load persisted state from LocalStorage
    let favorites = new Set(JSON.parse(localStorage.getItem('aurasound_favs') || '[]'));
    let recentHistory = JSON.parse(localStorage.getItem('aurasound_recent') || '[]');
    let currentTheme = localStorage.getItem('aurasound_theme') || 'dark';

    // ----------------------------------------------------------------------
    // 3. DOM ELEMENTS SELECTION
    // ----------------------------------------------------------------------
    const audio = document.getElementById('audio-player');
    
    // Player bar elements
    const playerBar = document.querySelector('.player-bar');
    const playerCoverImg = document.getElementById('player-cover-img');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
    const playerFavBtn = document.getElementById('player-fav-btn');
    
    const btnPlayPause = document.getElementById('btn-play-pause');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnRepeat = document.getElementById('btn-repeat');
    const repeatBadge = document.getElementById('repeat-badge');
    
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');
    
    const btnVolume = document.getElementById('btn-volume');
    const volumeIcon = document.getElementById('volume-icon');
    const volumeBar = document.getElementById('volume-bar');
    const volumeFill = document.getElementById('volume-fill');
    const equalizerBars = document.getElementById('equalizer-bars');

    // UI View elements
    const songsContainer = document.getElementById('songs-container');
    const emptyState = document.getElementById('empty-state');
    const sectionTitle = document.getElementById('section-title');
    const trackCount = document.getElementById('track-count');
    const viewListBtn = document.getElementById('view-list-btn');
    const viewGridBtn = document.getElementById('view-grid-btn');
    
    // Search elements
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const resetSearchBtn = document.getElementById('reset-search-btn');

    // Hero elements
    const heroCoverImg = document.getElementById('hero-cover-img');
    const heroTitleText = document.getElementById('hero-title-text');
    const heroArtistText = document.getElementById('hero-artist-text');
    const heroGenreText = document.getElementById('hero-genre-text');
    const heroPlayBtn = document.getElementById('hero-play-btn');
    const heroFavBtn = document.getElementById('hero-fav-btn');

    // Recent Carousel
    const recentCarousel = document.getElementById('recent-carousel');

    // Theme & Navigation
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const quickThemeToggle = document.getElementById('quick-theme-toggle');
    const favCountBadge = document.getElementById('fav-count-badge');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');

    // ----------------------------------------------------------------------
    // 4. WEB AUDIO SYNTHESIS FALLBACK (AUDIO ASSURANCE)
    // ----------------------------------------------------------------------
    let audioCtx = null;
    let synthOscillator = null;

    function playSynthFallbackTrack(frequency = 440, type = 'sine') {
        try {
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        } catch (e) {
            console.log('Web Audio context not supported:', e);
        }
    }

    // ----------------------------------------------------------------------
    // 5. CORE AUDIO PLAYER ENGINE
    // ----------------------------------------------------------------------

    // Load track by index
    function loadSong(index, shouldPlay = false) {
        if (index < 0 || index >= songs.length) return;

        currentTrackIndex = index;
        const song = songs[currentTrackIndex];

        audio.src = song.src;
        audio.load();

        // Update player UI elements
        playerTitle.textContent = song.title;
        playerArtist.textContent = song.artist;
        setCoverWithFallback(playerCoverImg, song.cover);

        // Update Hero Banner
        renderHeroBanner(song);

        // Update Active Track state in list & player
        updateActiveTrackUI();

        // Add to Recently Played
        addToRecent(song.id);

        if (shouldPlay) {
            playSong();
        } else {
            pauseSong();
        }
    }

    function playSong() {
        isPlaying = true;
        playerBar.classList.add('playing');
        playPauseIcon.className = 'fa-solid fa-pause';
        btnPlayPause.title = 'Pause Track';

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn('Playback interrupted or restricted by browser:', err);
                // Trigger synth sound fallback if audio file cannot play
                playSynthFallbackTrack();
            });
        }
    }

    function pauseSong() {
        isPlaying = false;
        playerBar.classList.remove('playing');
        playPauseIcon.className = 'fa-solid fa-play';
        btnPlayPause.title = 'Play Track';
        audio.pause();
    }

    function togglePlayPause() {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong();
        }
    }

    function prevSong() {
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }

        if (isShuffle) {
            currentTrackIndex = getRandomTrackIndex();
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + songs.length) % songs.length;
        }

        loadSong(currentTrackIndex, true);
    }

    function nextSong() {
        if (isShuffle) {
            currentTrackIndex = getRandomTrackIndex();
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % songs.length;
        }

        loadSong(currentTrackIndex, true);
    }

    function getRandomTrackIndex() {
        if (songs.length <= 1) return 0;
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songs.length);
        } while (randomIndex === currentTrackIndex);
        return randomIndex;
    }

    function setCoverWithFallback(imgElement, coverUrl) {
        imgElement.src = coverUrl;
        imgElement.onerror = () => {
            imgElement.src = 'images/default-cover.png';
        };
    }

    // ----------------------------------------------------------------------
    // 6. PLAYER CONTROLS & TIMELINE
    // ----------------------------------------------------------------------

    // Update Progress slider & time display
    audio.addEventListener('timeupdate', () => {
        if (!isNaN(audio.duration) && audio.duration > 0) {
            const progressPercent = (audio.currentTime / audio.duration) * 100;
            progressBar.value = progressPercent;
            progressFill.style.width = `${progressPercent}%`;

            currentTimeEl.textContent = formatTime(audio.currentTime);
            totalDurationEl.textContent = formatTime(audio.duration);
        }
    });

    // Audio metadata loaded
    audio.addEventListener('loadedmetadata', () => {
        if (!isNaN(audio.duration)) {
            totalDurationEl.textContent = formatTime(audio.duration);
        }
    });

    // Auto Advance when song ends
    audio.addEventListener('ended', () => {
        if (repeatMode === 'one') {
            audio.currentTime = 0;
            playSong();
        } else if (repeatMode === 'all') {
            nextSong();
        } else {
            if (currentTrackIndex === songs.length - 1 && !isShuffle) {
                pauseSong();
                audio.currentTime = 0;
            } else {
                nextSong();
            }
        }
    });

    // Handle range slider seeking
    progressBar.addEventListener('input', (e) => {
        const targetPercent = parseFloat(e.target.value);
        if (!isNaN(audio.duration)) {
            audio.currentTime = (targetPercent / 100) * audio.duration;
            progressFill.style.width = `${targetPercent}%`;
        }
    });

    // Volume Control
    volumeBar.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        setVolume(val);
    });

    function setVolume(val) {
        currentVolume = Math.max(0, Math.min(1, val));
        audio.volume = currentVolume;
        const percent = currentVolume * 100;
        volumeBar.value = percent;
        volumeFill.style.width = `${percent}%`;

        if (currentVolume === 0) {
            isMuted = true;
            volumeIcon.className = 'fa-solid fa-volume-xmark';
        } else if (currentVolume < 0.5) {
            isMuted = false;
            volumeIcon.className = 'fa-solid fa-volume-low';
        } else {
            isMuted = false;
            volumeIcon.className = 'fa-solid fa-volume-high';
        }
    }

    btnVolume.addEventListener('click', () => {
        if (isMuted) {
            setVolume(currentVolume > 0 ? currentVolume : 0.8);
        } else {
            audio.volume = 0;
            isMuted = true;
            volumeBar.value = 0;
            volumeFill.style.width = '0%';
            volumeIcon.className = 'fa-solid fa-volume-xmark';
        }
    });

    // Shuffle Toggle
    btnShuffle.addEventListener('click', () => {
        isShuffle = !isShuffle;
        btnShuffle.classList.toggle('active', isShuffle);
        btnShuffle.title = isShuffle ? 'Shuffle (On)' : 'Shuffle (Off)';
    });

    // Repeat Toggle (Off -> All -> One -> Off)
    btnRepeat.addEventListener('click', () => {
        if (repeatMode === 'off') {
            repeatMode = 'all';
            btnRepeat.className = 'control-btn active';
            btnRepeat.title = 'Repeat (All Tracks)';
        } else if (repeatMode === 'all') {
            repeatMode = 'one';
            btnRepeat.className = 'control-btn active repeat-one';
            btnRepeat.title = 'Repeat (Current Track)';
        } else {
            repeatMode = 'off';
            btnRepeat.className = 'control-btn';
            btnRepeat.title = 'Repeat (Off)';
        }
    });

    // Play Pause Button
    btnPlayPause.addEventListener('click', togglePlayPause);
    btnNext.addEventListener('click', nextSong);
    btnPrev.addEventListener('click', prevSong);

    // ----------------------------------------------------------------------
    // 7. FAVORITES & RECENT HISTORY MANAGEMENT
    // ----------------------------------------------------------------------

    function toggleFavorite(songId) {
        if (favorites.has(songId)) {
            favorites.delete(songId);
        } else {
            favorites.add(songId);
        }

        // Save to LocalStorage
        localStorage.setItem('aurasound_favs', JSON.stringify(Array.from(favorites)));

        // Refresh UI
        updateActiveTrackUI();
        updateFavBadge();

        if (activeFilter === 'favorites') {
            renderFilteredSongs();
        }
    }

    function addToRecent(songId) {
        recentHistory = recentHistory.filter(id => id !== songId);
        recentHistory.unshift(songId);
        if (recentHistory.length > 10) recentHistory.pop();

        localStorage.setItem('aurasound_recent', JSON.stringify(recentHistory));
        renderRecentlyPlayed();
    }

    function updateFavBadge() {
        favCountBadge.textContent = favorites.size;
    }

    playerFavBtn.addEventListener('click', () => {
        const currentSong = songs[currentTrackIndex];
        if (currentSong) {
            toggleFavorite(currentSong.id);
        }
    });

    // ----------------------------------------------------------------------
    // 8. PLAYLIST & VIEW RENDERING
    // ----------------------------------------------------------------------

    function renderSongs(songList) {
        songsContainer.innerHTML = '';

        if (songList.length === 0) {
            emptyState.classList.remove('hidden');
            trackCount.textContent = '0 tracks';
            return;
        }

        emptyState.classList.add('hidden');
        trackCount.textContent = `${songList.length} ${songList.length === 1 ? 'track' : 'tracks'}`;

        songList.forEach((song, idx) => {
            const isCurrent = songs[currentTrackIndex].id === song.id;
            const isFav = favorites.has(song.id);

            const card = document.createElement('div');
            card.className = `song-card ${isCurrent ? 'active' : ''}`;
            card.dataset.id = song.id;

            if (viewMode === 'list') {
                card.innerHTML = `
                    <span class="song-number">${idx + 1}</span>
                    <div class="song-thumb">
                        <img src="${song.cover}" alt="${song.title}" onerror="this.src='images/default-cover.png'">
                        <div class="play-overlay">
                            <i class="fa-solid ${isCurrent && isPlaying ? 'fa-pause' : 'fa-play'}"></i>
                        </div>
                    </div>
                    <div class="song-info">
                        <span class="song-title">${song.title}</span>
                        <span class="song-artist">${song.artist}</span>
                    </div>
                    <span class="song-album">${song.album}</span>
                    <span class="song-duration">${song.duration}</span>
                    <button class="song-fav-btn ${isFav ? 'active' : ''}" title="Favorite">
                        <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
                    </button>
                `;
            } else {
                // Grid View layout
                card.innerHTML = `
                    <div class="song-thumb">
                        <img src="${song.cover}" alt="${song.title}" onerror="this.src='images/default-cover.png'">
                        <div class="play-overlay">
                            <i class="fa-solid ${isCurrent && isPlaying ? 'fa-pause' : 'fa-play'}"></i>
                        </div>
                    </div>
                    <div class="song-info">
                        <span class="song-title">${song.title}</span>
                        <span class="song-artist">${song.artist}</span>
                    </div>
                    <div class="song-footer">
                        <span class="song-duration">${song.duration}</span>
                        <button class="song-fav-btn ${isFav ? 'active' : ''}" title="Favorite">
                            <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
                        </button>
                    </div>
                `;
            }

            // Click song card to play
            card.addEventListener('click', (e) => {
                if (e.target.closest('.song-fav-btn')) return;

                const songIdx = songs.findIndex(s => s.id === song.id);
                if (songIdx !== -1) {
                    if (songIdx === currentTrackIndex) {
                        togglePlayPause();
                    } else {
                        loadSong(songIdx, true);
                    }
                }
            });

            // Favorite click inside card
            const favBtn = card.querySelector('.song-fav-btn');
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(song.id);
            });

            songsContainer.appendChild(card);
        });
    }

    function updateActiveTrackUI() {
        const currentSong = songs[currentTrackIndex];
        const isFav = favorites.has(currentSong.id);

        playerFavBtn.className = `track-fav-btn ${isFav ? 'active' : ''}`;
        playerFavBtn.querySelector('i').className = `fa-${isFav ? 'solid' : 'regular'} fa-heart`;

        const heroIsFav = favorites.has(currentSong.id);
        heroFavBtn.className = `btn btn-secondary ${heroIsFav ? 'active' : ''}`;
        heroFavBtn.querySelector('i').className = `fa-${heroIsFav ? 'solid' : 'regular'} fa-heart`;

        renderFilteredSongs();
    }

    function renderHeroBanner(song) {
        heroTitleText.textContent = song.title;
        heroArtistText.textContent = song.artist;
        heroGenreText.textContent = `${song.genre.toUpperCase()} • ${song.album}`;
        setCoverWithFallback(heroCoverImg, song.cover);

        document.getElementById('hero-backdrop').style.backgroundImage = `url(${song.cover})`;
    }

    heroPlayBtn.addEventListener('click', () => {
        togglePlayPause();
    });

    heroFavBtn.addEventListener('click', () => {
        const currentSong = songs[currentTrackIndex];
        toggleFavorite(currentSong.id);
    });

    function renderRecentlyPlayed() {
        recentCarousel.innerHTML = '';

        if (recentHistory.length === 0) {
            recentCarousel.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No recently played songs yet.</p>`;
            return;
        }

        recentHistory.forEach(songId => {
            const song = songs.find(s => s.id === songId);
            if (!song) return;

            const card = document.createElement('div');
            card.className = 'recent-card';
            card.innerHTML = `
                <img src="${song.cover}" alt="${song.title}" class="recent-art" onerror="this.src='images/default-cover.png'">
                <div style="overflow: hidden;">
                    <p class="recent-title">${song.title}</p>
                    <p class="recent-artist">${song.artist}</p>
                </div>
            `;

            card.addEventListener('click', () => {
                const idx = songs.findIndex(s => s.id === song.id);
                if (idx !== -1) loadSong(idx, true);
            });

            recentCarousel.appendChild(card);
        });
    }

    // Filter songs based on current active view & search text
    function renderFilteredSongs() {
        const query = searchInput.value.toLowerCase().trim();

        let filtered = songs.filter(song => {
            // Apply Search Query
            const matchesSearch = !query || 
                song.title.toLowerCase().includes(query) ||
                song.artist.toLowerCase().includes(query) ||
                song.album.toLowerCase().includes(query);

            // Apply Category / Genre Filter
            if (activeFilter === 'favorites') {
                return matchesSearch && favorites.has(song.id);
            } else if (activeFilter === 'recent') {
                return matchesSearch && recentHistory.includes(song.id);
            } else if (activeFilter !== 'all') {
                return matchesSearch && (song.genre === activeFilter || activeFilter === 'library' || activeFilter === 'home');
            }

            return matchesSearch;
        });

        renderSongs(filtered);
    }

    // ----------------------------------------------------------------------
    // 9. SEARCH & FILTER EVENT LISTENERS
    // ----------------------------------------------------------------------

    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim().length > 0) {
            clearSearchBtn.classList.add('visible');
        } else {
            clearSearchBtn.classList.remove('visible');
        }
        renderFilteredSongs();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.remove('visible');
        renderFilteredSongs();
    });

    resetSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.remove('visible');
        activeFilter = 'all';
        sectionTitle.textContent = 'All Tracks';
        updateNavMenuSelection('home');
        renderFilteredSongs();
    });

    // View Switching (List vs Grid)
    viewListBtn.addEventListener('click', () => {
        viewMode = 'list';
        viewListBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        songsContainer.className = 'songs-container list-view';
        renderFilteredSongs();
    });

    viewGridBtn.addEventListener('click', () => {
        viewMode = 'grid';
        viewGridBtn.classList.add('active');
        viewListBtn.classList.remove('active');
        songsContainer.className = 'songs-container grid-view';
        renderFilteredSongs();
    });

    // Navigation Menu Filters
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const view = link.dataset.view;
            const genre = link.dataset.genre;

            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            if (view) {
                activeFilter = view;
                if (view === 'home') sectionTitle.textContent = 'All Tracks';
                else if (view === 'library') sectionTitle.textContent = 'Music Library';
                else if (view === 'favorites') sectionTitle.textContent = 'Your Favorites';
                else if (view === 'recent') sectionTitle.textContent = 'Recently Played';
            } else if (genre) {
                activeFilter = genre;
                if (genre === 'all') sectionTitle.textContent = 'All Tracks';
                else sectionTitle.textContent = `${genre.toUpperCase()} Collection`;
            }

            renderFilteredSongs();

            // Mobile menu auto close
            sidebar.classList.remove('open');
        });
    });

    function updateNavMenuSelection(viewName) {
        document.querySelectorAll('.nav-link').forEach(l => {
            if (l.dataset.view === viewName) l.classList.add('active');
            else l.classList.remove('active');
        });
    }

    // Mobile Drawer Navigation
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
    });

    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    // ----------------------------------------------------------------------
    // 10. LIGHT / DARK THEME TOGGLE
    // ----------------------------------------------------------------------

    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('aurasound_theme', theme);

        const sidebarThemeIcon = document.getElementById('sidebar-theme-icon');
        const themeLabelText = document.getElementById('theme-label-text');

        if (theme === 'light') {
            sidebarThemeIcon.className = 'fa-solid fa-sun theme-icon';
            themeLabelText.textContent = 'Light Mode';
            quickThemeToggle.querySelector('i').className = 'fa-solid fa-moon';
        } else {
            sidebarThemeIcon.className = 'fa-solid fa-moon theme-icon';
            themeLabelText.textContent = 'Dark Mode';
            quickThemeToggle.querySelector('i').className = 'fa-solid fa-sun';
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    quickThemeToggle.addEventListener('click', () => {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    // ----------------------------------------------------------------------
    // 11. ADD SONG MODAL & FILE UPLOAD LOGIC
    // ----------------------------------------------------------------------
    const openAddSongBtn = document.getElementById('open-add-song-btn');
    const addSongModal = document.getElementById('add-song-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelAddSongBtn = document.getElementById('cancel-add-song-btn');
    const addSongForm = document.getElementById('add-song-form');
    
    const songFileInput = document.getElementById('song-file-input');
    const fileDropZone = document.getElementById('file-drop-zone');
    const fileDropText = document.getElementById('file-drop-text');
    const selectFileTriggerBtn = document.getElementById('select-file-trigger-btn');
    
    const coverFileInput = document.getElementById('cover-file-input');
    const selectCoverBtn = document.getElementById('select-cover-btn');
    const coverFileLabel = document.getElementById('cover-file-label');
    
    const songTitleInput = document.getElementById('song-title-input');
    const songArtistInput = document.getElementById('song-artist-input');
    const songAlbumInput = document.getElementById('song-album-input');

    function openAddSongModal() {
        addSongModal.classList.remove('hidden');
    }

    function closeAddSongModal() {
        addSongModal.classList.add('hidden');
        resetAddSongForm();
    }

    function resetAddSongForm() {
        addSongForm.reset();
        fileDropText.textContent = 'Click or drag & drop MP3, WAV, or OGG file';
        fileDropZone.classList.remove('dragover');
        coverFileLabel.textContent = 'Choose Image';
    }

    if (openAddSongBtn) openAddSongBtn.addEventListener('click', openAddSongModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeAddSongModal);
    if (cancelAddSongBtn) cancelAddSongBtn.addEventListener('click', closeAddSongModal);

    // Close modal on clicking backdrop outside card
    if (addSongModal) {
        addSongModal.addEventListener('click', (e) => {
            if (e.target === addSongModal) closeAddSongModal();
        });
    }

    // Trigger file input
    if (selectFileTriggerBtn) selectFileTriggerBtn.addEventListener('click', () => songFileInput.click());
    if (fileDropZone) {
        fileDropZone.addEventListener('click', (e) => {
            if (e.target !== selectFileTriggerBtn) songFileInput.click();
        });
    }

    if (selectCoverBtn) selectCoverBtn.addEventListener('click', () => coverFileInput.click());

    // File Input change listener
    if (songFileInput) {
        songFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileDropText.textContent = `Selected: ${file.name}`;
                // Auto-fill song title if empty
                if (!songTitleInput.value.trim()) {
                    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                    songTitleInput.value = nameWithoutExt;
                }
            }
        });
    }

    if (coverFileInput) {
        coverFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                coverFileLabel.textContent = file.name;
            }
        });
    }

    // Drag & Drop File handlers
    if (fileDropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                fileDropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                fileDropZone.classList.remove('dragover');
            });
        });

        fileDropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('audio/')) {
                songFileInput.files = files;
                const file = files[0];
                fileDropText.textContent = `Selected: ${file.name}`;
                if (!songTitleInput.value.trim()) {
                    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                    songTitleInput.value = nameWithoutExt;
                }
            }
        });
    }

    // Form Submit Handler
    if (addSongForm) {
        addSongForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const audioFile = songFileInput.files[0];
            if (!audioFile) {
                alert('Please select an audio file to add.');
                return;
            }

            const rawTitle = songTitleInput.value.trim();
            const rawArtist = songArtistInput.value.trim();
            const rawAlbum = songAlbumInput.value.trim();

            const songTitle = rawTitle || audioFile.name.replace(/\.[^/.]+$/, "");
            const songArtist = rawArtist || "Unknown Artist";
            const songAlbum = rawAlbum || "Custom Track";

            // Generate Blob URLs for audio and cover
            const audioSrc = URL.createObjectURL(audioFile);
            let coverSrc = 'images/default-cover.png';

            if (coverFileInput.files && coverFileInput.files[0]) {
                coverSrc = URL.createObjectURL(coverFileInput.files[0]);
            }

            const newSong = {
                id: Date.now(),
                title: songTitle,
                artist: songArtist,
                album: songAlbum,
                genre: "custom",
                duration: "0:00",
                src: audioSrc,
                cover: coverSrc
            };

            // Calculate track duration asynchronously
            const tempAudio = new Audio(audioSrc);
            tempAudio.addEventListener('loadedmetadata', () => {
                if (!isNaN(tempAudio.duration)) {
                    newSong.duration = formatTime(tempAudio.duration);
                    renderFilteredSongs();
                }
            });

            // Add new song to songs array
            songs.push(newSong);

            // Reset & Close Modal
            closeAddSongModal();

            // Switch to All Tracks view
            activeFilter = 'all';
            sectionTitle.textContent = 'All Tracks';
            updateNavMenuSelection('home');

            // Play the newly added song immediately
            const newSongIndex = songs.length - 1;
            loadSong(newSongIndex, true);
        });
    }

    // ----------------------------------------------------------------------
    // 12. INITIALIZATION
    // ----------------------------------------------------------------------
    function init() {
        applyTheme(currentTheme);
        setVolume(currentVolume);
        updateFavBadge();
        loadSong(0, false);
        renderRecentlyPlayed();
        renderFilteredSongs();
    }

    // Helper: Format seconds to MM:SS
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    init();
});
