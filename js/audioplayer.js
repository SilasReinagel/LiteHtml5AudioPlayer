function AudioSettings({ volume, isLooping }) {
    console.log({ volume, isLooping });
    this.volume = volume || 50;
    this.isLooping = isLooping || false;
    this.setVolume = (volume) => {
        this.volume = volume;
        this.onVolumeChange(volume);
    }
    this.onVolumeChange = (volume) => {};
};

function AudioPlayer(settings, songs) {
    this._settings = settings || new AudioSettings({ volume: 80, isLooping: false });
    this._audio = new Audio("audio-player", settings);
    this._songImg = new Image("song-img");
    this._artist = new Text("artist");
    this._name = new Text("song-name");
    this._album = new Text("album");
    this._playPause = new ImageButton("play-pause-button", () => {
        const isPlaying = this._audio.toggleState();
        this._playPause.setImg(isPlaying ? "/images/icons/pause.svg" : "/images/icons/play.svg");
    });
    this._volumeControl = new VolumeControl(this._settings);
    this._songProgress = new SongProgress(this._audio);
    this._playlist = new Playlist(songs, this._audio, (song) => {
        this._songImg.setImg(song.img);
        this._artist.setText(song.artist);
        this._name.setText(song.name);
        this._album.setText(song.album);
    });
    document.getElementById('audio').classList.remove('hidden');
}

function Audio(id, settings) {
    this._element = document.getElementById(id);
    this._audioSources = [];
    this._isPlaying = false;
    this._isSeeking = false;
    this._element.volume = settings.volume / 100;
    this._element.ondurationchange = () => {};
    this._element.onplay = () => this._isPlaying = true;
    this._element.onpause = () => {
        if (!this._isSeeking)
            this._isPlaying = false;
    };
    this._element.ontimeupdate = () => {};
    this._element.onended = () => {};

    this.getDuration = () => this._element.duration;
    this.getCurrentTime = () => this._element.currentTime;
    this.isPlaying = () => this._isPlaying;

    this.addDurationListener = (onDurationChange) => {
        let eventOriginal = this._element.ondurationchange;
        this._element.ondurationchange = () => {
            eventOriginal();
            onDurationChange();
        }
    };

    this.addTimeUpdateListener = (onTimeUpdate) => {
        let eventOriginal = this._element.ontimeupdate;
        this._element.ontimeupdate = () => {
            eventOriginal();
            onTimeUpdate();
        }
    };

    this.addOnEndedListener = (onEnded) => {
        let eventOriginal = this._element.onended;
        this._element.onended = () => {
            eventOriginal();
            onEnded();
        }
    };

    this.toggleState = () => {
        if(this._element.paused)
            this.play();
        else
            this.pause();
        return !this._element.paused;
    };

    this.startSeek = () => {
        this._isSeeking = true;
        this.pause();
    };

    //This function only exists because of a bug in microsoft edge and internet explorer
    this.seek = (time) => {
        this._element.currentTime = time;
    };

    this.finishSeek = (time) => {
        this._isSeeking = false;
        this._element.currentTime = time;
        if (this._isPlaying)
            this.play();
    };

    this.play = () => this._element.play();

    this.pause = () => this._element.pause();

    this.setVolume = (volume) => this._element.volume = volume / 100;

    this.setAudioSources = (sources) => {
        for (let source of this._audioSources)
            this._element.removeChild(source);
        this._audioSources = sources.map(source => {
            let element = document.createElement("source");
            element.src = source;
            element.type = this._getAudioType(source);
            return element;
        });
        for (let source of this._audioSources)
            this._element.appendChild(source);
        this._element.load();
    };

    this._getAudioType = (source) => {
        let extension = source.split('.').pop();
        if (extension === "wav")
            return "audio/wav";
        if (extension === "ogg")
            return "audio/ogg";
        return "audio/mpeg";
    };

    settings.onVolumeChange = (volume) => this.setVolume(volume);
}

function ImageButton(id, onclick) {
    this._element = document.getElementById(id);
    this._element.onclick = onclick;

    this.setImg = (src) => this._element.src = src;
}

function VolumeControl(settings) {
    this._img = new ImageButton("volume-img", () => {
        let newToggleVolume = parseInt(this._control.getValue());
        this._control.setValue(this._toggleVolume);
        this._updateVolume();
        this._toggleVolume = newToggleVolume;
    });
    this._control = new Range("volume-control", () => this._updateVolume(), () => this._updateVolume(), () => this._updateVolume());
    this._control.setValue(settings.volume);
    this._toggleVolume = 0;

    this._updateVolume = () => {
        const volume = parseInt(this._control.getValue());
        this._updateVolumeImage();
        if (volume > 0 && this._toggleVolume > 0)
            this._toggleVolume = 0;
        settings.setVolume(volume);
    };

    this._updateVolumeImage = () => {
        const volume = parseInt(this._control.getValue());
        if (volume === 0)
            this._img.setImg("/images/icons/volume_off.svg");
        else if (volume <= 50)
            this._img.setImg("/images/icons/volume_down.svg");
        else
            this._img.setImg("/images/icons/volume_up.svg");   
    };
  
    this._updateVolumeImage();
}

