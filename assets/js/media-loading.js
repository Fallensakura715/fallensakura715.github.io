(() => {
    const videos = Array.from(document.querySelectorAll('video[data-src]'));
    if (!videos.length) return;

    const connection = navigator.connection;
    const automaticPlayback = !connection?.saveData &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visible = new Set();
    const buttons = new Map();
    const load = (video, start = false) => {
        if (!video.dataset.src) return;
        video.src = video.dataset.src;
        delete video.dataset.src;
        if (buttons.get(video)) buttons.get(video).hidden = true;
        if (start) video.play().catch(() => {});
        else video.load();
    };
    const play = (video) => {
        if (document.hidden || !automaticPlayback || video.dataset.autoplay !== 'true') return;
        load(video);
        video.play().catch(() => {});
    };

    for (const video of videos) {
        const button = video.parentElement.querySelector('.lazy-video-play');
        if (button) {
            buttons.set(video, button);
            button.hidden = false;
            button.addEventListener('click', () => load(video, true));
        }
        video.addEventListener('pointerdown', () => load(video, true), { once: true });
        video.addEventListener('keydown', (event) => {
            if (event.key === ' ' || event.key === 'Enter') load(video, true);
        });
    }

    if (!('IntersectionObserver' in window)) {
        videos.forEach(load);
        return;
    }

    const preloadObserver = new IntersectionObserver((entries) => {
        for (const { target: video, isIntersecting } of entries) {
            if (!isIntersecting) continue;
            if (!connection?.saveData) load(video);
            preloadObserver.unobserve(video);
        }
    }, { rootMargin: '300px 0px' });

    const playbackObserver = new IntersectionObserver((entries) => {
        for (const { target: video, isIntersecting } of entries) {
            if (isIntersecting) {
                visible.add(video);
                play(video);
            } else {
                visible.delete(video);
                video.pause();
            }
        }
    }, { threshold: 0.1 });

    videos.forEach((video) => {
        preloadObserver.observe(video);
        playbackObserver.observe(video);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) videos.forEach((video) => video.pause());
        else visible.forEach(play);
    });
})();
