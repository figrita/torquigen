const loopLengthSelect = document.getElementById('loop-length');
const frameRateSelect = document.getElementById('frame-rate');
const transportBeginButton = document.getElementById('transport_begin');
const transportPlayButton = document.getElementById('transport_play');
const transportStopButton = document.getElementById('transport_stop');
const transportPauseButton = document.getElementById('transport_pause');
const transportEndButton = document.getElementById('transport_end');
const transportTimeline = document.getElementById('timeline-slider');
const exportFormatSelect = document.getElementById('export-format');
const exportModalBtn = document.getElementById('export-animation');
const modal = document.getElementById('export-modal');
const exportForm = document.getElementById('export-form');
const exportProgress = document.getElementById('export-progress');
const progressBar = document.getElementById('progress-bar');
const progressBarText = document.getElementById('progress-text');
const cancelExportBtn = document.getElementById('cancel-export');
const cancelRenderBtn = document.getElementById('cancel-render');
export default class AnimationPlayer {
  constructor(animator, update, gl, transportElement, seconds = 5, frameRate = 30) {
    this.animator = animator;
    this.update = update;
    this.transportElement = transportElement;
    this.playing = false;
    this.recording = false;
    this.startTime = 0;
    this.t = 0;
    this.frameRate = frameRate;
    this.seconds = seconds;
    this.gl = gl;
    this.capturer = null;
    this.exportFormat = 'gif';
    this.cancel = false;

    this.initTransportControls();
  }

  initTransportControls() {
    loopLengthSelect.addEventListener('change', (e) => {
      this.seconds = parseInt(e.target.value, 10);
    });

    frameRateSelect.addEventListener('change', (e) => {
      this.frameRate = parseInt(e.target.value, 10);
    });

    transportBeginButton.addEventListener('click', () => {
      this.t = 0;
      transportTimeline.value = 0;
      this.startTime = performance.now();
      this.update();
    });

    transportPlayButton.addEventListener('click', () => {
      this.play();
    });

    transportStopButton.addEventListener('click', () => {
      this.stop();
      this.t = 0;
      transportTimeline.value = 0;
      this.update();
    });

    transportPauseButton.addEventListener('click', () => {
      this.stop();
    });

    transportEndButton.addEventListener('click', () => {
      this.t = 1;
      transportTimeline.value = 1;
      this.startTime = performance.now() - this.seconds * 1000;
      this.update();
    });

    transportTimeline.addEventListener('input', (e) => {
      this.t = parseFloat(e.target.value);
      this.update();
    });

    exportFormatSelect.addEventListener('change', (e) => {
      this.exportFormat = e.target.value;
    });

    exportModalBtn.addEventListener('click', () => {
      modal.style.display = 'block';
    });

    exportForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Hide the form and display the progress bar container
      exportForm.style.display = 'none';
      exportProgress.style.display = 'block';

      // Start exporting animation process and update progress bar
      this.exportAnimation((progress) => {
        progressBar.style.width = `${progress}%`;
      });
    });

    cancelExportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.recordingOver();
    });

    cancelRenderBtn.addEventListener('click', () => {
      this.cancelRecord();
    });
  }

  play() {
    if (!this.playing) {
      this.playing = true;
      this.startTime = performance.now() - this.t * this.seconds * 1000;
      this.loop();
    }
  }

  stop() {
    this.playing = false;
  }

  loop() {
    if (!this.playing) return;

    const currentTime = performance.now();
    const elapsedTime = currentTime - this.startTime;

    this.update();

    this.t = elapsedTime / (this.seconds * 1000);

    if (this.t >= 1.0) {
      this.t -= 1.0;
      this.startTime += 1000 * this.seconds;
    }

    // Update the transport timeline
    document.getElementById('timeline-slider').value = this.t;
    requestAnimationFrame(() => this.loop());
  }

  exportAnimation(onProgress) {
    if (this.playing) {
      this.stop();
    }
    if (!this.recording) {
      this.recording = true;
      this.cancel = false;
      this.t = 0;
      this.update();
      this.capturer = new CCapture({
        format: this.exportFormat,
        framerate: this.frameRate,
        workersPath: 'js/ccapture/',
        onProgress: (progress) => {
          progressBar.style.width = `${progress * 100}%`;
          if(progress === 1) {
            this.recordingOver();
          }
          return !this.cancel;
        },
      });
      this.capturer.start();
      this.lastRenderTime = performance.now();
      this.record(onProgress);
    }
  }

  stopRecord() {
    this.recording = false;
    this.capturer.stop();
    this.capturer.save();
    this.capturer = null;
    progressBarText.innerText = 'Exporting...';
    if (this.exportFormat === 'webm' || this.exportFormat === 'png') {
      this.recordingOver();
    }
  }

  cancelRecord() {
    this.recording = false;
    if(this.capturer) this.capturer.stop();
    this.cancel = true;

    this.capturer = null;
    this.recordingOver();
  }

  record(onProgress) {
    if (!this.recording) return;

    if (this.t >= 1) {
      this.stopRecord();
      return;
    }

    this.update();
    this.capturer.capture(this.gl.canvas);

    this.t += 1.0 / (this.seconds * this.frameRate);

    onProgress(this.t * 100);

    // Update the transport timeline
    document.getElementById('timeline-slider').value = this.t;

    requestAnimationFrame(() => this.record(onProgress));
  }

  recordingOver() {
    progressBarText.innerText = 'Rendering...';
    exportProgress.style.display = 'none';
    exportForm.style.display = 'flex';
    modal.style.display = 'none';
  }

  get time() {
    return this.t;
  }
}