function Image(id) {
    this._element = document.getElementById(id);

    this.setImg = (src) => this._element.src = src;
}

function SongProgress(audio) {
    audio.addDurationListener(() => {
        this._control.setMax(audio.getDuration());
        this._updateCurrentTime();
    });
    audio.addTimeUpdateListener(() => this._updateCurrentTime());

    this._text = new Text("song-progress-text");
    this._control = new Range("song-progress-control",
        () => {
            audio.startSeek();
            this._text.setText(this._toReadableTime(this._control.getValue(), audio.getDuration()));
        },
        () => {
            audio.finishSeek(this._control.getValue());
            this._updateCurrentTime();
        },
        //this is only used when using microsoft edge or internet explorer, it is worse performance and creates a weird sound effect when seeking but otherwise works perfectly
        () => {
            audio.seek(this._control.getValue());
            this._updateCurrentTime();
        });

    this._updateCurrentTime = () => {
        this._control.setValue(Math.round(audio.getCurrentTime()));
        this._text.setText(this._toReadableTime(audio.getCurrentTime(), audio.getDuration()));
    };

    const formatSeconds = (seconds) => Math.round(seconds % 60).toString().padStart(2, '0');
    const formatMinutes = (seconds) => Math.floor(seconds / 60).toString().padStart(2, '0');
    const formatTime = (timeInSeconds) => `${formatMinutes(timeInSeconds)}:${formatSeconds(timeInSeconds)}`;
    this._toReadableTime = (currentSeconds, maxSeconds) => `${formatTime(currentSeconds)} / ${formatTime(maxSeconds)}`;
}

function Text(id) {
    this._element = document.getElementById(id);

    this.setText = (text) => {
        let child = this._element.firstChild;
        while(child) {
            if (child.nodeType === 3)
                this._element.removeChild(child);
            child = child.nextSibling;
        }
        this._element.appendChild(document.createTextNode(text));
    };
}

function Range(id, onInput, onChange, onInputForMsBrowser) {
    this._element = document.getElementById(id);
    this._isMsBrowser = navigator.appName === 'Microsoft Internet Explorer' || (navigator.appName === "Netscape" && navigator.appVersion.indexOf('Edge') > -1) || (navigator.appName === "Netscape" && navigator.appVersion.indexOf('Trident') > -1);
    this._element.oninput = () => {
        //there is a bug with microsoft edge and internet explorer that can cause onchange event to not fire, therefore we have to do more work here
        if (this._isMsBrowser)
            onInputForMsBrowser();
        else
            onInput();
    };
    this._element.onchange = onChange;

    this.getValue = () => this._element.value;
    this.setValue = (value) => this._element.value = value;
    this.setMax = (max) => this._element.max = max;
}

function Playlist(songs, audio, onSongChange) {
    audio.addOnEndedListener(() => {
        if (this._songIndex !== songs.length - 1)
            this._changeSong(this._songIndex + 1);
        else if (this._isLooping)
            this._changeSong(0);
    });
    this._songIndex = -1;
    this._isLooping = false;
    this._playlist = new List("playlist");
    this._playlist.setItems(songs.map((song, index) => {
        let element = document.createElement("li");
        element.innerText = song.name;
        element.onclick = () => this._changeSong(index);
        return element;
    }));
    this._loop = new ImageButton("loop-button", () => this._isLooping = !this._isLooping);
    this._previous = new ImageButton("previous-button", () => {
        if (this._songIndex !== 0)
            this._changeSong(this._songIndex - 1);
        else if (this._isLooping)
            this._changeSong(songs.length - 1);
    });
    this._next = new ImageButton("next-button", () => {
        if (this._songIndex !== songs.length - 1)
            this._changeSong(this._songIndex + 1);
        else if (this._isLooping)
            this._changeSong(0);
    });

    this._changeSong = (songIndex) => {
        this.selectSong(songIndex);
        audio.play();
    };

    this.selectSong = (songIndex) => {
        if (songIndex === this._songIndex)
            return;
        onSongChange(songs[songIndex]);
        audio.setAudioSources(songs[songIndex].sources);
        this._songIndex = songIndex;
    };

    this.selectSong(0);
}

function Song(artist, name, album, img, sources) {
    this.artist = artist;
    this.name = name;
    this.album = album;
    this.img = img;
    this.sources = sources;
}

function List(id) {
    this._element = document.getElementById(id);

    this.setItems = (items) => {
        while(this._element.firstChild)
            this._element.removeChild(this._element.firstChild);
        for (let element of items)
            this._element.appendChild(element);
    };
}
