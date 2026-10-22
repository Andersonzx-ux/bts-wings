class Player {
    constructor() {
        this.audio = document.getElementById('audio-element');
        this.tracks = window.album.tracks;
        this.currentTrackIndex = -1;
        
        this.isPlaying = false;
        this.isShuffle = false;
        this.repeatMode = 0; // 0: no repeat, 1: repeat album, 2: repeat track
        
        // Load preferences from localStorage
        this.loadPreferences();

        this.setupEventListeners();
    }

    loadPreferences() {
        try {
            const vol = localStorage.getItem('wings_volume');
            if (vol !== null) this.audio.volume = parseFloat(vol);
            
            const shuffle = localStorage.getItem('wings_shuffle');
            if (shuffle !== null) this.isShuffle = shuffle === 'true';

            const repeat = localStorage.getItem('wings_repeat');
            if (repeat !== null) this.repeatMode = parseInt(repeat, 10);
        } catch (e) {
            console.warn("localStorage not available");
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('wings_volume', this.audio.volume);
            localStorage.setItem('wings_shuffle', this.isShuffle);
            localStorage.setItem('wings_repeat', this.repeatMode);
        } catch (e) {
            // ignore
        }
    }

    setupEventListeners() {
        // Audio events
        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('error', (e) => this.onError(e));
        this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            if(this.onStateChange) this.onStateChange();
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            if(this.onStateChange) this.onStateChange();
        });
    }

    playTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        
        const track = this.tracks[index];
        if (!track || !track.audio) {
            console.warn(`Audio source not available for track ${index + 1}`);
            // Still update UI for selection
            this.currentTrackIndex = index;
            if(this.onTrackChange) this.onTrackChange(index);
            return;
        }

        this.currentTrackIndex = index;
        
        // Attempt to play
        try {
            this.audio.src = track.audio;
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented or network error: ", error);
                    this.isPlaying = false;
                    if(this.onStateChange) this.onStateChange();
                });
            }
            if(this.onTrackChange) this.onTrackChange(index);
        } catch(e) {
            console.error("Error playing track: ", e);
        }
    }

    togglePlay() {
        if (this.currentTrackIndex === -1 && this.tracks.length > 0) {
            this.playTrack(0);
            return;
        }

        if (this.audio.paused) {
            this.audio.play().catch(e => console.error("Play failed:", e));
        } else {
            this.audio.pause();
        }
    }

    nextTrack() {
        if (this.tracks.length === 0) return;

        if (this.isShuffle) {
            let nextIndex = this.currentTrackIndex;
            while(nextIndex === this.currentTrackIndex && this.tracks.length > 1) {
                nextIndex = Math.floor(Math.random() * this.tracks.length);
            }
            this.playTrack(nextIndex);
            return;
        }

        let nextIndex = this.currentTrackIndex + 1;
        if (nextIndex >= this.tracks.length) {
            if (this.repeatMode === 1) { // repeat album
                nextIndex = 0;
            } else {
                // stop playing
                return;
            }
        }
        this.playTrack(nextIndex);
    }

    prevTrack() {
        if (this.tracks.length === 0) return;
        
        // Se já tocou mais de 3 segundos, volta pro início
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }

        let prevIndex = this.currentTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.tracks.length - 1;
        }
        this.playTrack(prevIndex);
    }

    seek(percent) {
        if (!isNaN(this.audio.duration)) {
            this.audio.currentTime = (percent / 100) * this.audio.duration;
        }
    }

    setVolume(value) {
        this.audio.volume = value;
        this.savePreferences();
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.savePreferences();
        return this.isShuffle;
    }

    toggleRepeat() {
        this.repeatMode = (this.repeatMode + 1) % 3;
        this.savePreferences();
        return this.repeatMode;
    }

    onTimeUpdate() {
        if(this.onProgressUpdate) {
            this.onProgressUpdate(this.audio.currentTime, this.audio.duration);
        }
    }

    onLoadedMetadata() {
        if(this.onProgressUpdate) {
            this.onProgressUpdate(this.audio.currentTime, this.audio.duration);
        }
    }

    onEnded() {
        if (this.repeatMode === 2) { // repeat track
            this.audio.currentTime = 0;
            this.audio.play();
        } else {
            this.nextTrack();
        }
    }

    onError(e) {
        console.error("Audio playback error", e);
        // Could trigger an UI event here
    }

    getCurrentTrack() {
        if (this.currentTrackIndex === -1) return null;
        return this.tracks[this.currentTrackIndex];
    }
}
