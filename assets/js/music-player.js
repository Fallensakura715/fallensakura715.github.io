(() => {
    const text = {
        en: {
            loading: "Loading playlist…",
            ready: (count) => `${count} tracks · Choose a track to play.`,
            failed: "Couldn't load the playlist. Try again or open it on NetEase.",
            unavailable: "This track is unavailable. Try another track or listen on NetEase.",
            resolving: "Loading audio…",
            loaded: (seconds) => `Audio loaded · ${formatTime(seconds)}`,
            short: (seconds) => `Only a ${Math.round(seconds)}-second version is available. Open on NetEase to continue listening.`,
        },
        zh: {
            loading: "正在加载歌单…",
            ready: (count) => `共 ${count} 首，点击歌曲开始播放。`,
            failed: "歌单加载失败，请重试或在网易云打开。",
            unavailable: "这首歌暂时无法播放，请切换其他歌曲或在网易云收听。",
            resolving: "正在加载音源…",
            loaded: (seconds) => `音源已加载 · ${formatTime(seconds)}`,
            short: (seconds) => `当前只能取得 ${Math.round(seconds)} 秒音频，可在网易云继续收听。`,
        },
    };

    function formatTime(seconds) {
        return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
    }

    function mediaURL(value) {
        if (typeof value !== "string" || !value.trim()) return "";
        try {
            const url = new URL(value);
            return ["https:", "http:"].includes(url.protocol) ? url.href : "";
        } catch {
            return "";
        }
    }

    function songID(track) {
        const values = [track.id, track.songId, track.song_id];
        for (const value of values) {
            if (/^\d+$/.test(String(value || ""))) return String(value);
        }
        for (const value of [track.url, track.pic, track.lrc]) {
            try {
                const id = new URL(value).searchParams.get("id");
                if (/^\d+$/.test(String(id || ""))) return String(id);
            } catch {
                // A malformed optional URL is handled by the caller.
            }
        }
        return "";
    }

    // Meting type=url endpoints redirect to, or stream, the audio. Let the
    // browser follow the redirect without requiring CORS access to the stream.
    function createSourceLoader(apis, status, messages) {
        let active;
        let media;
        let player;
        let timer;
        const stopTimer = () => clearTimeout(timer);

        function armTimer() {
            stopTimer();
            if (!active || active.loaded || player.paused) return;
            const source = active.url;
            timer = setTimeout(() => {
                if (active?.url === source && !active.loaded) advance();
            }, 12000);
        }

        function useSource(url) {
            const resume = !player.paused;
            stopTimer();
            active.url = url;
            active.loaded = false;
            status.textContent = messages.resolving;
            media.src = url;
            media.load();
            if (resume) {
                player.play();
                armTimer();
            }
        }

        function advance() {
            if (!active) return;
            if (++active.index < active.urls.length) {
                useSource(active.urls[active.index]);
            } else if (active.short && !active.acceptShort) {
                active.acceptShort = true;
                useSource(active.short.url);
            } else {
                stopTimer();
                player.pause();
                status.textContent = messages.unavailable;
            }
        }

        function onMetadata() {
            if (!active || media.currentSrc !== active.url || !Number.isFinite(media.duration) || media.duration <= 0) return;
            stopTimer();
            // Short audio can be a 30/45/60-second preview. Try other sources;
            // if all are short, keep the longest and report its actual duration.
            if (media.duration <= 60 && !active.acceptShort) {
                if (!active.short || media.duration > active.short.duration) {
                    active.short = { url: active.url, duration: media.duration };
                }
                advance();
                return;
            }
            active.loaded = true;
            status.textContent = active.acceptShort ? messages.short(media.duration) : messages.loaded(media.duration);
        }

        function onError(event) {
            // Handle source failure before APlayer's default auto-skip handler.
            // A failed endpoint should retry this song rather than skip it.
            event.stopImmediatePropagation();
            if (active && media.error && media.currentSrc === active.url) advance();
        }

        function onPlay() {
            if (active && !active.loaded) {
                status.textContent = messages.resolving;
                armTimer();
            }
        }

        return {
            select(element, track, instance) {
                stopTimer();
                if (!media) {
                    media = element;
                    player = instance;
                    media.addEventListener("loadedmetadata", onMetadata);
                    media.addEventListener("error", onError, true);
                    media.addEventListener("play", onPlay);
                    media.addEventListener("pause", stopTimer);
                }
                const directURL = mediaURL(track.url);
                const urls = [];
                if (directURL && songID({ url: directURL }) === track.songId) {
                    urls.push(directURL);
                }
                urls.push(...apis.map((endpoint) => {
                    const url = new URL(endpoint);
                    url.searchParams.set("server", "netease");
                    url.searchParams.set("type", "url");
                    url.searchParams.set("id", track.songId);
                    return url.href;
                }));
                active = { urls: [...new Set(urls)], index: 0, loaded: false, acceptShort: false };
                active.url = active.urls[0];
                // preload=none keeps unselected songs from loading audio.
                media.src = active.url;
            },
            dispose() {
                stopTimer();
                active = null;
                if (media) {
                    media.removeEventListener("loadedmetadata", onMetadata);
                    media.removeEventListener("error", onError, true);
                    media.removeEventListener("play", onPlay);
                    media.removeEventListener("pause", stopTimer);
                }
            },
        };
    }

    document.querySelectorAll("[data-music-player]").forEach((section) => {
        const messages = text[section.dataset.language] || text.en;
        const status = section.querySelector("[data-music-status]");
        const retry = section.querySelector("[data-music-retry]");
        const container = section.querySelector("[data-music-container]");
        const playlistSelect = section.querySelector("[data-music-playlist]");
        const playlistLink = section.querySelector("[data-music-link]");
        let playlists = [];
        let player;
        let sourceLoader;
        let requestController;
        let requestToken = 0;

        try {
            playlists = JSON.parse(section.dataset.playlists || "[]").filter((playlist) => /^\d+$/.test(String(playlist.id)));
        } catch {
            playlists = [];
        }

        function setPlaylistLink(id) {
            if (!playlistLink) return;
            playlistLink.href = `https://music.163.com/#/playlist?id=${encodeURIComponent(id)}`;
        }

        async function loadPlaylist(playlistId = section.dataset.playlistId) {
            if (!/^\d+$/.test(String(playlistId))) return;
            const token = ++requestToken;
            requestController?.abort();
            requestController = new AbortController();
            retry.hidden = true;
            status.textContent = messages.loading;
            section.setAttribute("aria-busy", "true");
            section.dataset.playlistId = String(playlistId);
            setPlaylistLink(String(playlistId));
            sourceLoader?.dispose();
            player?.destroy();
            sourceLoader = null;
            player = null;
            const controller = requestController;
            const timeout = setTimeout(() => controller.abort(), 15000);

            try {
                const api = new URL(section.dataset.api);
                api.searchParams.set("server", "netease");
                api.searchParams.set("type", "playlist");
                api.searchParams.set("id", String(playlistId));
                const response = await fetch(api, { signal: requestController.signal });
                if (!response.ok) throw new Error(`Playlist HTTP ${response.status}`);
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error("Invalid playlist response");
                const sourceApis = JSON.parse(section.dataset.sourceApis || "[]").map(mediaURL).filter(Boolean);
                const audio = data.map((track) => {
                    if (!track || typeof track !== "object") return null;
                    const id = songID(track);
                    const url = mediaURL(track.url);
                    if (!id || (sourceApis.length === 0 && !url)) return null;
                    return {
                        name: String(track.name || "Untitled"),
                        artist: String(track.artist || ""),
                        url: sourceApis.length ? "" : url,
                        cover: mediaURL(track.pic),
                        lrc: mediaURL(track.lrc),
                        songId: id,
                        type: sourceApis.length ? "meting-sources" : "normal",
                    };
                }).filter(Boolean);
                if (!audio.length) throw new Error("Empty playlist");
                if (typeof window.APlayer !== "function") throw new Error("APlayer unavailable");

                if (token !== requestToken) return;

                sourceLoader = createSourceLoader(sourceApis, status, messages);
                player = new window.APlayer({
                    container,
                    audio,
                    autoplay: false,
                    preload: "none",
                    theme: "#507ca3",
                    loop: "all",
                    order: "list",
                    volume: 0.5,
                    lrcType: 3,
                    listFolded: false,
                    listMaxHeight: "360px",
                    storageName: "blog-music-player",
                    customAudioType: { "meting-sources": sourceLoader.select },
                });
                status.textContent = messages.ready(audio.length);
                player.on("error", () => { status.textContent = messages.unavailable; });
                player.on("listswitch", () => { status.textContent = messages.ready(audio.length); });
            } catch (error) {
                if (error.name === "AbortError" || token !== requestToken) return;
                status.textContent = messages.failed;
                retry.hidden = false;
                console.warn("Music playlist could not be loaded:", error);
            } finally {
                clearTimeout(timeout);
                if (token === requestToken) {
                    section.removeAttribute("aria-busy");
                }
            }
        }

        playlistSelect?.addEventListener("change", () => loadPlaylist(playlistSelect.value));
        retry.addEventListener("click", () => loadPlaylist(section.dataset.playlistId));
        setPlaylistLink(section.dataset.playlistId);
        loadPlaylist(section.dataset.playlistId);
    });
})();
