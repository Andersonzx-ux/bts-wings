document.addEventListener("DOMContentLoaded", () => {
    // Check if album data is available
    if (typeof window.album === "undefined") {
        console.error("Dados do álbum não encontrados. Certifique-se de que data/album.js foi carregado corretamente.");
        return;
    }

    // Initialize Player
    const player = new Player();

    // Initialize UI
    const ui = new UI(player, window.album);

    // Bind Player events to UI updates
    player.onTrackChange = (index) => ui.onTrackChange(index);
    player.onProgressUpdate = (current, duration) => ui.onProgressUpdate(current, duration);
    player.onStateChange = () => ui.onStateChange();

    // Load initial track in UI without playing
    if (player.tracks.length > 0) {
        // Just set the current track index to 0 visually
        player.currentTrackIndex = 0;
        ui.onTrackChange(0);
        // Reset player state (it shouldn't autoplay initially)
        player.isPlaying = false;
        ui.updatePlayerControlsState();
        ui.applyWorld();
    }
});
